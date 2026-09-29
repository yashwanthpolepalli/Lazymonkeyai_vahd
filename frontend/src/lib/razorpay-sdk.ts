/**
 * Razorpay Standard Checkout SDK loader and modal handler.
 */

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") {
      resolve(false);
      return;
    }
    if (window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.getElementById("razorpay-checkout-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }

    const script = document.createElement("script");
    script.id = "razorpay-checkout-js";
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => {
      console.error("Failed to load Razorpay Checkout SDK");
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

export interface OpenRazorpayOptions {
  keyId: string;
  orderId: string;
  amount: number; // in subunits (paise)
  currency?: string;
  name?: string;
  description?: string;
  image?: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
  };
  themeColor?: string;
  onSuccess: (response: {
    razorpay_payment_id: string;
    razorpay_order_id: string;
    razorpay_signature: string;
  }) => void;
  onError?: (err: any) => void;
  onDismiss?: () => void;
}

export async function openRazorpayCheckout(options: OpenRazorpayOptions): Promise<void> {
  const loaded = await loadRazorpayScript();
  if (!loaded || !window.Razorpay) {
    throw new Error("Razorpay SDK could not be loaded. Please check your internet connection.");
  }

  const rzpOptions = {
    key: options.keyId,
    amount: options.amount,
    currency: options.currency || "INR",
    name: options.name || "BusinessOS Store",
    description: options.description || "Order Payment",
    image: options.image || "/favicon.ico",
    order_id: options.orderId,
    handler: function (response: any) {
      options.onSuccess(response);
    },
    prefill: options.prefill || {},
    theme: {
      color: options.themeColor || "#0f172a",
    },
    modal: {
      ondismiss: function () {
        if (options.onDismiss) {
          options.onDismiss();
        }
      },
      escape: true,
      backdropclose: false,
    },
  };

  const rzp = new window.Razorpay(rzpOptions);
  if (options.onError) {
    rzp.on("payment.failed", function (response: any) {
      options.onError!(response.error);
    });
  }
  rzp.open();
}
