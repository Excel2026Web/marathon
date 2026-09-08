import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getRazorpay, RAZORPAY_KEY_ID } from "@/lib/razorpay";
import { feeForCategory, validateRegistration } from "@/lib/registration";
import { insertPendingRegistration } from "@/lib/db";

export const runtime = "edge";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const result = validateRegistration(body as Record<string, unknown>);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const data = result.data;
  const amount = feeForCategory(data.category);
  if (amount === null) {
    return NextResponse.json({ error: "Invalid category" }, { status: 400 });
  }

  const orderId = `HS2-${randomUUID().slice(0, 8).toUpperCase()}`;

  let razOrder;
  try {
    razOrder = await getRazorpay().orders.create({
      amount: amount * 100, // paise
      currency: "INR",
      receipt: orderId,
      notes: {
        orderId,
        name: data.fullName,
        email: data.email,
        phone: data.phone,
        category: data.category,
        event: "Headstart 2.0 - 10K Mini Marathon",
      },
    });
  } catch (err) {
    console.error("Error while creating Razorpay order", err);
    return NextResponse.json(
      { error: "Could not create payment order" },
      { status: 502 }
    );
  }

  try {
    await insertPendingRegistration({
      orderId,
      razorpayOrderId: razOrder.id,
      amount,
      data,
    });
  } catch (err) {
    console.error("Error while saving registration", err);
    return NextResponse.json(
      { error: "Could not save your registration. Please try again." },
      { status: 500 }
    );
  }

  return NextResponse.json({
    orderId,
    razorpayOrderId: razOrder.id,
    amount,
    currency: "INR",
    keyId: RAZORPAY_KEY_ID,
    name: data.fullName,
    email: data.email,
    phone: data.phone,
  });
}
