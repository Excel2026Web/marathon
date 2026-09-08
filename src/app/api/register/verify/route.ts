import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";
import { RAZORPAY_KEY_SECRET } from "@/lib/razorpay";
import {
  getRegistrationByOrderId,
  markRegistrationConfirmed,
} from "@/lib/db";

export const runtime = "edge";

/**
 * Verifies the Razorpay Checkout signature and marks the registration confirmed
 * so the success screen can render immediately.
 *
 * The confirmation email is NOT sent here — that is done only by the
 * `order.paid` webhook (/api/register/webhook).
 */

interface VerifyBody {
  orderId?: string;
  razorpay_order_id?: string;
  razorpay_payment_id?: string;
  razorpay_signature?: string;
}

export async function POST(req: Request) {
  let body: VerifyBody;
  try {
    body = (await req.json()) as VerifyBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const {
    orderId,
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
  } = body;

  if (
    !orderId ||
    !razorpay_order_id ||
    !razorpay_payment_id ||
    !razorpay_signature
  ) {
    return NextResponse.json(
      { error: "Missing payment verification fields" },
      { status: 400 }
    );
  }

  let reg;
  try {
    reg = await getRegistrationByOrderId(orderId);
  } catch (err) {
    console.error("DB error while loading registration", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  if (!reg) {
    return NextResponse.json(
      { error: "Registration not found. Please register again." },
      { status: 404 }
    );
  }

  if (reg.razorpayOrderId !== razorpay_order_id) {
    return NextResponse.json({ error: "Order mismatch" }, { status: 400 });
  }

  // Standard Razorpay Checkout signature: HMAC_SHA256(order_id + "|" + payment_id, key_secret)
  const expected = createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const a = Buffer.from(expected);
  const b = Buffer.from(razorpay_signature);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return NextResponse.json(
      { error: "Payment signature verification failed" },
      { status: 400 }
    );
  }

  let firstConfirmation = false;
  try {
    firstConfirmation = await markRegistrationConfirmed({
      orderId,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
  } catch (err) {
    console.error("DB error while confirming registration", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    orderId: reg.orderId,
    amount: reg.amount,
    name: reg.fullName,
    email: reg.email,
    alreadyConfirmed: !firstConfirmation,
  });
}
