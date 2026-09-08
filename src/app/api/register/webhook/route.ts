import { NextResponse } from "next/server";
import { validateWebhookSignature } from "razorpay/dist/utils/razorpay-utils";
import { RAZORPAY_WEBHOOK_SECRET } from "@/lib/razorpay";
import {
  claimConfirmationMail,
  confirmRegistrationFromWebhook,
  getRegistrationByRazorpayOrderId,
  releaseConfirmationMail,
} from "@/lib/db";
import { sendRegistrationConfirmationMail } from "@/lib/mailer";

export const runtime = "edge";

/**
 * Razorpay webhook endpoint — modelled on
 * Excel-Merch-Backend/src/controllers/PaymentController.ts (`razorPayWebhook` +
 * `orderPaid`).
 *
 * This is the ONLY place the registration confirmation email is sent. The
 * checkout-side /verify route just marks the row confirmed for instant UI
 * feedback; it never mails.
 *
 * Dashboard setup: Razorpay -> Settings -> Webhooks -> add
 *   URL:    https://<your-domain>/api/register/webhook
 *   Secret: same value as RAZORPAY_WEBHOOK_SECRET
 *   Event:  order.paid
 */

interface OrderPaidPayload {
  event: string;
  payload: {
    payment: { entity: { id: string } };
    order: {
      entity: {
        id: string;
        amount: number;
        amount_due: number;
        status: string;
        receipt: string | null;
      };
    };
  };
}

export async function POST(req: Request) {
  const raw = await req.text();
  const signature = req.headers.get("x-razorpay-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing x-razorpay-signature header" },
      { status: 400 }
    );
  }

  if (!RAZORPAY_WEBHOOK_SECRET) {
    console.error("RAZORPAY_WEBHOOK_SECRET is not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Verify against the exact bytes received (stricter than merch-backend, which
  // re-stringifies the parsed body).
  let valid = false;
  try {
    valid = validateWebhookSignature(raw, signature, RAZORPAY_WEBHOOK_SECRET);
  } catch {
    valid = false;
  }
  if (!valid) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  let body: OrderPaidPayload;
  try {
    body = JSON.parse(raw) as OrderPaidPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // We only act on order.paid. Everything else is acknowledged and ignored.
  if (body.event !== "order.paid") {
    return NextResponse.json({ message: "ignored", event: body.event });
  }

  const order = body.payload?.order?.entity;
  const paymentId = body.payload?.payment?.entity?.id;

  if (!order || order.status !== "paid" || order.amount_due !== 0) {
    return NextResponse.json({ message: "ignored: order not fully paid" });
  }

  const orderId = order.receipt; // our HS2-… receipt
  const razorpayOrderId = order.id;

  // Payment pages / other integrations on the same account fire this webhook
  // too — they have no receipt of ours. Ignore them.
  if (!orderId || !razorpayOrderId || !orderId.startsWith("HS2-")) {
    return NextResponse.json({ message: "ignored: not a marathon order" });
  }

  try {
    const reg = await getRegistrationByRazorpayOrderId(razorpayOrderId, orderId);
    if (!reg) {
      console.warn("Webhook: no registration for", { orderId, razorpayOrderId });
      return NextResponse.json({ message: "ignored: registration not found" });
    }

    await confirmRegistrationFromWebhook(orderId, paymentId ?? "");

    // Send the confirmation mail exactly once, ever.
    const claimed = await claimConfirmationMail(orderId);
    if (!claimed) {
      return NextResponse.json({ message: "already processed", orderId });
    }

    const sent = await sendRegistrationConfirmationMail(reg);
    if (!sent) {
      // Let Razorpay retry the webhook.
      await releaseConfirmationMail(orderId);
      return NextResponse.json(
        { error: "Confirmation mail failed, will retry" },
        { status: 500 }
      );
    }

    console.log(`Webhook: registration confirmed + mailed for ${orderId}`);
    return NextResponse.json({ message: "confirmed", orderId });
  } catch (err) {
    console.error("Webhook processing error", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
