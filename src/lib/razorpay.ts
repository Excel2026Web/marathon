import Razorpay from "razorpay";

const keyId = process.env.RAZORPAY_KEY_ID;
const keySecret = process.env.RAZORPAY_KEY_SECRET;

if (!keyId || !keySecret) {
  // Fail loudly at boot rather than on the first payment.
  console.error(
    "fatal: RAZORPAY_KEY_ID / RAZORPAY_KEY_SECRET not set in env (.env.local)"
  );
}

export const RAZORPAY_KEY_ID = keyId ?? "";
export const RAZORPAY_KEY_SECRET = keySecret ?? "";

export const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET,
});
