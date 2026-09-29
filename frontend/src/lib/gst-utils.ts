// ─────────────────────────────────────────────────────────────
// GST Utilities: State Detection, Tax Splitting & Rate Breakdown
// ─────────────────────────────────────────────────────────────

export interface GstStateInfo {
  code: string;
  name: string;
}

export const INDIAN_GST_STATES: Record<string, string> = {
  "01": "Jammu and Kashmir",
  "02": "Himachal Pradesh",
  "03": "Punjab",
  "04": "Chandigarh",
  "05": "Uttarakhand",
  "06": "Haryana",
  "07": "Delhi",
  "08": "Rajasthan",
  "09": "Uttar Pradesh",
  "10": "Bihar",
  "11": "Sikkim",
  "12": "Arunachal Pradesh",
  "13": "Nagaland",
  "14": "Manipur",
  "15": "Mizoram",
  "16": "Tripura",
  "17": "Meghalaya",
  "18": "Assam",
  "19": "West Bengal",
  "20": "Jharkhand",
  "21": "Odisha",
  "22": "Chhattisgarh",
  "23": "Madhya Pradesh",
  "24": "Gujarat",
  "26": "Dadra and Nagar Haveli and Daman and Diu",
  "27": "Maharashtra",
  "29": "Karnataka",
  "30": "Goa",
  "31": "Lakshadweep",
  "32": "Kerala",
  "33": "Tamil Nadu",
  "34": "Puducherry",
  "35": "Andaman and Nicobar Islands",
  "36": "Telangana",
  "37": "Andhra Pradesh",
  "38": "Ladakh",
  "97": "Other Territory",
};

/**
 * Extract 2-digit GST state code and state name from GSTIN, State Name, or Address.
 */
