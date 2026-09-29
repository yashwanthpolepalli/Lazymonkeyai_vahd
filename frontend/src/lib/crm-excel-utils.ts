import * as XLSX from "xlsx";
import Papa from "papaparse";

export interface ParsedLeadRow {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  status?: string;
  source?: string;
  estimated_value?: number;
  notes?: string;
  assigned_email?: string;
}

export interface ParsedCustomerRow {
  name: string;
  company_name?: string;
  email?: string;
  phone?: string;
  customer_type?: string;
  status?: string;
  address?: string;
  gst_number?: string;
  assigned_email?: string;
}

/**
 * Generates and downloads a pre-formatted Excel template (.xlsx) for Leads.
 */
export function downloadLeadsTemplateExcel() {
  const sampleData = [
    {
      "Name *": "Rajesh Kumar",
      "Company Name": "Apex Retail Pvt Ltd",
      "Email": "rajesh.kumar@apexretail.in",
      "Phone *": "+91 9876543210",
      "Status": "New",
      "Source": "Website Inquiry",
      "Estimated Value (INR)": 150000,
      "Notes": "Looking for Enterprise POS and multi-warehouse sync.",
      "Assigned Executive Email": "sales.exec@yourdomain.com",
    },
    {
      "Name *": "Priya Sharma",
      "Company Name": "Metro Supermarkets",
      "Email": "priya.s@metroretail.com",
      "Phone *": "+91 9123456780",
      "Status": "Contacted",
      "Source": "Direct Referral",
      "Estimated Value (INR)": 350000,
      "Notes": "Requested product demo on Friday 3 PM.",
      "Assigned Executive Email": "sales.exec@yourdomain.com",
    },
    {
      "Name *": "Amit Patel",
      "Company Name": "Gujarat Textiles Hub",
      "Email": "amit.patel@gtextiles.com",
      "Phone *": "+91 9988776655",
      "Status": "Qualified",
      "Source": "Cold Outreach",
      "Estimated Value (INR)": 500000,
      "Notes": "Interested in CRM calling automation and ERP GST billing.",
      "Assigned Executive Email": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  // Set column widths
  ws["!cols"] = [
    { wch: 20 }, // Name
    { wch: 25 }, // Company Name
    { wch: 30 }, // Email
    { wch: 18 }, // Phone
    { wch: 12 }, // Status
    { wch: 18 }, // Source
    { wch: 22 }, // Estimated Value
    { wch: 45 }, // Notes
    { wch: 30 }, // Assigned Executive Email
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Leads_Template");
  XLSX.writeFile(wb, "BusinessOS_Leads_Import_Template.xlsx");
}

/**
 * Generates and downloads a pre-formatted Excel template (.xlsx) for Customers.
 */
export function downloadCustomersTemplateExcel() {
  const sampleData = [
    {
      "Customer Name *": "Rohan Deshmukh",
      "Company Name": "Deshmukh Enterprises",
      "Email": "rohan@deshmukh.co",
      "Phone *": "+91 9823456789",
      "Customer Type": "Corporate",
      "Status": "Active",
      "GST Number": "27AAAAA0000A1Z5",
      "Address": "Plot 12, MIDC Industrial Area, Pune 411018",
      "Assigned Executive Email": "sales.exec@yourdomain.com",
    },
    {
      "Customer Name *": "Sneha Gupta",
      "Company Name": "Gupta Garments & Fashions",
      "Email": "sneha@guptagarments.in",
      "Phone *": "+91 9811223344",
      "Customer Type": "Retail",
      "Status": "Active",
      "GST Number": "07AAAAA0000A1Z5",
      "Address": "Shop 4, Commercial Complex, Connaught Place, New Delhi",
      "Assigned Executive Email": "",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(sampleData);
  ws["!cols"] = [
    { wch: 22 }, // Name
    { wch: 28 }, // Company Name
    { wch: 28 }, // Email
    { wch: 18 }, // Phone
    { wch: 15 }, // Customer Type
    { wch: 12 }, // Status
    { wch: 20 }, // GST Number
    { wch: 45 }, // Address
    { wch: 30 }, // Assigned Executive Email
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Customers_Template");
  XLSX.writeFile(wb, "BusinessOS_Customers_Import_Template.xlsx");
}

/**
 * Parses an uploaded Excel (.xlsx, .xls) or CSV file into Leads array.
 */
export async function parseLeadsFile(file: File): Promise<{ leads: ParsedLeadRow[]; errors: string[] }> {
  const errors: string[] = [];
  const leads: ParsedLeadRow[] = [];

  const fileName = file.name.toLowerCase();
  let rawRows: any[] = [];

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }

  rawRows.forEach((row, idx) => {
    // Look up fields with flexible key matching
    const name = row["Name *"] || row["Name"] || row["name"] || row["Lead Name"] || row["Contact Name"];
    const company_name = row["Company Name"] || row["Company"] || row["company_name"] || row["Organization"];
    const email = row["Email"] || row["email"] || row["Email Address"];
    const phone = row["Phone *"] || row["Phone"] || row["phone"] || row["Mobile"] || row["Contact Number"];
    const status = row["Status"] || row["status"] || "New";
    const source = row["Source"] || row["source"] || "Excel Import";
    const estimated_value_raw = row["Estimated Value (INR)"] || row["Estimated Value"] || row["estimated_value"] || row["Value"] || 0;
    const notes = row["Notes"] || row["notes"] || row["Comments"] || row["Description"];
    const assigned_email = row["Assigned Executive Email"] || row["Assigned Email"] || row["assigned_email"] || row["Owner Email"];

    if (!name || String(name).trim().length < 2) {
      errors.push(`Row ${idx + 2}: Missing or invalid Lead Name`);
      return;
    }

    leads.push({
      name: String(name).trim(),
      company_name: company_name ? String(company_name).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      status: ["New", "Contacted", "Qualified", "Proposal", "Won", "Lost"].includes(String(status).trim()) ? String(status).trim() : "New",
      source: source ? String(source).trim() : "Excel Import",
      estimated_value: Number(estimated_value_raw) || 0,
      notes: notes ? String(notes).trim() : undefined,
      assigned_email: assigned_email ? String(assigned_email).trim() : undefined,
    });
  });

  return { leads, errors };
}

/**
 * Parses an uploaded Excel or CSV file into Customers array.
 */
export async function parseCustomersFile(file: File): Promise<{ customers: ParsedCustomerRow[]; errors: string[] }> {
  const errors: string[] = [];
  const customers: ParsedCustomerRow[] = [];

  const fileName = file.name.toLowerCase();
  let rawRows: any[] = [];

  if (fileName.endsWith(".csv")) {
    const text = await file.text();
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true });
    rawRows = parsed.data;
  } else {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: "array" });
    const firstSheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[firstSheetName];
    rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "" });
  }

  rawRows.forEach((row, idx) => {
    const name = row["Customer Name *"] || row["Name *"] || row["Customer Name"] || row["Name"] || row["name"];
    const company_name = row["Company Name"] || row["Company"] || row["company_name"];
    const email = row["Email"] || row["email"];
    const phone = row["Phone *"] || row["Phone"] || row["phone"] || row["Mobile"];
    const customer_type = row["Customer Type"] || row["Type"] || row["customer_type"] || "Retail";
    const status = row["Status"] || row["status"] || "Active";
    const address = row["Address"] || row["address"] || row["Full Address"];
    const gst_number = row["GST Number"] || row["GSTIN"] || row["gst_number"];
    const assigned_email = row["Assigned Executive Email"] || row["assigned_email"] || row["Owner Email"];

    if (!name || String(name).trim().length < 2) {
      errors.push(`Row ${idx + 2}: Missing or invalid Customer Name`);
      return;
    }

    customers.push({
      name: String(name).trim(),
      company_name: company_name ? String(company_name).trim() : undefined,
      email: email ? String(email).trim() : undefined,
      phone: phone ? String(phone).trim() : undefined,
      customer_type: String(customer_type).trim(),
      status: String(status).trim(),
      address: address ? String(address).trim() : undefined,
      gst_number: gst_number ? String(gst_number).trim() : undefined,
      assigned_email: assigned_email ? String(assigned_email).trim() : undefined,
    });
  });

  return { customers, errors };
}
