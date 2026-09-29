import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  QrCode,
  Send,
  Smartphone,
  CheckCircle2,
  AlertCircle,
  X,
  Loader2,
  Copy,
  Check,
  Zap,
  ExternalLink,
  CreditCard,
  RefreshCw,
  ShieldCheck,
  SmartphoneNfc,
} from "lucide-react";
import { toast } from "sonner";
import { paymentsApi, type RazorpayOrderResponse } from "@/lib/api-client";
import { generateQRCodeSVG } from "@/lib/qr-generator";

interface RazorpayPOSModalProps {
  isOpen: boolean;
  amount: number;
  billNumber: string;
  customerMobile?: string;
  customerName?: string;
  companyId?: string;
  onClose: () => void;
  onSuccess: (paymentData: {
    paymentMethod: string;
    amount: number;
    paymentId: string;
    orderId: string;
  }) => void;
}

declare global {
  interface Window {
    Razorpay: any;
  }
}

export function RazorpayPOSModal({
  isOpen,
  amount,
  billNumber,
  customerMobile = "",
  customerName = "Valued Customer",
  companyId,
  onClose,
  onSuccess,
}: RazorpayPOSModalProps) {
  const [mobile, setMobile] = useState(customerMobile);
  const [loading, setLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [order, setOrder] = useState<RazorpayOrderResponse | null>(null);
  const [qrData, setQrData] = useState<{ id?: string; image_url?: string; upi_intent?: string; short_url?: string } | null>(null);
  const [paymentLink, setPaymentLink] = useState<string>("");
  const [paymentLinkId, setPaymentLinkId] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [activeTab, setActiveTab] = useState<"checkout" | "qr" | "link">("qr");
  const [pollCount, setPollCount] = useState(0);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const hasTriggeredSuccessRef = useRef(false);

  // Load Razorpay Checkout Script
  useEffect(() => {
    if (!window.Razorpay) {
      const script = document.createElement("script");
      script.src = "https://checkout.razorpay.com/v1/checkout.js";
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      hasTriggeredSuccessRef.current = false;
      setMobile(customerMobile);
      setIsPaid(false);
      initiateOrderAndQR();
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      hasTriggeredSuccessRef.current = false;
      setOrder(null);
      setQrData(null);
      setPaymentLink("");
      setPaymentLinkId("");
      setIsPaid(false);
      setPollCount(0);
    }
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [isOpen, amount]);

  const triggerSuccessOnce = (payData: {
    paymentMethod: string;
    amount: number;
    paymentId: string;
    orderId: string;
  }) => {
    if (hasTriggeredSuccessRef.current) return;
    hasTriggeredSuccessRef.current = true;
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setIsPaid(true);
    onSuccess(payData);
    onClose();
  };

  const initiateOrderAndQR = async () => {
    setLoading(true);
    try {
      const [orderRes, qrRes] = await Promise.allSettled([
        paymentsApi.createRazorpayOrder({
          amount,
          receipt: billNumber,
          company_id: companyId,
          notes: { bill_no: billNumber, type: "pos_sale" },
        }),
        paymentsApi.createRazorpayQR({
          amount,
          receipt: billNumber,
          company_id: companyId,
          notes: { bill_no: billNumber },
        }),
      ]);

      let currentOrderId = "";
      let currentLinkId = "";

      if (orderRes.status === "fulfilled") {
        setOrder(orderRes.value);
        currentOrderId = orderRes.value.id;
      }

      if (qrRes.status === "fulfilled") {
        setQrData(qrRes.value);
        const url = (qrRes.value as any).short_url || qrRes.value.upi_intent || "";
        const id = qrRes.value.id || "";
        if (url) {
          setPaymentLink(url);
          setPaymentLinkId(id);
          currentLinkId = id;
        }
      }

      startUnifiedPolling(currentOrderId, currentLinkId);
    } catch (err: any) {
      toast.error(err.message || "Failed to initialize live Razorpay order.");
    } finally {
      setLoading(false);
    }
  };

  // Real-time Background Polling for QR / UPI / Link payments
  const startUnifiedPolling = (orderId?: string, linkId?: string) => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    if (!orderId && !linkId) return;

    pollingRef.current = setInterval(async () => {
      try {
        setPollCount((prev) => prev + 1);

        // Check Order status if active
        if (orderId) {
          const res = await paymentsApi.checkRazorpayOrderStatus(orderId, companyId);
          if (res.is_paid && res.captured_payment_id) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            toast.success(`Payment verified! ID: ${res.captured_payment_id}`);
            triggerSuccessOnce({
              paymentMethod: `Razorpay (${res.payment_method?.toUpperCase() || "UPI"})`,
              amount,
              paymentId: res.captured_payment_id!,
              orderId,
            });
            return;
          }
        }

        // Check Payment Link status if active
        if (linkId) {
          const linkRes = await paymentsApi.checkRazorpayLinkStatus(linkId, companyId);
          if (linkRes.is_paid) {
            if (pollingRef.current) {
              clearInterval(pollingRef.current);
              pollingRef.current = null;
            }
            toast.success(`Payment link verified! ID: ${linkRes.payment_id || linkId}`);
            triggerSuccessOnce({
              paymentMethod: "Razorpay (Online Link)",
              amount,
              paymentId: linkRes.payment_id || `pay_${linkId.slice(-8)}`,
              orderId: orderId || linkId,
            });
            return;
          }
        }
      } catch (e) {
        // Silent poll error handling
      }
    }, 2500);
  };

  // Trigger Native Razorpay Checkout Popup
  const handleOpenRazorpayCheckout = async () => {
    if (!order) {
      await initiateOrderAndQR();
      return;
    }

    if (!window.Razorpay) {
      toast.error("Razorpay SDK is loading. Please try again in a few seconds.");
      return;
    }

    const options = {
      key: order.key_id,
      amount: order.amount,
      currency: order.currency || "INR",
      name: "BusinessOS Retail POS",
      description: `Bill Payment #${billNumber}`,
      order_id: order.id,
      prefill: {
        name: customerName,
        contact: mobile || undefined,
      },
      theme: {
        color: "#2563eb",
      },
      modal: {
        ondismiss: function () {
          toast.info("Payment window dismissed.");
        },
      },
      handler: async function (response: {
        razorpay_payment_id: string;
        razorpay_order_id: string;
        razorpay_signature: string;
      }) {
        setIsVerifying(true);
        try {
          // Cryptographic HMAC SHA256 Signature Verification via Backend
          const verifyRes = await paymentsApi.verifyRazorpayPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
            company_id: companyId,
          });

          if (verifyRes.success) {
            toast.success(`Razorpay Payment ₹${amount.toFixed(2)} verified successfully!`);
            triggerSuccessOnce({
              paymentMethod: `Razorpay (${verifyRes.method?.toUpperCase() || "Online"})`,
              amount,
              paymentId: response.razorpay_payment_id,
              orderId: response.razorpay_order_id,
            });
          } else {
            toast.error("Signature verification failed.");
          }
        } catch (err: any) {
          toast.error(err.message || "Failed to verify Razorpay signature.");
        } finally {
          setIsVerifying(false);
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const handleSendLink = async () => {
    let cleanMobile = (mobile || "").replace(/[^0-9]/g, "");
    if (cleanMobile.length > 10 && cleanMobile.startsWith("91")) {
      cleanMobile = cleanMobile.slice(2);
    }
    if (cleanMobile.length !== 10) {
      toast.error("Please enter a valid 10-digit Indian mobile number (e.g. 9876543210).");
      return;
    }

    setLoading(true);
    try {
      const linkRes = await paymentsApi.createRazorpayLink({
        amount,
        description: `Payment for Bill #${billNumber}`,
        customer_name: customerName,
        customer_phone: cleanMobile,
        notify_sms: true,
        company_id: companyId,
        notes: { bill_no: billNumber },
      });

      const url = linkRes?.short_url || (linkRes as any)?.url || "";
      const linkId = linkRes?.id || "";
      setPaymentLink(url);
      setPaymentLinkId(linkId);
      toast.success(`Payment link generated and SMS dispatched to ${cleanMobile}!`);
      
      if (linkId) {
        startUnifiedPolling(order?.id, linkId);
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to send payment link.");
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckStatus = async () => {
    setLoading(true);
    try {
      if (order) {
        const res = await paymentsApi.checkRazorpayOrderStatus(order.id, companyId);
        if (res.is_paid && res.captured_payment_id) {
          toast.success(`Payment verified! ID: ${res.captured_payment_id}`);
          triggerSuccessOnce({
            paymentMethod: `Razorpay (${res.payment_method?.toUpperCase() || "Online"})`,
            amount,
            paymentId: res.captured_payment_id!,
            orderId: order.id,
          });
          return;
        }
      }
      if (paymentLinkId) {
        const linkRes = await paymentsApi.checkRazorpayLinkStatus(paymentLinkId, companyId);
        if (linkRes.is_paid) {
          toast.success(`Payment Link Paid! ID: ${linkRes.payment_id || paymentLinkId}`);
          triggerSuccessOnce({
            paymentMethod: "Razorpay (Payment Link)",
            amount,
            paymentId: linkRes.payment_id || paymentLinkId,
            orderId: order?.id || paymentLinkId,
          });
          return;
        }
      }
      toast.info("No captured payment received yet. Customer has not completed payment.");
    } catch (err: any) {
      toast.error(err.message || "Failed to check payment status.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (paymentLink) {
      navigator.clipboard.writeText(paymentLink);
      setCopied(true);
      toast.success("Payment link copied to clipboard");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isOpen) return null;

  // Genuine QR Target String (Razorpay live short_url or official payment link)
  const qrTarget = (qrData as any)?.short_url || qrData?.upi_intent || paymentLink || "";
  const qrSvgSrc = qrTarget ? generateQRCodeSVG(qrTarget, 240) : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-card border border-border/80 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden text-foreground flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 bg-blue-600 text-white">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-xl bg-white text-blue-600 font-black text-xs flex items-center justify-center shadow-sm">
              RZP
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm">Razorpay Payment Gateway</h3>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-white/20 text-white">
                  LIVE API
                </span>
              </div>
              <p className="text-[11px] text-blue-100">Real-time Online & Counter Checkout</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-white/80 hover:text-white transition-colors cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 text-xs">
          {/* Tab Switcher */}
          <div className="grid grid-cols-3 gap-1.5 bg-muted/40 p-1.5 rounded-2xl border border-border/60">
            <button
              type="button"
              onClick={() => setActiveTab("qr")}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "qr"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <QrCode className="size-3.5" /> Dynamic QR
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("checkout")}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "checkout"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <CreditCard className="size-3.5" /> Checkout
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("link")}
              className={`py-2 px-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                activeTab === "link"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Smartphone className="size-3.5" /> SMS Link
            </button>
          </div>

          {/* Amount Badge */}
          <div className="bg-blue-500/10 border border-blue-200 dark:border-blue-900/40 p-4 rounded-2xl text-center">
            <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">
              Total Payable Amount
            </span>
            <h2 className="text-3xl font-black text-foreground mt-1">₹{amount.toFixed(2)}</h2>
            <div className="flex items-center justify-center gap-2 mt-1 font-mono text-[10px] text-muted-foreground">
              <span>Bill #{billNumber}</span>
              {order && <span className="text-blue-600 font-bold">• Order: {order.id}</span>}
            </div>
          </div>

          {activeTab === "qr" && (
            <div className="flex flex-col items-center justify-center space-y-3 bg-card border border-border/80 p-5 rounded-2xl shadow-inner">
              <div className="size-52 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center relative">
                {loading && !qrSvgSrc ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="size-8 animate-spin text-blue-600" />
                    <span className="text-[11px] text-slate-500 font-medium">Generating live QR...</span>
                  </div>
                ) : qrSvgSrc ? (
                  <img
                    src={qrSvgSrc}
                    alt="Razorpay Dynamic UPI QR"
                    className="w-full h-full object-contain rounded-lg"
                  />
                ) : (
                  <div className="text-center text-slate-500 text-[11px] p-2">
                    Unable to load QR. Please use Checkout or SMS Link tab.
                  </div>
                )}
                {isPaid && (
                  <div className="absolute inset-0 bg-emerald-600/95 rounded-2xl flex flex-col items-center justify-center text-white">
                    <CheckCircle2 className="size-10 mb-1" />
                    <span className="font-bold text-xs">Payment Captured!</span>
                  </div>
                )}
              </div>
              
              <div className="text-center space-y-1.5 w-full">
                <p className="font-bold text-foreground text-sm">Scan with Any UPI App or Camera</p>
                <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold text-muted-foreground flex-wrap">
                  <span className="px-2 py-0.5 rounded bg-muted">GPay</span>
                  <span className="px-2 py-0.5 rounded bg-muted">PhonePe</span>
                  <span className="px-2 py-0.5 rounded bg-muted">Paytm</span>
                  <span className="px-2 py-0.5 rounded bg-muted">Cred / BHIM</span>
                </div>

                {qrTarget && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="px-2.5 py-1 rounded-lg bg-muted text-muted-foreground hover:text-foreground text-[10.5px] font-medium inline-flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      {copied ? <Check className="size-3 text-emerald-600" /> : <Copy className="size-3" />}
                      {copied ? "Copied" : "Copy Payment Link"}
                    </button>
                    <a
                      href={qrTarget}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-600 hover:text-blue-700 text-[10.5px] font-bold inline-flex items-center gap-1 transition-colors"
                    >
                      <ExternalLink className="size-3" />
                      Open Checkout
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "checkout" && (
            <div className="space-y-4 bg-muted/20 p-5 rounded-2xl border border-border/60 text-center">
              <div className="space-y-1">
                <p className="font-bold text-sm text-foreground">Razorpay Universal Checkout</p>
                <p className="text-[11px] text-muted-foreground">
                  Collect payments seamlessly via UPI Apps, Cards, Netbanking, or Digital Wallets.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenRazorpayCheckout}
                disabled={loading || isVerifying || isPaid}
                className="w-full py-3.5 px-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/25 transition-all cursor-pointer"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Verifying Bank Signature...
                  </>
                ) : loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Initializing Order...
                  </>
                ) : (
                  <>
                    <Zap className="size-4 text-amber-300" /> Pay with Razorpay Checkout
                  </>
                )}
              </button>

              <div className="flex items-center justify-center gap-3 text-[10px] font-bold text-muted-foreground pt-1">
                <span>🛡️ 256-Bit SSL Secured</span>
                <span>•</span>
                <span>Instant Settlement</span>
              </div>
            </div>
          )}

          {activeTab === "link" && (
            <div className="space-y-3 bg-muted/20 p-4 rounded-2xl border border-border/60">
              <label className="block font-bold text-foreground">Customer Mobile Number</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  placeholder="e.g. 9876543210"
                  maxLength={10}
                  className="flex-1 h-10 px-3 bg-background border border-border rounded-xl font-mono text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                </input>
                <button
                  type="button"
                  onClick={handleSendLink}
                  disabled={loading}
                  className="px-4 h-10 bg-blue-600 text-white rounded-xl font-bold flex items-center gap-1.5 hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  {loading ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
                  Send SMS
                </button>
              </div>

              {paymentLink && (
                <div className="mt-3 space-y-2 pt-3 border-t border-border/60">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-foreground">Dispatched Payment Link:</span>
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 font-semibold text-[11px] cursor-pointer"
                    >
                      {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                      {copied ? "Copied" : "Copy"}
                    </button>
                  </div>
                  <div className="p-2.5 bg-background border border-border rounded-xl font-mono text-[11px] text-muted-foreground truncate select-all">
                    {paymentLink}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Real-time Status Sync Banner */}
          <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/50 border border-border/60 text-xs">
            <div className="flex items-center gap-2 text-muted-foreground">
              <RefreshCw className={`size-3.5 text-blue-600 ${pollCount > 0 ? "animate-spin" : ""}`} />
              <span className="font-medium text-[11px]">
                {isPaid ? "Payment Verified & Captured" : "Listening for customer payment..."}
              </span>
            </div>
            <button
              type="button"
              onClick={handleManualCheckStatus}
              disabled={loading || isPaid}
              className="text-[11px] font-bold text-blue-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              Re-check Status
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