export function extractGstState(
  gstin?: string | null,
  address?: string | null,
  stateHint?: string | null
): GstStateInfo {
  // 1. Check GSTIN first (first 2 digits)
  const cleanGst = (gstin || "").trim().toUpperCase();
  if (cleanGst.length >= 2) {
    const code = cleanGst.slice(0, 2);
    if (/^\d{2}$/.test(code) && INDIAN_GST_STATES[code]) {
      return { code, name: INDIAN_GST_STATES[code] };
    }
  }

  // 2. Check explicit 2-digit code passed as stateHint
  const cleanHint = (stateHint || "").trim();
  if (/^\d{2}$/.test(cleanHint) && INDIAN_GST_STATES[cleanHint]) {
    return { code: cleanHint, name: INDIAN_GST_STATES[cleanHint] };
  }

  // 3. Search combined text for state names, city names, and standard abbreviations
  const combinedText = ` ${stateHint || ""} ${address || ""} `.toLowerCase();

  const patterns: Array<{ regex: RegExp; code: string }> = [
    { regex: /[\s,.-](telangana|tg|ts|hyderabad|warangal|secunderabad|karimnagar|khammam|nizamabad)[\s,.-]/i, code: "36" },
    { regex: /[\s,.-](andhra\s*pradesh|andhra|ap|visakhapatnam|vizag|vijayawada|guntur|nellore|tirupati|kurnool|kakinada|proddatur|kadapa|anantapur|rajahmundry)[\s,.-]/i, code: "37" },
    { regex: /[\s,.-](karnataka|ka|bengaluru|bangalore|mysore|mysuru|hubli|dharwad|mangalore|mangaluru|belgaum|belagavi)[\s,.-]/i, code: "29" },
    { regex: /[\s,.-](tamil\s*nadu|tamilnadu|tn|chennai|madurai|coimbatore|salem|trichy|tiruchirappalli|tirunelveli)[\s,.-]/i, code: "33" },
    { regex: /[\s,.-](maharashtra|mh|mumbai|pune|nagpur|nashik|thane|aurangabad|solapur|navi\s*mumbai)[\s,.-]/i, code: "27" },
    { regex: /[\s,.-](delhi|new\s*delhi|nct|dl)[\s,.-]/i, code: "07" },
    { regex: /[\s,.-](uttar\s*pradesh|up|lucknow|kanpur|varanasi|noida|ghaziabad|agra|prayagraj|allahabad|meerut)[\s,.-]/i, code: "09" },
    { regex: /[\s,.-](kerala|kl|kochi|cochin|thiruvananthapuram|trivandrum|kozhikode|calicut|thrissur)[\s,.-]/i, code: "32" },
    { regex: /[\s,.-](gujarat|gj|ahmedabad|surat|vadodara|baroda|rajkot|gandhinagar|bhavnagar)[\s,.-]/i, code: "24" },
    { regex: /[\s,.-](rajasthan|rj|jaipur|jodhpur|udaipur|kota|bikaner|ajmer)[\s,.-]/i, code: "08" },
    { regex: /[\s,.-](west\s*bengal|wb|kolkata|calcutta|howrah|siliguri|durgapur|asansol)[\s,.-]/i, code: "19" },
    { regex: /[\s,.-](madhya\s*pradesh|mp|bhopal|indore|gwalior|jabalpur|ujjain)[\s,.-]/i, code: "23" },
    { regex: /[\s,.-](punjab|pb|chandigarh|ludhiana|amritsar|jalandhar|patiala)[\s,.-]/i, code: "03" },
    { regex: /[\s,.-](haryana|hr|gurgaon|gurugram|faridabad|panipat|ambala)[\s,.-]/i, code: "06" },
    { regex: /[\s,.-](bihar|br|patna|gaya|bhagalpur|muzaffarpur)[\s,.-]/i, code: "10" },
    { regex: /[\s,.-](odisha|orissa|or|od|bhubaneswar|cuttack|rourkela)[\s,.-]/i, code: "21" },
    { regex: /[\s,.-](jharkhand|jh|ranchi|jamshedpur|dhanbad|bokaro)[\s,.-]/i, code: "20" },
    { regex: /[\s,.-](chhattisgarh|cg|ct|raipur|bilaspur|bhilai|durg)[\s,.-]/i, code: "22" },
    { regex: /[\s,.-](assam|as|guwahati|silchar|dibrugarh)[\s,.-]/i, code: "18" },
    { regex: /[\s,.-](jammu|kashmir|j&k|jk|srinagar)[\s,.-]/i, code: "01" },
    { regex: /[\s,.-](himachal\s*pradesh|hp|shimla|dharamshala)[\s,.-]/i, code: "02" },
    { regex: /[\s,.-](uttarakhand|uk|ua|dehradun|haridwar|rishikesh)[\s,.-]/i, code: "05" },
    { regex: /[\s,.-](goa|ga|panaji|margao)[\s,.-]/i, code: "30" },
    { regex: /[\s,.-](puducherry|pondicherry|py)[\s,.-]/i, code: "34" },
    { regex: /[\s,.-](chandigarh|ch)[\s,.-]/i, code: "04" },
    { regex: /[\s,.-](ladakh|la|leh)[\s,.-]/i, code: "38" },
    { regex: /[\s,.-](sikkim|sk|gangtok)[\s,.-]/i, code: "11" },
    { regex: /[\s,.-](arunachal\s*pradesh|ar|itanagar)[\s,.-]/i, code: "12" },
    { regex: /[\s,.-](manipur|mn|imphal)[\s,.-]/i, code: "14" },
    { regex: /[\s,.-](meghalaya|ml|shillong)[\s,.-]/i, code: "17" },
    { regex: /[\s,.-](mizoram|mz|aizawl)[\s,.-]/i, code: "15" },
    { regex: /[\s,.-](nagaland|nl|kohima)[\s,.-]/i, code: "13" },
    { regex: /[\s,.-](tripura|tr|agartala)[\s,.-]/i, code: "16" },
  ];

  for (const p of patterns) {
    if (p.regex.test(combinedText)) {
      return { code: p.code, name: INDIAN_GST_STATES[p.code] || "State" };
    }
  }

  return { code: "37", name: "Andhra Pradesh" };
}

/**
 * Determine whether an invoice transaction is Inter-State (IGST) or Intra-State (CGST + SGST).
 */
export function checkIsInterstate(
  seller: { gstin?: string | null; state?: string | null; address?: string | null },
  customer: { gstin?: string | null; state?: string | null; address?: string | null }
): { isInterState: boolean; sellerState: GstStateInfo; customerState: GstStateInfo } {
  const sellerState = extractGstState(seller.gstin, seller.address, seller.state);
  const customerState = extractGstState(customer.gstin, customer.address, customer.state);

  const isInterState = sellerState.code !== customerState.code;
  return { isInterState, sellerState, customerState };
}

