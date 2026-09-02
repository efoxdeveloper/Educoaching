import Razorpay from "razorpay";

export function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  if (!keyId || !keySecret || keyId.includes("your_key_id_here")) {
    throw new Error(
      "Razorpay is not configured. Add RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to .env (get test keys from https://dashboard.razorpay.com/app/keys)."
    );
  }

  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}
