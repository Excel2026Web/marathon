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

// Used to verify the `X-Razorpay-Signature` on incoming webhooks. Must match the
// secret configured on the webhook in the Razorpay dashboard.
export const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET ?? "";

// Lazily instantiated so that the Razorpay constructor (which throws when
// key_id is empty) is never called during Next.js / Cloudflare build-time
// module evaluation — only when a real request arrives at runtime.
let _razorpay: Razorpay | null = null;
export function getRazorpay(): Razorpay {
  if (!_razorpay) {
    _razorpay = new Razorpay({
      key_id: RAZORPAY_KEY_ID,
      key_secret: RAZORPAY_KEY_SECRET,
    });
  }
  return _razorpay;
}
