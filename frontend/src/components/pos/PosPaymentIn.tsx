import React, { useState, useEffect } from "react";
import { crmApi, invoicesApi, procurementApi, inventoryApi, crmWalletApi, posApi } from "../../lib/api-client";
import { 
  Search, 
  HelpCircle, 
  Settings, 
  ChevronDown, 
  Filter, 
  Printer, 
  MoreVertical, 
  ArrowLeft,
  X,
  Plus,
  FileText,
  Calendar,
  WalletCards,
  Receipt,
  FileSpreadsheet,
  CheckCircle,
  Clock,
  Eye,
  ExternalLink,
  DollarSign
} from "lucide-react";
import { toast } from "sonner";
import { ThermalReceiptPrinter } from "./ThermalReceiptPrinter";
import { triggerThermalPrint } from "../../lib/print-helper";
import { useCurrency } from "@/hooks/use-currency";
import { useTenant } from "@/contexts/tenant-context";
import { getTodayDateString } from "@/lib/utils";
import { DatePickerInput } from "@/components/ui/date-picker-input";

// Removed dummy PAST_PAYMENTS in favor of real backend data

export function PosPaymentIn() {
  const { currency, formatCurrency } = useCurrency();
  const { tenant } = useTenant();
  const currentTenantId = (tenant as any)?.raw?.tenant_id || (tenant as any)?.tenant_id || tenant?.id || "default";
  const currentCompanyId = tenant?.id || (tenant as any)?.raw?.id || (tenant as any)?.company_id || "default";
  const posStorageKey = `pos_saved_invoices_${currentTenantId}_${currentCompanyId}`;

  const [isRecordingPayment, setIsRecordingPayment] = useState(false);
  
  const [parties, setParties] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedParty, setSelectedParty] = useState<any>(null);
  const [partySummary, setPartySummary] = useState<any>(null);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  
  // Payment Mode / Purpose: 'settle_due' | 'wallet_topup' | 'wallet_debit'
  const [paymentPurpose, setPaymentPurpose] = useState<'settle_due' | 'wallet_topup' | 'wallet_debit'>('settle_due');
  const [paymentAmount, setPaymentAmount] = useState<number | "">("");
  const [paymentDate, setPaymentDate] = useState(getTodayDateString());
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [paymentNumber, setPaymentNumber] = useState(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
  const [paymentDiscount, setPaymentDiscount] = useState<number | "">("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [pendingInvoices, setPendingInvoices] = useState<any[]>([]);
  const [pastPayments, setPastPayments] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalCredits: 0,
    totalDebits: 0,
    netInflow: 0,
    walletDeposits: 0,
    walletDebits: 0,
    count: 0
  });

  // Ledger Filter Tabs: 'all_passbook' | 'credits_only' | 'debits_only' | 'settlements_only' | 'notes_only' | 'wallet_movements'
  const [activeLedgerTab, setActiveLedgerTab] = useState<'all_passbook' | 'credits_only' | 'debits_only' | 'settlements_only' | 'notes_only' | 'wallet_movements'>('all_passbook');
  const [tableSearchQuery, setTableSearchQuery] = useState("");
  const [customerFilter, setCustomerFilter] = useState<string>("All");
  const [dateFilter, setDateFilter] = useState("Last 365 Days");
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [modeFilter, setModeFilter] = useState("All");
  const [isModeDropdownOpen, setIsModeDropdownOpen] = useState(false);
  const [printedPayment, setPrintedPayment] = useState<any>(null);
  const [actionMenuOpenId, setActionMenuOpenId] = useState<string | null>(null);

  // Invoice Details Modal States
  const [viewingInvoice, setViewingInvoice] = useState<any | null>(null);
  const [isLoadingInvoice, setIsLoadingInvoice] = useState(false);

  const handleOpenInvoiceDetails = async (invoiceIdOrNumber: string) => {
    if (!invoiceIdOrNumber) return;
    setIsLoadingInvoice(true);
    try {
      let inv: any = null;
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(invoiceIdOrNumber);
      if (isUUID) {
        inv = await invoicesApi.getInvoice(invoiceIdOrNumber);
      } else {
        const cleanNum = invoiceIdOrNumber.replace(/^(Invoice\s*#?|Bill\s*#?)/i, '').trim();
        const res: any = await invoicesApi.listInvoices({ search: cleanNum, page_size: 5 });
        const found = (res.items || res || []).find((i: any) => 
          i.invoice_number?.toLowerCase() === cleanNum.toLowerCase() ||
          i.id === cleanNum
        ) || res.items?.[0];
        if (found) {
          inv = await invoicesApi.getInvoice(found.id);
        }
      }
      if (inv) {
        setViewingInvoice(inv);
      } else {
        toast.error(`Invoice "${invoiceIdOrNumber}" not found in system.`);
      }
    } catch (err: any) {
      console.error("Failed to fetch invoice details:", err);
      toast.error("Failed to load invoice details.");
    } finally {
      setIsLoadingInvoice(false);
    }
  };

  const fetchPayments = async () => {
    try {
      const [
        invoicesRes,
        walletRes,
        vendorPaymentsRes,
        vendorBillsRes,
        creditNotesRes,
        debitNotesRes,
        posHistoryRes
      ] = await Promise.all([
        invoicesApi.listPayments().catch(() => ({ items: [] })),
        crmWalletApi.listTransactions(undefined, 1, 500).catch(() => ({ items: [] })),
        inventoryApi.getVendorPayments().catch(() => []),
        inventoryApi.getVendorBills().catch(() => []),
        invoicesApi.listInvoices({ invoice_type: "credit_note", page_size: 200 }).catch(() => null),
        invoicesApi.listInvoices({ invoice_type: "debit_note", page_size: 200 }).catch(() => null),
        posApi.getHistory({ limit: 500 }).catch(() => [])
      ]);
      
      // 1. Invoice Settlements (Credits / Inflows)
      const invPayments = (invoicesRes?.items || []).map((p: any) => ({
        id: p.id,
        voucher_number: p.payment_number || `REC-${String(p.id).slice(0, 6).toUpperCase()}`,
        reference_text: p.invoice_number ? `Invoice #${p.invoice_number}` : "Invoice Settlement",
        invoice_id: p.invoice_id,
        invoice_number: p.invoice_number,
        party_name: p.party_name || p.customer_name || "Customer",
        party_type: 'Customer',
        party_id: p.customer_id,
        entry_type: 'credit',
        credit_amount: Number(p.amount) || 0,
        debit_amount: 0,
        amount: Number(p.amount) || 0,
        running_balance: null,
        payment_date: p.payment_date,
        payment_method: p.payment_method || "Cash",
        badge: "Invoice Settlement",
        badge_variant: "emerald",
        notes: p.notes || "Invoice Bill Payment",
        created_at: p.payment_date || new Date().toISOString()
      }));

      // 2. Customer Wallet Transactions (Both Credits and Debits)
      const walletTransactions = (walletRes?.items || []).map((w: any) => {
        const isCredit = ["manual_credit", "topup", "refund", "cashback", "adjustment"].includes(w.transaction_type);
        const amountNum = Number(w.amount) || 0;
        return {
          id: w.id,
          voucher_number: w.reference_id || `WAL-${String(w.id).slice(0, 8).toUpperCase()}`,
          reference_text: w.description || (isCredit ? "Wallet Advance Deposit" : "Invoice Paid via Wallet"),
          party_name: w.customer_name || "Customer",
          party_type: 'Customer',
          party_id: w.customer_id,
          entry_type: isCredit ? 'credit' : 'debit',
          credit_amount: isCredit ? amountNum : 0,
          debit_amount: isCredit ? 0 : amountNum,
          amount: amountNum,
          running_balance: w.balance_after != null ? Number(w.balance_after) : null,
          payment_date: w.created_at,
          payment_method: isCredit 
            ? (w.description?.toLowerCase().includes("upi") ? "UPI" : (w.description?.toLowerCase().includes("card") ? "Card" : "Cash / Advance"))
            : "Wallet (Store Credit)",
          badge: isCredit ? "Wallet Top-up" : (w.transaction_type === "payment" ? "Invoice Paid (Wallet)" : "Wallet Debit"),
          badge_variant: isCredit ? "purple" : "rose",
          notes: w.description || "",
          transaction_type: w.transaction_type,
          created_at: w.created_at || new Date().toISOString()
        };
      });
      
      // 3. Vendor Bill Payments (Debits / Payouts)
      const venPayments = (vendorPaymentsRes || []).map((p: any) => {
        const bill = (vendorBillsRes || []).find((b: any) => b.id === p.vendor_bill_id);
        const amt = Number(p.amount_paid) || 0;
        return {
          id: p.id,
          voucher_number: p.reference_number || `PAY-${String(p.id).slice(0, 6).toUpperCase()}`,
          reference_text: bill?.bill_number ? `Vendor Bill #${bill.bill_number}` : "Supplier Payout",
          party_name: bill?.supplier_name || "Vendor",
          party_type: 'Vendor',
          party_id: "Vendor",
          entry_type: 'debit',
          credit_amount: 0,
          debit_amount: amt,
          amount: amt,
          running_balance: null,
          payment_date: p.payment_date || new Date().toISOString(),
          payment_method: p.payment_method || "Bank Transfer",
          badge: "Vendor Payout",
          badge_variant: "amber",
          notes: p.notes || "Supplier Bill Settlement",
          created_at: p.payment_date || new Date().toISOString(),
        };
      });

      // 4. Credit Notes (Customer Returns / Sales Adjustments)
      const rawCreditNotes = creditNotesRes?.items || (Array.isArray(creditNotesRes) ? creditNotesRes : []);
      const creditNoteEntries = rawCreditNotes.map((cn: any) => {
        const amt = Number(cn.total_amount || cn.grand_total || cn.total || 0);
        return {
          id: cn.id,
          voucher_number: cn.invoice_number || `CN-${String(cn.id).slice(0, 6).toUpperCase()}`,
          reference_text: cn.reference_number || cn.notes || (cn.original_invoice_ref ? `Credit Note against ${cn.original_invoice_ref}` : "Customer Credit Note"),
          invoice_id: cn.id,
          invoice_number: cn.invoice_number,
          party_name: cn.customer_name || "Customer",
          party_type: 'Customer',
          party_id: cn.customer_id,
          entry_type: 'debit',
          credit_amount: 0,
          debit_amount: amt,
          amount: amt,
          running_balance: null,
          payment_date: cn.invoice_date || cn.created_at || new Date().toISOString(),
          payment_method: cn.payment_method || "Credit Note",
          badge: "Credit Note",
          badge_variant: "rose",
          notes: cn.note_reason || cn.notes || "Customer Return / Credit Adjustment",
          created_at: cn.created_at || cn.invoice_date || new Date().toISOString(),
        };
      });

      // 5. Debit Notes (Vendor Adjustments / Debits)
      const rawDebitNotes = debitNotesRes?.items || (Array.isArray(debitNotesRes) ? debitNotesRes : []);
      const debitNoteEntries = rawDebitNotes.map((dn: any) => {
        const amt = Number(dn.total_amount || dn.grand_total || dn.total || 0);
        return {
          id: dn.id,
          voucher_number: dn.invoice_number || `DN-${String(dn.id).slice(0, 6).toUpperCase()}`,
          reference_text: dn.reference_number || dn.notes || "Supplier Debit Note",
          invoice_id: dn.id,
          invoice_number: dn.invoice_number,
          party_name: dn.customer_name || dn.vendor_name || "Vendor / Party",
          party_type: dn.vendor_name ? 'Vendor' : 'Customer',
          party_id: dn.customer_id || "Party",
          entry_type: 'credit',
          credit_amount: amt,
          debit_amount: 0,
          amount: amt,
          running_balance: null,
          payment_date: dn.invoice_date || dn.created_at || new Date().toISOString(),
          payment_method: dn.payment_method || "Debit Note",
          badge: "Debit Note",
          badge_variant: "amber",
          notes: dn.notes || "Supplier Debit Adjustment",
          created_at: dn.created_at || dn.invoice_date || new Date().toISOString(),
        };
      });

      // 6. POS Counter Sales & POS Counter Refunds
      const rawPosHistory = Array.isArray(posHistoryRes) ? posHistoryRes : [];
      const posCounterEntries = rawPosHistory.filter((p: any) => {
        return !invPayments.some((ip: any) => ip.voucher_number === p.receipt_number);
      }).map((p: any) => {
        const isRefund = p.status === "refunded" || p.total_amount < 0;
        const absTotal = Math.abs(Number(p.total_amount || 0));
        return {
          id: p.id,
          voucher_number: p.receipt_number || `POS-${String(p.id).slice(0, 6).toUpperCase()}`,
          reference_text: isRefund ? "POS Counter Return / Refund" : "POS Counter Sale Bill",
          party_name: p.customer_name || p.customer_id || "Walk-in Guest",
          party_type: 'Customer',
          party_id: p.customer_id || "Walk-in",
          entry_type: isRefund ? 'debit' : 'credit',
          credit_amount: isRefund ? 0 : absTotal,
          debit_amount: isRefund ? absTotal : 0,
          amount: absTotal,
          running_balance: null,
          payment_date: p.created_at || new Date().toISOString(),
          payment_method: p.payments?.[0]?.payment_method || "Cash",
          badge: isRefund ? "POS Refund" : "POS Counter Sale",
          badge_variant: isRefund ? "rose" : "emerald",
          notes: isRefund ? "In-store Counter Refund" : "In-store Counter Sale",
          created_at: p.created_at || new Date().toISOString()
        };
      });
      
      const combined = [
        ...invPayments,
        ...walletTransactions,
        ...venPayments,
        ...creditNoteEntries,
        ...debitNoteEntries,
        ...posCounterEntries
      ].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      
      setPastPayments(combined);
      
      let totCredits = 0;
      let totDebits = 0;
      let wDeposits = 0;
      let wDebits = 0;
      
      combined.forEach((p: any) => {
        totCredits += p.credit_amount;
        totDebits += p.debit_amount;
        if (p.badge === "Wallet Top-up") {
          wDeposits += p.credit_amount;
        }
        if (p.badge_variant === "rose") {
          wDebits += p.debit_amount;
        }
      });
      
      setStats({
        totalCredits: totCredits,
        totalDebits: totDebits,
        netInflow: totCredits - totDebits,
        walletDeposits: wDeposits,
        walletDebits: wDebits,
        count: combined.length
      });
    } catch (err) {
      console.error("fetchPayments error:", err);
    }
  };

  useEffect(() => {
    Promise.all([
      crmApi.getCustomers(1, 100),
      procurementApi.getVendors(1, 100).catch(() => [])
    ]).then(([custRes, vendRes]) => {
      const c = (custRes.items || custRes || []).map((x: any) => ({ ...x, type: 'customer' }));
      const v = (vendRes.items || vendRes || []).map((x: any) => ({ ...x, type: 'vendor' }));
      setParties([...c, ...v]);
    }).catch(console.error);
    
    fetchPayments();
  }, []);

  const handleSelectParty = async (party: any) => {
    setSelectedParty(party);
    setSearchQuery(party.name);
    setIsDropdownOpen(false);
    
    try {
      if (party.type === 'customer') {
        const [data, walletRes]: any = await Promise.all([
          invoicesApi.getCustomerSummary(party.id).catch(() => null),
          crmWalletApi.getBalance(party.id).catch(() => ({ balance: 0 }))
        ]);
        setWalletBalance(walletRes?.balance || 0);

        // Check local storage saved invoices for this customer
        let localInvoices: any[] = [];
        try {
          const stored = localStorage.getItem(posStorageKey);
          if (stored) {
            localInvoices = JSON.parse(stored);
          }
        } catch (e) {}

        const backendUnpaid = (data?.unpaid_invoices || []).filter((inv: any) => {
          const rawStatus = String(inv.status || "").toLowerCase();
          const due = Number(inv.balance_due) || 0;
          return !["paid", "voided", "cancelled", "completed"].includes(rawStatus) && due > 0.05;
        });

        // Also check if any local invoice for this customer is Unpaid or Partial
        const localUnpaidForCustomer = localInvoices
          .filter((inv: any) => {
            const isMatch = (inv.customer_id && inv.customer_id === party.id) ||
              (inv.customer_name && inv.customer_name.toLowerCase() === party.name.toLowerCase()) ||
              (inv.customer_phone && party.phone && inv.customer_phone === party.phone);
            if (!isMatch) return false;

            const isPaid = inv.payment_status === "Paid" || (Number(inv.amount_received || 0) >= Number(inv.grand_total || 0) - 0.05);
            return !isPaid;
          })
          .map((inv: any) => ({
            id: inv.invoice_number,
            realId: inv.id,
            date: inv.invoice_date,
            total: Number(inv.grand_total || 0),
            pending: Math.max(0, Number(inv.grand_total || 0) - Number(inv.amount_received || 0)),
          }))
          .filter((inv: any) => inv.pending > 0.05);

        // Deduplicate between backend and local
        const mergedMap = new Map<string, any>();
        backendUnpaid.forEach((inv: any) => {
          mergedMap.set(inv.invoice_number || inv.id, {
            id: inv.invoice_number,
            realId: inv.id,
            date: inv.invoice_date,
            total: Number(inv.total_amount || 0),
            pending: Number(inv.balance_due || 0),
          });
        });
        localUnpaidForCustomer.forEach((inv: any) => {
          if (!mergedMap.has(inv.id)) {
            mergedMap.set(inv.id, inv);
          }
        });

        const finalPendingInvoices = Array.from(mergedMap.values()).filter((inv: any) => inv.pending > 0.05);
        const totalPendingDue = finalPendingInvoices.reduce((sum, inv) => sum + inv.pending, 0);

        setPartySummary({
          total_pending_due: totalPendingDue,
          total_invoices: data?.total_invoices || localInvoices.length,
          total_spent: data?.total_spent || 0,
        });

        if (finalPendingInvoices.length > 0) {
          setPendingInvoices(finalPendingInvoices);
          setPaymentPurpose('settle_due');
        } else {
          setPendingInvoices([]);
          setPaymentPurpose('wallet_topup');
        }
      } else {
        // Vendor logic
        const bills: any = await inventoryApi.getVendorBills().catch(() => []);
        const pending = (bills || []).filter((b: any) => 
          b.supplier_name === party.name && 
          (b.status === "Unpaid" || b.status === "Partially Paid" || b.status === "Overdue")
        );
        
        const totalPending = pending.reduce((sum: number, b: any) => sum + (b.total_amount - b.paid_amount), 0);
        setPartySummary({ total_pending_due: totalPending });
        setPaymentPurpose('settle_due');
        
        setPendingInvoices(
          pending.map((inv: any) => ({
            id: inv.bill_number || "Bill",
            realId: inv.id,
            date: inv.due_date || inv.created_at,
            total: inv.total_amount,
            pending: inv.total_amount - inv.paid_amount
          }))
        );
      }
    } catch (err) {
      setPartySummary(null);
      setPendingInvoices([]);
      setWalletBalance(0);
    }
  };

  // Allocation Mode: 'auto' (FIFO) or 'manual' (Choose specific invoices)
  const [allocationMode, setAllocationMode] = useState<'auto' | 'manual'>('auto');
  const [manualAllocations, setManualAllocations] = useState<{ [invoiceId: string]: number }>({});

  const calculateAllocation = () => {
    let remaining = Number(paymentAmount) || 0;
    let allocated = 0;
    
    if (paymentPurpose === 'wallet_topup') {
      return { allocations: [], remainingAdvance: remaining, totalAllocated: 0 };
    }

    if (allocationMode === 'manual') {
      const allocations = pendingInvoices.map(inv => {
        const customAmt = manualAllocations[inv.realId] || 0;
        allocated += customAmt;
        return {
          ...inv,
          allocated: customAmt,
          newPending: Math.max(0, inv.pending - customAmt)
        };
      });
      const remainingAdvance = Math.max(0, remaining - allocated);
      return { allocations, remainingAdvance, totalAllocated: allocated };
    }

    const allocations = pendingInvoices.map(inv => {
      const allocateToThis = Math.min(inv.pending, remaining);
      remaining -= allocateToThis;
      allocated += allocateToThis;
      return {
        ...inv,
        allocated: allocateToThis,
        newPending: inv.pending - allocateToThis
      };
    });

    return { allocations, remainingAdvance: remaining, totalAllocated: allocated };
  };

  const { allocations, remainingAdvance, totalAllocated } = calculateAllocation();

  const handleToggleInvoiceManual = (invId: string, fullPending: number) => {
    setManualAllocations(prev => {
      const current = prev[invId] || 0;
      const updated = { ...prev };
      if (current > 0) {
        delete updated[invId];
      } else {
        updated[invId] = fullPending;
      }
      
      // Auto-update total payment amount to match selected invoices
      const sum = Object.values(updated).reduce((a, b) => a + b, 0);
      setPaymentAmount(sum > 0 ? sum : "");
      return updated;
    });
  };

  const handleManualAmountChange = (invId: string, value: string, maxPending: number) => {
    const num = value === "" ? 0 : Math.min(maxPending, Math.max(0, Number(value)));
    setManualAllocations(prev => {
      const updated = { ...prev, [invId]: num };
      if (num === 0) delete updated[invId];
      const sum = Object.values(updated).reduce((a, b) => a + b, 0);
      setPaymentAmount(sum > 0 ? sum : "");
      return updated;
    });
  };

  const handleProcessPayment = async () => {
    if (!paymentAmount || Number(paymentAmount) <= 0) {
      toast.error("Please enter a valid payment amount.");
      return;
    }
    
    if (!selectedParty) {
      toast.error("Please select a customer or party.");
      return;
    }

    setIsProcessing(true);
    try {
      const numAmount = Number(paymentAmount);
      
      // Case 1: Wallet Debit / Cash Payout
      if (paymentPurpose === 'wallet_debit' && selectedParty.type === 'customer') {
        if (numAmount > walletBalance) {
          toast.error(`Cannot debit more than available wallet balance (${formatCurrency(walletBalance)})`);
          setIsProcessing(false);
          return;
        }
        await crmWalletApi.debit(
          selectedParty.id,
          numAmount,
          paymentNotes || `Customer Wallet Debit / Withdrawal (${paymentMode})`,
          paymentNumber
        );
        toast.success(`Successfully debited ${formatCurrency(numAmount)} from ${selectedParty.name}'s wallet!`);
      } else if (paymentPurpose === 'wallet_topup' && selectedParty.type === 'customer') {
        // Case 2: Direct Wallet Top-Up (Credit In)
        await crmWalletApi.credit(
          selectedParty.id,
          numAmount,
          paymentNotes || `POS Advance Wallet Deposit (${paymentMode})`,
          paymentNumber
        );
        toast.success(`Successfully added ${formatCurrency(numAmount)} to ${selectedParty.name}'s wallet!`);
      } else {
        // Case 3: Settle Invoices (FIFO / Manual)
        let totalApplied = 0;
        for (const inv of allocations) {
          if (inv.allocated > 0) {
            if (selectedParty.type === 'customer') {
              await invoicesApi.recordPayment(inv.realId, {
                amount: inv.allocated,
                payment_date: paymentDate,
                payment_method: paymentMode.toLowerCase(),
              });
            } else {
              await inventoryApi.createVendorPayment({
                vendor_bill_id: inv.realId,
                amount_paid: inv.allocated,
                payment_method: paymentMode,
                reference_number: paymentNumber
              });
            }
            totalApplied += inv.allocated;
          }
        }
        
        // Excess surplus goes to wallet
        if (remainingAdvance > 0 && selectedParty.type === 'customer') {
          await crmWalletApi.credit(
            selectedParty.id,
            remainingAdvance,
            `Surplus Overpayment from POS Payment #${paymentNumber}`,
            paymentNumber
          );
          toast.success(`Overpayment of ${formatCurrency(remainingAdvance)} credited to Customer Wallet.`);
        }
        
        // Sync settled amounts with pos_saved_invoices in localStorage
        try {
          const syncStorage = (key: string) => {
            const storedInvs = localStorage.getItem(key);
            if (storedInvs) {
              const parsedInvs = JSON.parse(storedInvs);
              const updatedInvs = parsedInvs.map((rec: any) => {
                const matchedAlloc = allocations.find(
                  (a) => (a.realId && a.realId === rec.id) || (a.invoice_number && a.invoice_number === rec.invoice_number)
                );
                if (matchedAlloc && matchedAlloc.allocated > 0) {
                  const prevRec = Number(rec.amount_received || 0);
                  const newRec = prevRec + matchedAlloc.allocated;
                  const totalG = Number(rec.grand_total || 0);
                  const isPaid = newRec >= totalG - 0.05;
                  return {
                    ...rec,
                    amount_received: newRec,
                    payment_status: isPaid ? "Paid" : "Partial",
                    payment_mode: paymentMode,
                  };
                }
                return rec;
              });
              localStorage.setItem(key, JSON.stringify(updatedInvs));
            }
          };
          syncStorage(posStorageKey);
        } catch (e) {
          console.warn("Could not sync pos_saved_invoices:", e);
        }

        // Broadcast pos_invoices_updated to immediately refresh Invoices History tab
        window.dispatchEvent(new Event("pos_invoices_updated"));
        window.dispatchEvent(new Event("storage"));
      }
      
      fetchPayments();
      setSelectedParty(null);
      setPartySummary(null);
      setPendingInvoices([]);
      setPaymentAmount("");
      setPaymentNotes("");
      setSearchQuery("");
      setIsRecordingPayment(false);
    } catch (error: any) {
      console.error("Payment failed:", error);
      toast.error(error?.response?.data?.detail || error.message || "Failed to process payment.");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredPayments = React.useMemo(() => {
    let filtered = [...pastPayments];
    
    // Customer Filter
    if (customerFilter !== "All") {
      filtered = filtered.filter(p => p.party_name === customerFilter || p.party_id === customerFilter);
    }

    // Tab Filter
    if (activeLedgerTab === 'credits_only') {
      filtered = filtered.filter(p => p.entry_type === 'credit');
    } else if (activeLedgerTab === 'debits_only') {
      filtered = filtered.filter(p => p.entry_type === 'debit');
    } else if (activeLedgerTab === 'settlements_only') {
      filtered = filtered.filter(p => p.badge === 'Invoice Settlement');
    } else if (activeLedgerTab === 'notes_only') {
      filtered = filtered.filter(p => p.badge?.toLowerCase().includes('note'));
    } else if (activeLedgerTab === 'wallet_movements') {
      filtered = filtered.filter(p => p.badge?.toLowerCase().includes('wallet'));
    }

    if (tableSearchQuery) {
      const q = tableSearchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.party_name && p.party_name.toLowerCase().includes(q)) ||
        (p.voucher_number && p.voucher_number.toLowerCase().includes(q)) ||
        (p.reference_text && p.reference_text.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q))
      );
    }
    if (modeFilter !== "All") {
      filtered = filtered.filter(p => p.payment_method?.toLowerCase() === modeFilter.toLowerCase());
    }
    const now = new Date();
    filtered = filtered.filter(p => {
      const pDate = new Date(p.payment_date);
      if (dateFilter === "Today") {
        return pDate.toDateString() === now.toDateString();
      } else if (dateFilter === "Last 7 Days") {
        return (now.getTime() - pDate.getTime()) <= 7 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === "Last 30 Days") {
        return (now.getTime() - pDate.getTime()) <= 30 * 24 * 60 * 60 * 1000;
      } else if (dateFilter === "Last 365 Days") {
        return (now.getTime() - pDate.getTime()) <= 365 * 24 * 60 * 60 * 1000;
      }
      return true;
    });
    return filtered;
  }, [pastPayments, activeLedgerTab, customerFilter, tableSearchQuery, dateFilter, modeFilter]);

  const handlePrintPaymentReceipt = (payment: any) => {
    setActionMenuOpenId(null);
    const billData = {
      invoice_number: `PAY-${(payment.id || "000000").substring(0,6).toUpperCase()}`,
      invoice_date: payment.payment_date,
      customer_name: payment.party_name,
      total_amount: payment.amount,
      amount_paid: payment.amount,
      balance_due: 0,
      payment_method: payment.payment_method,
      lines: [{
         item_name: `Payment / Wallet Credit (#${payment.invoice_number || payment.id?.substring(0,6)})`,
         quantity: 1,
         unit_price: payment.amount,
         line_total: payment.amount
      }]
    };
    setPrintedPayment(billData);
    setTimeout(() => {
      triggerThermalPrint();
    }, 100);
  };

  const handlePrintTableThermally = () => {
    const reportData = {
      title: "Passbook Ledger Report",
      items: filteredPayments.map(p => ({
         name: `${p.party_name} (${p.voucher_number})`,
         quantity: 1,
         price: p.credit_amount > 0 ? p.credit_amount : p.debit_amount,
         subtotal: p.credit_amount > 0 ? p.credit_amount : p.debit_amount
      }))
    };
    setPrintedPayment(reportData);
    setTimeout(() => {
      triggerThermalPrint();
    }, 100);
  };

  return (
    <div className="flex w-full h-full relative overflow-hidden text-slate-800">
      
      {/* Hidden Thermal Printer Element */}
      {printedPayment && (
         <div className="hidden">
           <ThermalReceiptPrinter bill={printedPayment} />
         </div>
      )}
      
      {/* LEFT PANE (Main Content) */}
      <div className={`flex-1 flex flex-col transition-all duration-300 ${isRecordingPayment ? "mr-[500px]" : "mr-0"}`}>
        <div className="space-y-6 h-full flex flex-col w-full overflow-y-auto">
          
          {/* Header */}
          <div className="flex flex-wrap justify-between items-center gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight text-foreground">Payment In & Customer Wallet Ledger</h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">Real-Time Debit / Credit</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">Full double-entry passbook, customer credit settlements, wallet top-ups, and live balance auditing.</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => {
                  setPaymentNumber(`PAY-${Math.floor(1000 + Math.random() * 9000)}`);
                  setPaymentPurpose('settle_due');
                  setIsRecordingPayment(true);
                }}
                className="gradient-brand text-white font-semibold px-3 h-8 text-xs rounded-lg shadow-xs flex items-center gap-1.5 transition-all hover:opacity-90"
              >
                <Plus className="w-3.5 h-3.5" /> Record Payment / Wallet Entry
              </button>
            </div>
          </div>

          {/* Double-Entry KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {/* Total Credits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <WalletCards className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">Total Credits (Inflow)</p>
                <p className="text-lg font-black text-emerald-600">+{formatCurrency(stats.totalCredits)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Collections & Top-ups</p>
              </div>
            </div>

            {/* Total Debits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center shrink-0">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">Total Debits (Spent / Out)</p>
                <p className="text-lg font-black text-rose-600">-{formatCurrency(stats.totalDebits)}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">Wallet sales & payouts</p>
              </div>
            </div>

            {/* Wallet Pre-paid Deposits */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">Customer Wallet Float</p>
                <p className="text-lg font-black text-purple-700">{formatCurrency(stats.walletDeposits)}</p>
                <p className="text-[11px] text-purple-600 font-semibold mt-0.5">Active customer store credit</p>
              </div>
            </div>

            {/* Net Inflow Position */}
            <div className="bg-white border border-slate-200 rounded-2xl p-4 flex gap-4 shadow-2xs">
              <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-0.5">Net Cash Flow</p>
                <p className={`text-lg font-black ${stats.netInflow >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                  {formatCurrency(stats.netInflow)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{stats.count} Recorded vouchers</p>
              </div>
            </div>
          </div>

          {/* Segmented Ledger Tabs */}
          <div className="flex items-center gap-2 mb-4 border-b border-slate-200 pb-2 overflow-x-auto">
            {[
              { id: 'all_passbook', label: '📑 All Transactions (Passbook)' },
              { id: 'credits_only', label: '🟢 Credits (Inflows & Top-ups)' },
              { id: 'debits_only', label: '🔴 Debits (Outflows & Refunds)' },
              { id: 'settlements_only', label: '💳 Invoice Settlements' },
              { id: 'notes_only', label: '📝 Credit & Debit Notes' },
              { id: 'wallet_movements', label: '💰 Wallet Movements' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveLedgerTab(tab.id as any)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeLedgerTab === tab.id
                    ? "bg-slate-900 text-white shadow-xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap gap-3 mb-4 no-print">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input 
                type="text" 
                value={tableSearchQuery}
                onChange={(e) => setTableSearchQuery(e.target.value)}
                placeholder="Search by customer, voucher #, invoice #, remarks..."
                className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-400 bg-white font-medium"
              />
            </div>

            {/* Customer Passbook Filter */}
            <div className="relative">
              <select
                value={customerFilter}
                onChange={(e) => setCustomerFilter(e.target.value)}
                className="h-10 px-3 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
              >
                <option value="All">👤 All Parties & Accounts</option>
                {parties.map(p => (
                  <option key={`${p.type}-${p.id}`} value={p.name}>
                    {p.name} ({p.type})
                  </option>
                ))}
              </select>
            </div>
            
            {/* Date Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
                className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
              >
                <Calendar className="w-4 h-4 text-slate-500" /> {dateFilter} <ChevronDown className="w-4 h-4" />
              </button>
              {isDateDropdownOpen && (
                <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1">
                  {["Today", "Last 7 Days", "Last 30 Days", "Last 365 Days", "All Time"].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => { setDateFilter(opt); setIsDateDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>
            
            {/* Mode Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsModeDropdownOpen(!isModeDropdownOpen)}
                className="flex items-center gap-2 border border-slate-200 rounded-xl px-4 py-2 text-sm text-slate-700 bg-white hover:bg-slate-50"
              >
                <Filter className="w-4 h-4" /> {modeFilter === "All" ? "Filter Mode" : modeFilter}
              </button>
              {isModeDropdownOpen && (
                <div className="absolute top-full right-0 mt-1 w-48 bg-white border border-slate-200 rounded-xl shadow-lg z-10 py-1">
                  {["All", "Cash", "UPI", "Card", "Wallet", "Bank Transfer"].map(opt => (
                    <button 
                      key={opt}
                      onClick={() => { setModeFilter(opt); setIsModeDropdownOpen(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {opt === "All" ? "All Payment Modes" : opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button 
              onClick={handlePrintTableThermally}
              className="border border-slate-200 rounded-xl px-3 py-2 text-slate-600 bg-white hover:bg-slate-50"
              title="Print Passbook Table Thermally"
            >
              <Printer className="w-4 h-4" />
            </button>
          </div>

          {/* Double-Entry Passbook Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col shadow-2xs">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-sm">
                <thead className="bg-slate-50 border-b text-slate-600 text-xs uppercase font-semibold">
              <tr>
                <th className="py-3.5 px-4">Date & Time</th>
                    <th className="py-3.5 px-4">Voucher / Ref #</th>
                    <th className="py-3.5 px-4">Party & Account</th>
                    <th className="py-3.5 px-4 text-right text-emerald-700">Credit (+) In</th>
                    <th className="py-3.5 px-4 text-right text-rose-700">Debit (-) Out</th>
                    <th className="py-3.5 px-4 text-right text-indigo-900">Running Balance</th>
                    <th className="py-3.5 px-4 text-center">Tender / Mode</th>
                    <th className="py-3.5 px-4 text-right">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {filteredPayments.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center py-12 text-slate-400 text-sm">
                        No ledger transactions found for the selected filter.
                      </td>
                    </tr>
                  ) : (
                    filteredPayments.map((p, idx) => (
                      <tr key={p.id || idx} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-semibold text-slate-900">{new Date(p.payment_date).toLocaleDateString()}</p>
                          <p className="text-[11px] text-slate-400">{new Date(p.payment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-bold text-indigo-600 block">{p.voucher_number}</span>
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-md uppercase tracking-wider mt-0.5 ${
                            p.badge_variant === "purple" ? "bg-purple-100 text-purple-800" :
                            p.badge_variant === "rose" ? "bg-rose-100 text-rose-800" :
                            p.badge_variant === "amber" ? "bg-amber-100 text-amber-800" :
                            "bg-emerald-100 text-emerald-800"
                          }`}>
                            {p.badge}
                          </span>
                          {p.invoice_number ? (
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceDetails(p.invoice_id || p.invoice_number)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 hover:text-indigo-800 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors mt-1"
                              title="Click to view full invoice & line items"
                            >
                              <FileText className="w-3 h-3" /> View Invoice #{p.invoice_number}
                            </button>
                          ) : p.reference_text && p.reference_text.toLowerCase().includes("invoice") ? (
                            <button
                              type="button"
                              onClick={() => handleOpenInvoiceDetails(p.reference_text)}
                              className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-md transition-colors mt-1"
                              title="Click to view full invoice & line items"
                            >
                              <FileText className="w-3 h-3" /> {p.reference_text}
                            </button>
                          ) : p.reference_text ? (
                            <span className="block text-[11px] text-slate-500 font-normal truncate max-w-[180px]">{p.reference_text}</span>
                          ) : null}
                        </td>
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-900">{p.party_name}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-semibold">
                            {p.party_type || "Customer"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right font-black">
                          {p.credit_amount > 0 ? (
                            <span className="text-emerald-600">+{formatCurrency(p.credit_amount)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black">
                          {p.debit_amount > 0 ? (
                            <span className="text-rose-600">-{formatCurrency(p.debit_amount)}</span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black">
                          {p.running_balance != null ? (
                            <span className="text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md font-mono text-xs">
                              {formatCurrency(p.running_balance)}
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700">
                            {p.payment_method || "Cash"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handlePrintPaymentReceipt(p)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print Thermal Receipt"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT PANE (Record Payment / Wallet Drawer) */}
      <div 
        className={`absolute top-0 right-0 w-[500px] h-full bg-white shadow-[-10px_0_30px_rgba(0,0,0,0.08)] border-l border-slate-200 transition-transform duration-300 flex flex-col z-50 ${isRecordingPayment ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsRecordingPayment(false)}
              className="text-slate-500 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-200"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h3 className="text-base font-black text-slate-900">
                {paymentPurpose === 'wallet_debit' ? "Debit Customer Wallet" : paymentPurpose === 'wallet_topup' ? "Top-Up Customer Wallet" : "Record Customer Payment In"}
              </h3>
              <p className="text-[11px] text-slate-500 font-mono">Voucher Ref: #{paymentNumber}</p>
            </div>
          </div>
          <button 
            onClick={() => setIsRecordingPayment(false)}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Form Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* Party Selection */}
          <div className="relative">
            <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Customer / Party <span className="text-rose-500">*</span></label>
            <div className="relative">
              <input
                type="text"
                placeholder="Search customer by name or phone..."
                value={searchQuery}
                onFocus={() => setIsDropdownOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsDropdownOpen(true);
                  if (e.target.value === "") setSelectedParty(null);
                }}
                className="w-full border border-slate-300 rounded-xl h-11 pl-3 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white font-medium"
              />
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              
              {isDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                  {parties
                    .filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
                    .map(c => (
                      <div 
                        key={`${c.type}-${c.id}`} 
                        onClick={() => handleSelectParty(c)}
                        className="px-3.5 py-2.5 hover:bg-indigo-50/50 cursor-pointer border-b border-slate-100 last:border-0"
                      >
                        <div className="flex justify-between items-center">
                          <span className="font-bold text-sm text-slate-900">{c.name}</span>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">{c.type}</span>
                        </div>
                        <span className="text-xs text-slate-500">{c.phone || "No phone"}</span>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Customer Live Status Card */}
          {selectedParty && (
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-slate-800">{selectedParty.name}</span>
                <span className="text-[10px] text-slate-500">{selectedParty.phone || "No phone"}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/80">
                <div className="bg-rose-50/60 p-2 rounded-lg border border-rose-100">
                  <span className="text-[10px] font-semibold text-rose-700 block">Pending Dues</span>
                  <span className="font-black text-sm text-rose-800">
                    {formatCurrency(partySummary?.total_pending_due || 0)}
                  </span>
                </div>
                <div className="bg-emerald-50/60 p-2 rounded-lg border border-emerald-100">
                  <span className="text-[10px] font-semibold text-emerald-700 block">Current Wallet Credit</span>
                  <span className="font-black text-sm text-emerald-800">
                    {formatCurrency(walletBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Purpose Mode Selector */}
          {selectedParty && selectedParty.type === 'customer' && (
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Entry Purpose & Action</label>
              <div className="grid grid-cols-3 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setPaymentPurpose('settle_due')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    paymentPurpose === 'settle_due'
                      ? "bg-white text-indigo-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  💳 Settle Dues
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPurpose('wallet_topup')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    paymentPurpose === 'wallet_topup'
                      ? "bg-white text-purple-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  💰 Top-Up Wallet
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentPurpose('wallet_debit')}
                  className={`py-2 px-1.5 rounded-lg text-xs font-bold transition-all text-center ${
                    paymentPurpose === 'wallet_debit'
                      ? "bg-white text-rose-700 shadow-xs"
                      : "text-slate-600 hover:text-slate-900"
                  }`}
                >
                  💸 Debit Wallet
                </button>
              </div>
            </div>
          )}

          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">Quick Amount</label>
            <div className="flex flex-wrap gap-2">
              {partySummary?.total_pending_due > 0 && paymentPurpose === 'settle_due' && (
                <button
                  type="button"
                  onClick={() => setPaymentAmount(partySummary.total_pending_due)}
                  className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold hover:bg-rose-100 transition-all"
                >
                  Clear Full Due ({formatCurrency(partySummary.total_pending_due)})
                </button>
              )}
              {[500, 1000, 2000, 5000].map(amt => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPaymentAmount(amt)}
                  className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all"
                >
                  +{formatCurrency(amt)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Amount Received / Debited */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">
                {paymentPurpose === 'wallet_debit' ? "Debit Amount *" : "Amount Received *"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">{currency.symbol}</span>
                <input
                  type="number"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full border border-slate-300 rounded-xl h-11 pl-8 pr-3 text-sm font-black text-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Payment Mode */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">Payment Mode <span className="text-rose-500">*</span></label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="w-full border border-slate-300 rounded-xl h-11 px-3 text-sm bg-white font-bold focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer"
              >
                <option value="Cash">Cash</option>
                <option value="UPI">UPI / QR</option>
                <option value="Card">Debit / Credit Card</option>
                <option value="Bank">Bank Transfer</option>
              </select>
            </div>

            {/* Payment Date */}
            <div className="col-span-1">
              <label className="text-xs font-bold text-slate-700 block mb-1">Date</label>
              <DatePickerInput
                value={paymentDate}
                onChange={(val) => setPaymentDate(val)}
                className="w-full"
              />
            </div>
          </div>

          {/* Unpaid Invoices & Allocation Table */}
          {selectedParty && pendingInvoices.length > 0 && paymentPurpose === 'settle_due' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-xs font-bold text-slate-800 block">Pending Invoices to Settle</label>
                  <span className="text-[11px] text-slate-500">{pendingInvoices.length} unpaid bill(s) found</span>
                </div>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-bold">
                  <button
                    type="button"
                    onClick={() => {
                      setAllocationMode('auto');
                      setManualAllocations({});
                    }}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      allocationMode === 'auto' ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Auto (FIFO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setAllocationMode('manual')}
                    className={`px-2.5 py-1 rounded-md text-[11px] transition-all ${
                      allocationMode === 'manual' ? "bg-white text-indigo-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Manual Select
                  </button>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold">
                    <tr>
                      {allocationMode === 'manual' && <th className="py-2.5 px-3 w-8"></th>}
                      <th className="py-2.5 px-3">Invoice # / Date</th>
                      <th className="py-2.5 px-3 text-right">Balance Due</th>
                      <th className="py-2.5 px-3 text-right">Pay Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium">
                    {allocations.map((inv) => {
                      const isAllocated = (inv.allocated || 0) > 0;
                      return (
                        <tr key={inv.id} className={isAllocated ? "bg-indigo-50/20" : ""}>
                          {allocationMode === 'manual' && (
                            <td className="py-2.5 px-3">
                              <input
                                type="checkbox"
                                checked={isAllocated}
                                onChange={() => handleToggleInvoiceManual(inv.realId, inv.pending)}
                                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                              />
                            </td>
                          )}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center justify-between gap-1">
                              <span className="font-bold text-slate-900 font-mono">{inv.id}</span>
                              <button
                                type="button"
                                onClick={() => handleOpenInvoiceDetails(inv.realId || inv.id)}
                                className="p-1 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                                title="View full invoice details"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400">{inv.date ? new Date(inv.date).toLocaleDateString() : ""}</span>
                          </td>
                          <td className="py-2.5 px-3 text-right font-semibold text-rose-600">
                            {formatCurrency(inv.pending)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            {allocationMode === 'manual' ? (
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-[11px] text-slate-400">{currency.symbol}</span>
                                <input
                                  type="number"
                                  value={manualAllocations[inv.realId] ?? ""}
                                  placeholder="0.00"
                                  onChange={(e) => handleManualAmountChange(inv.realId, e.target.value, inv.pending)}
                                  className="w-20 h-7 px-2 text-xs font-bold text-right border border-slate-300 rounded-md focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                                />
                              </div>
                            ) : (
                              <span className={`font-bold ${isAllocated ? "text-emerald-700" : "text-slate-400"}`}>
                                {isAllocated ? formatCurrency(inv.allocated) : "—"}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {selectedParty && Number(paymentAmount) > 0 && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Live Fund Audit & Calculation</span>
              {paymentPurpose === 'wallet_debit' ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Available Wallet Balance:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(walletBalance)}</span>
                  </div>
                  <div className="flex justify-between text-rose-700 font-semibold">
                    <span>Debit / Withdrawal Amount:</span>
                    <span className="font-black">-{formatCurrency(Number(paymentAmount))}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-200">
                    <span>Balance After Debit:</span>
                    <span className={`font-black ${walletBalance - Number(paymentAmount) >= 0 ? "text-slate-900" : "text-rose-600"}`}>
                      {formatCurrency(Math.max(0, walletBalance - Number(paymentAmount)))}
                    </span>
                  </div>
                  {Number(paymentAmount) > walletBalance && (
                    <p className="text-[11px] font-bold text-rose-600 pt-1">
                      ⚠️ Insufficient balance! Maximum debit allowed is {formatCurrency(walletBalance)}.
                    </p>
                  )}
                </div>
              ) : paymentPurpose === 'wallet_topup' ? (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Direct Deposit to Wallet:</span>
                    <span className="font-bold text-purple-700">+{formatCurrency(Number(paymentAmount))}</span>
                  </div>
                  <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-200">
                    <span>New Wallet Balance:</span>
                    <span className="text-emerald-700 font-black">{formatCurrency(walletBalance + Number(paymentAmount))}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Applied to Invoices Due:</span>
                    <span className="font-bold text-slate-900">{formatCurrency(totalAllocated)}</span>
                  </div>
                  {remainingAdvance > 0 && (
                    <div className="flex justify-between text-purple-700 font-semibold">
                      <span>Surplus Credited to Wallet:</span>
                      <span className="font-black">+{formatCurrency(remainingAdvance)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-800 font-bold pt-1 border-t border-slate-200">
                    <span>Remaining Due:</span>
                    <span className="text-rose-700 font-black">
                      {formatCurrency(Math.max(0, (partySummary?.total_pending_due || 0) - totalAllocated))}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1">Notes / Remarks</label>
            <textarea 
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="e.g. advance deposit, bill settlement, or cash payout reason"
              className="w-full border border-slate-300 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 min-h-[70px]"
            />
          </div>
          
        </div>

        {/* Drawer Footer */}
        <div className="p-4 border-t border-slate-200 flex gap-3 bg-white">
          <button 
            onClick={() => setIsRecordingPayment(false)}
            disabled={isProcessing}
            className="flex-1 py-3 border border-slate-200 text-slate-700 font-bold rounded-xl hover:bg-slate-50 text-sm disabled:opacity-50"
          >
            Cancel
          </button>
          <button 
            onClick={handleProcessPayment}
            disabled={isProcessing || (paymentPurpose === 'wallet_debit' && Number(paymentAmount) > walletBalance)}
            className={`flex-1 py-3 font-bold rounded-xl text-sm shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 transition-all ${
              paymentPurpose === 'wallet_debit'
                ? "bg-rose-600 hover:bg-rose-700 text-white"
                : paymentPurpose === 'wallet_topup'
                ? "bg-purple-600 hover:bg-purple-700 text-white"
                : "bg-indigo-600 hover:bg-indigo-700 text-white"
            }`}
          >
            {isProcessing ? (
              <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> Processing...</>
            ) : paymentPurpose === 'wallet_debit' ? (
              `💸 Debit Wallet (${formatCurrency(Number(paymentAmount) || 0)})`
            ) : paymentPurpose === 'wallet_topup' ? (
              `💰 Add Funds (+${formatCurrency(Number(paymentAmount) || 0)})`
            ) : (
              `Save & Settle (${formatCurrency(Number(paymentAmount) || 0)})`
            )}
          </button>
        </div>
      </div>

      {/* ACTUAL INVOICE DETAILS & PURCHASE BREAKDOWN MODAL */}
      {viewingInvoice && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-100 bg-slate-50/80">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900 font-mono">Invoice #{viewingInvoice.invoice_number}</h3>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                      viewingInvoice.status === "paid"
                        ? "bg-emerald-100 text-emerald-800"
                        : viewingInvoice.status === "partially_paid"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-rose-100 text-rose-800"
                    }`}>
                      {viewingInvoice.status?.replace("_", " ")}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 font-medium">
                    Issued on {viewingInvoice.invoice_date ? new Date(viewingInvoice.invoice_date).toLocaleDateString() : "N/A"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingInvoice(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 text-slate-800">
              {/* Customer & Billing Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Customer / Billed To</span>
                  <p className="font-bold text-slate-900 text-sm">{viewingInvoice.customer_name || "Walk-in Customer"}</p>
                  {viewingInvoice.customer_phone && (
                    <p className="text-slate-500 font-mono mt-0.5">📞 {viewingInvoice.customer_phone}</p>
                  )}
                  {viewingInvoice.customer_address && (
                    <p className="text-slate-500 mt-0.5">{viewingInvoice.customer_address}</p>
                  )}
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Payment Status</span>
                  <p className={`font-black text-sm ${
                    Number(viewingInvoice.balance_due) <= 0 ? "text-emerald-600" : "text-amber-700"
                  }`}>
                    {Number(viewingInvoice.balance_due) <= 0 ? "Fully Paid" : `Pending Due: ${formatCurrency(Number(viewingInvoice.balance_due) || 0)}`}
                  </p>
                  <p className="text-slate-500 mt-0.5">Total Paid: {formatCurrency(Number(viewingInvoice.amount_paid) || 0)}</p>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Purchased Items & Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                      <tr>
                        <th className="py-2.5 px-3">Item / Description</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Tax</th>
                        <th className="py-2.5 px-3 text-right">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!viewingInvoice.lines && !viewingInvoice.items) || (viewingInvoice.lines?.length === 0 && viewingInvoice.items?.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">No itemized lines recorded for this invoice.</td>
                        </tr>
                      ) : (
                        (viewingInvoice.lines || viewingInvoice.items || []).map((item: any, i: number) => (
                          <tr key={item.id || i} className="hover:bg-slate-50/50">
                            <td className="py-2.5 px-3 font-semibold text-slate-900">
                              {item.item_name || item.product_name || item.description || `Item #${i + 1}`}
                            </td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                              {item.quantity}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-600">
                              {formatCurrency(Number(item.unit_price) || 0)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-slate-500">
                              {Number(item.tax_rate) > 0 ? `${item.tax_rate}%` : "—"}
                            </td>
                            <td className="py-2.5 px-3 text-right font-black text-slate-900">
                              {formatCurrency(Number(item.total_amount ?? item.line_total ?? item.subtotal ?? (Number(item.quantity || 1) * Number(item.unit_price || 0))) || 0)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="p-4 bg-slate-900 text-white rounded-xl space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Subtotal:</span>
                  <span className="font-bold text-white">{formatCurrency(Number(viewingInvoice.subtotal) || 0)}</span>
                </div>
                {Number(viewingInvoice.tax_amount) > 0 && (
                  <div className="flex justify-between text-slate-400">
                    <span>Tax (GST/VAT):</span>
                    <span className="font-bold text-white">+{formatCurrency(Number(viewingInvoice.tax_amount) || 0)}</span>
                  </div>
                )}
                {Number(viewingInvoice.discount_amount) > 0 && (
                  <div className="flex justify-between text-purple-300">
                    <span>Discount:</span>
                    <span className="font-bold">-{formatCurrency(Number(viewingInvoice.discount_amount) || 0)}</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-black pt-2 border-t border-slate-800">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(Number(viewingInvoice.total_amount || viewingInvoice.grand_total) || 0)}</span>
                </div>
                <div className="flex justify-between text-xs font-bold pt-1 border-t border-slate-800/80 text-emerald-400">
                  <span>Amount Paid:</span>
                  <span>{formatCurrency(Number(viewingInvoice.amount_paid) || 0)}</span>
                </div>
                {Number(viewingInvoice.balance_due) > 0 && (
                  <div className="flex justify-between text-xs font-black text-amber-400">
                    <span>Outstanding Due:</span>
                    <span>{formatCurrency(Number(viewingInvoice.balance_due) || 0)}</span>
                  </div>
                )}
              </div>

              {/* Invoice Payments History (if any) */}
              {viewingInvoice.payments && viewingInvoice.payments.length > 0 && (
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">Recorded Payments on this Invoice</h4>
                  <div className="space-y-1.5">
                    {viewingInvoice.payments.map((p: any, idx: number) => (
                      <div key={p.id || idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="font-bold text-slate-900 capitalize">{p.payment_method || "Payment"}</span>
                          <span className="text-[10px] text-slate-400">({p.payment_date ? new Date(p.payment_date).toLocaleDateString() : ""})</span>
                        </div>
                        <span className="font-black text-emerald-700">+{formatCurrency(Number(p.amount) || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Modal Actions Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-between items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const billData = {
                    invoice_number: viewingInvoice.invoice_number || `INV-${viewingInvoice.id?.substring(0, 6)}`,
                    date: viewingInvoice.invoice_date || new Date().toISOString(),
                    customerName: viewingInvoice.customer_name || "Customer",
                    customerPhone: viewingInvoice.customer_phone || "",
                    total: Number(viewingInvoice.total_amount || viewingInvoice.grand_total || 0),
                    subtotal: Number(viewingInvoice.subtotal || 0),
                    tax: Number(viewingInvoice.tax_amount || 0),
                    discount: Number(viewingInvoice.discount_amount || 0),
                    payment_method: viewingInvoice.payment_terms || "Cash",
                    amount_received: Number(viewingInvoice.amount_paid || 0),
                    items: (viewingInvoice.lines || viewingInvoice.items || []).map((l: any, idx: number) => ({
                      name: l.item_name || l.product_name || l.description || `Item #${idx + 1}`,
                      quantity: Number(l.quantity) || 1,
                      price: Number(l.unit_price) || 0,
                      subtotal: Number(l.total_amount || l.line_total || (Number(l.quantity || 1) * Number(l.unit_price || 0))) || 0,
                    }))
                  };
                  setPrintedPayment(billData);
                  setTimeout(() => {
                    triggerThermalPrint();
                  }, 100);
                }}
                className="py-2.5 px-4 bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
              >
                <Printer className="w-3.5 h-3.5" /> Print Receipt
              </button>
              <div className="flex gap-2">
                {Number(viewingInvoice.balance_due) > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      const cust = parties.find(p => p.name === viewingInvoice.customer_name || p.id === viewingInvoice.customer_id);
                      if (cust) {
                        handleSelectParty(cust);
                      }
                      setPaymentAmount(Number(viewingInvoice.balance_due));
                      setPaymentPurpose('settle_due');
                      setIsRecordingPayment(true);
                      setViewingInvoice(null);
                    }}
                    className="py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-xs transition-colors"
                  >
                    <DollarSign className="w-3.5 h-3.5" /> Settle Due ({formatCurrency(Number(viewingInvoice.balance_due))})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setViewingInvoice(null)}
                  className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
    </div>
  );
}