export interface GstTaxBreakdownItem {
  id?: string;
  name: string;
  hsn: string;
  taxRate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface GstSlabBreakdown {
  rate: number;
  taxableAmount: number;
  cgstRate: number;
  cgstAmount: number;
  sgstRate: number;
  sgstAmount: number;
  igstRate: number;
  igstAmount: number;
  totalTax: number;
}

export interface GstBreakdownResult {
  isInterState: boolean;
  sellerState: GstStateInfo;
  customerState: GstStateInfo;
  itemsBreakdown: GstTaxBreakdownItem[];
  slabsBreakdown: GstSlabBreakdown[];
  totalTaxable: number;
  totalCgst: number;
  totalSgst: number;
  totalIgst: number;
  totalTax: number;
}

/**
 * Calculate comprehensive product-wise and slab-wise GST breakdown.
 */
export function computeGstBreakdown(
  items: Array<{
    id?: string;
    product_name?: string;
    name?: string;
    hsn_code?: string;
    hsn?: string;
    quantity?: number;
    unit_price?: number;
    price?: number;
    discount_value?: number;
    discount_type?: string;
    discount?: number;
    tax_rate?: number;
    tax_percent?: number;
    is_tax_inclusive?: boolean;
    subtotal?: number;
  }>,
  isInterState: boolean,
  sellerState?: GstStateInfo,
  customerState?: GstStateInfo
): GstBreakdownResult & { bySlab: GstSlabBreakdown[]; byProduct: GstTaxBreakdownItem[] } {
  const resolvedSellerState = sellerState || { code: "37", name: "Andhra Pradesh" };
  const resolvedCustomerState = customerState || (isInterState ? { code: "36", name: "Telangana" } : resolvedSellerState);

  const itemsBreakdown: GstTaxBreakdownItem[] = [];
  const slabMap: Record<number, GstSlabBreakdown> = {};

  let totalTaxable = 0;
  let totalCgst = 0;
  let totalSgst = 0;
  let totalIgst = 0;
  let totalTax = 0;

  items.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const price = Number(item.unit_price ?? item.price ?? 0);
    const taxRate = Number(item.tax_rate ?? item.tax_percent ?? 0);
    const lineGross = qty * price;

    let disc = 0;
    if (item.discount_type === "percent") {
      disc = (lineGross * Number(item.discount_value || 0)) / 100;
    } else if (item.discount_value) {
      disc = Number(item.discount_value);
    } else if (item.discount) {
      disc = Number(item.discount);
    }

    const effectiveGross = Math.max(0, lineGross - disc);
    let lineTaxable = 0;
    let lineTax = 0;

    if (item.is_tax_inclusive && taxRate > 0) {
      lineTaxable = effectiveGross / (1 + taxRate / 100);
      lineTax = effectiveGross - lineTaxable;
    } else if (taxRate > 0) {
      lineTaxable = effectiveGross;
      lineTax = (effectiveGross * taxRate) / 100;
    } else {
      lineTaxable = effectiveGross;
      lineTax = 0;
    }

    const cgstRate = !isInterState && taxRate > 0 ? taxRate / 2 : 0;
    const sgstRate = !isInterState && taxRate > 0 ? taxRate / 2 : 0;
    const igstRate = isInterState && taxRate > 0 ? taxRate : 0;

    const cgstAmount = !isInterState ? lineTax / 2 : 0;
    const sgstAmount = !isInterState ? lineTax / 2 : 0;
    const igstAmount = isInterState ? lineTax : 0;

    const breakdownItem: GstTaxBreakdownItem = {
      id: item.id,
      name: item.product_name || item.name || "Item",
      hsn: item.hsn_code || item.hsn || "9988",
      taxRate,
      taxableAmount: lineTaxable,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      totalTax: lineTax,
    };

    itemsBreakdown.push(breakdownItem);

    // Aggregate into slab map
    if (!slabMap[taxRate]) {
      slabMap[taxRate] = {
        rate: taxRate,
        taxableAmount: 0,
        cgstRate,
        cgstAmount: 0,
        sgstRate,
        sgstAmount: 0,
        igstRate,
        igstAmount: 0,
        totalTax: 0,
      };
    }

    slabMap[taxRate].taxableAmount += lineTaxable;
    slabMap[taxRate].cgstAmount += cgstAmount;
    slabMap[taxRate].sgstAmount += sgstAmount;
    slabMap[taxRate].igstAmount += igstAmount;
    slabMap[taxRate].totalTax += lineTax;

    totalTaxable += lineTaxable;
    totalCgst += cgstAmount;
    totalSgst += sgstAmount;
    totalIgst += igstAmount;
    totalTax += lineTax;
  });

  const slabsBreakdown = Object.values(slabMap).sort((a, b) => a.rate - b.rate);

  return {
    isInterState,
    sellerState: resolvedSellerState,
    customerState: resolvedCustomerState,
    itemsBreakdown,
    slabsBreakdown,
    bySlab: slabsBreakdown,
    byProduct: itemsBreakdown,
    totalTaxable,
    totalCgst,
    totalSgst,
    totalIgst,
    totalTax,
  };
}
