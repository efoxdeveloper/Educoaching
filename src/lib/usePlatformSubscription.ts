"use client";

import { useState } from "react";
import type { PLATFORM_PLANS } from "@/lib/pricing";

declare global {
  interface Window {
    Razorpay: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export function usePlatformSubscription() {
  const [processing, setProcessing] = useState(false);
  const [payError, setPayError] = useState("");

  const subscribe = async ({
    plan,
    instituteName,
    ownerName,
    onSuccess,
  }: {
    plan: keyof typeof PLATFORM_PLANS;
    instituteName: string;
    ownerName: string;
    onSuccess: () => void;
  }) => {
    setPayError("");
    setProcessing(true);
    try {
      const loaded = await loadRazorpayScript();
      if (!loaded) throw new Error("Could not load Razorpay checkout. Check your internet connection.");

      const orderRes = await fetch("/api/institutes/subscribe/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      const orderData = await orderRes.json();
      if (!orderRes.ok) throw new Error(orderData.error || "Could not start payment");

      await new Promise<void>((resolve, reject) => {
        const rzp = new window.Razorpay({
          key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
          amount: orderData.amount,
          currency: orderData.currency,
          name: instituteName,
          description: `${plan.charAt(0) + plan.slice(1).toLowerCase()} subscription`,
          order_id: orderData.orderId,
          prefill: { name: ownerName },
          theme: { color: "#1E3A5F" },
          handler: async (response: {
            razorpay_order_id: string;
            razorpay_payment_id: string;
            razorpay_signature: string;
          }) => {
            try {
              const verifyRes = await fetch("/api/institutes/subscribe/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...response, plan }),
              });
              const verifyData = await verifyRes.json();
              if (!verifyRes.ok) throw new Error(verifyData.error || "Payment verification failed");
              onSuccess();
              resolve();
            } catch (e) {
              reject(e);
            }
          },
          modal: {
            ondismiss: () => reject(new Error("Payment cancelled")),
          },
        });
        rzp.open();
      });
    } catch (e) {
      setPayError(e instanceof Error ? e.message : "Payment failed. Please try again.");
    } finally {
      setProcessing(false);
    }
  };

  return { subscribe, processing, payError };
}