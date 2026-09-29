import { useCurrency } from "@/hooks/use-currency";

export const procurementSuppliers = [
  { id: "s1", code: "VEN-001", name: "Apple India Pvt Ltd", company: "Apple Inc.", type: "Manufacturer", products: "Electronics, Hardware", branches: 4, rating: 4.8, status: "Active", creditLimit: "₹50,00,000" },
  { id: "s2", code: "VEN-002", name: "Samsung Electronics", company: "Samsung", type: "Manufacturer", products: "Electronics", branches: 2, rating: 4.5, status: "Active", creditLimit: "₹25,00,000" },
  { id: "s3", code: "VEN-003", name: "Tata Consumer Products", company: "Tata Group", type: "Distributor", products: "Groceries, FMCG", branches: 8, rating: 4.9, status: "Active", creditLimit: "₹1,00,00,000" },
  { id: "s4", code: "VEN-004", name: "Nike India", company: "Nike Inc.", type: "Manufacturer", products: "Apparel, Footwear", branches: 3, rating: 4.2, status: "Active", creditLimit: "₹10,00,000" },
  { id: "s5", code: "VEN-005", name: "BlueDart Express", company: "BlueDart", type: "Service Provider", products: "Logistics", branches: 15, rating: 4.1, status: "Inactive", creditLimit: "₹5,00,000" },
];

export const procurementContracts = [
  { id: "c1", contractNo: "CNT-2026-001", supplier: "Apple India Pvt Ltd", startDate: "2026-01-01", endDate: "2026-12-31", value: "₹2,50,00,000", status: "Active" },
  { id: "c2", contractNo: "CNT-2026-002", supplier: "Tata Consumer Products", startDate: "2025-06-01", endDate: "2026-05-31", value: "₹5,00,00,000", status: "Expiring Soon" },
];

export const procurementPOs = [
  { id: "po1", poNo: "PO-2026-8812", supplier: "Apple India Pvt Ltd", date: "2026-07-01", amount: "₹85,50,000", items: 120, status: "Pending Approval" },
  { id: "po2", poNo: "PO-2026-8811", supplier: "Samsung Electronics", date: "2026-06-28", amount: "₹12,45,000", items: 45, status: "Approved" },
  { id: "po3", poNo: "PO-2026-8810", supplier: "Tata Consumer Products", date: "2026-06-25", amount: "₹4,20,000", items: 850, status: "Delivered" },
];

export const procurementGRNs = [
  { id: "grn1", grnNo: "GRN-2026-112", poNo: "PO-2026-8810", supplier: "Tata Consumer Products", received: 850, damaged: 2, status: "Completed" },
  { id: "grn2", grnNo: "GRN-2026-111", poNo: "PO-2026-8790", supplier: "Nike India", received: 120, damaged: 0, status: "Completed" },
];

export const procurementBills = [
  { id: "b1", billNo: "INV-APPL-992", poNo: "PO-2026-8812", supplier: "Apple India Pvt Ltd", amount: "₹85,50,000", dueDate: "2026-08-01", status: "Unpaid" },
  { id: "b2", billNo: "INV-TATA-112", poNo: "PO-2026-8810", supplier: "Tata Consumer Products", amount: "₹4,20,000", dueDate: "2026-07-15", status: "Paid" },
];

export const procurementAnalytics = {
  totalSpend: "₹45.2M",
  spendChange: "+12.5%",
  topSupplier: "Apple India Pvt Ltd",
  avgLeadTime: "4.2 Days",
  poVolume: 1245,
};
