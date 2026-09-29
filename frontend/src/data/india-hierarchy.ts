/**
 * India Administrative & Business Hierarchy Master
 * Extracted directly from India_Region_Zone_District_Branch_Hierarchy.xlsx
 * Structure: Country (India) -> Region (6) -> State / UT (36) -> Zone -> District -> Branch
 */

export interface IndiaRegion {
  code: string;
  name: string;
  purpose?: string;
}

export interface IndiaStateMaster {
  code: string;
  name: string;
  type: "State" | "Union Territory";
  region: string;
  zones: string[];
  district_count?: number;
}

export const INDIA_REGIONS: IndiaRegion[] = [
  { code: "R01", name: "North India", purpose: "Business/management grouping (Delhi, Haryana, HP, Punjab, Rajasthan, UP, UK, J&K, Ladakh, Chandigarh)" },
  { code: "R02", name: "South India", purpose: "Business/management grouping (Andhra Pradesh, Karnataka, Kerala, Tamil Nadu, Telangana, A&N, Lakshadweep, Puducherry)" },
  { code: "R03", name: "East India", purpose: "Business/management grouping (Bihar, Jharkhand, Odisha, West Bengal, Sikkim)" },
  { code: "R04", name: "West India", purpose: "Business/management grouping (Goa, Gujarat, Maharashtra, D&NH & Daman & Diu)" },
  { code: "R05", name: "Central India", purpose: "Business/management grouping (Chhattisgarh, Madhya Pradesh)" },
  { code: "R06", name: "North-East India", purpose: "Business/management grouping (Arunachal Pradesh, Assam, Manipur, Meghalaya, Mizoram, Nagaland, Tripura)" },
];

export const INDIA_STATES_MASTER: IndiaStateMaster[] = [
  { code: "S01", name: "Andhra Pradesh", type: "State", region: "South India", zones: ["Coastal Andhra", "Rayalaseema", "Visakhapatnam Zone", "Vijayawada-Guntur Zone"], district_count: 26 },
  { code: "S02", name: "Arunachal Pradesh", type: "State", region: "North-East India", zones: ["Eastern Arunachal", "Western Arunachal"], district_count: 27 },
  { code: "S03", name: "Assam", type: "State", region: "North-East India", zones: ["Upper Assam", "Lower Assam", "Guwahati Metro", "Barak Valley"], district_count: 35 },
  { code: "S04", name: "Bihar", type: "State", region: "East India", zones: ["North Bihar", "South Bihar", "Patna Urban", "Magadh Zone", "Mithila Zone"], district_count: 38 },
  { code: "S05", name: "Chhattisgarh", type: "State", region: "Central India", zones: ["North Chhattisgarh", "South Chhattisgarh", "Raipur-Bhilai Industrial Zone", "Bastar Zone"], district_count: 33 },
  { code: "S06", name: "Goa", type: "State", region: "West India", zones: ["North Goa", "South Goa"], district_count: 2 },
  { code: "S07", name: "Gujarat", type: "State", region: "West India", zones: ["North Gujarat", "South Gujarat", "Ahmedabad-Gandhinagar Metro", "Saurashtra-Kutch", "Central Gujarat"], district_count: 33 },
  { code: "S08", name: "Haryana", type: "State", region: "North India", zones: ["North Haryana", "South Haryana", "Gurugram-Faridabad NCR Zone", "Ambala-Karnal Zone"], district_count: 22 },
  { code: "S09", name: "Himachal Pradesh", type: "State", region: "North India", zones: ["Himachal North", "Himachal South", "Shimla Hills", "Kangra Valley"], district_count: 12 },
  { code: "S10", name: "Jharkhand", type: "State", region: "East India", zones: ["North Chotanagpur", "South Chotanagpur", "Ranchi Urban", "Kolhan Industrial Zone", "Santhal Pargana"], district_count: 24 },
  { code: "S11", name: "Karnataka", type: "State", region: "South India", zones: ["Bangalore Metropolitan (BMR)", "Coastal Karnataka (Karavali)", "North Karnataka (Kalyana-Belagavi)", "Old Mysore Zone"], district_count: 31 },
  { code: "S12", name: "Kerala", type: "State", region: "South India", zones: ["North Malabar", "Central Kerala (Kochi)", "Travancore (South Kerala)"], district_count: 14 },
  { code: "S13", name: "Madhya Pradesh", type: "State", region: "Central India", zones: ["Malwa (Indore-Ujjain)", "Mahakoshal (Jabalpur)", "Bhopal Central Zone", "Gwalior-Chambal", "Bundelkhand"], district_count: 55 },
  { code: "S14", name: "Maharashtra", type: "State", region: "West India", zones: ["Mumbai MMR (Greater Mumbai/Thane)", "Pune Division", "Vidarbha (Nagpur)", "Marathwada (Aurangabad/Nanded)", "North Maharashtra (Nashik/Jalgaon)", "Konkan Coastal"], district_count: 36 },
  { code: "S15", name: "Manipur", type: "State", region: "North-East India", zones: ["Imphal Valley", "Hill Districts"], district_count: 16 },
  { code: "S16", name: "Meghalaya", type: "State", region: "North-East India", zones: ["Khasi Hills (Shillong)", "Garo Hills", "Jaintia Hills"], district_count: 12 },
  { code: "S17", name: "Mizoram", type: "State", region: "North-East India", zones: ["North Mizoram (Aizawl)", "South Mizoram (Lunglei)"], district_count: 11 },
  { code: "S18", name: "Nagaland", type: "State", region: "North-East India", zones: ["Kohima-Dimapur Zone", "Eastern Nagaland"], district_count: 16 },
  { code: "S19", name: "Odisha", type: "State", region: "East India", zones: ["Coastal Odisha (Bhubaneswar/Cuttack)", "Western Odisha (Sambalpur/Rourkela)", "Southern Odisha (Berhampur)"], district_count: 30 },
  { code: "S20", name: "Punjab", type: "State", region: "North India", zones: ["Majha (Amritsar)", "Doaba (Jalandhar)", "Malwa (Ludhiana/Bathinda)"], district_count: 23 },
  { code: "S21", name: "Rajasthan", type: "State", region: "West India", zones: ["Jaipur-Dhundhar NCR", "Marwar (Jodhpur)", "Mewar (Udaipur)", "Shekhawati", "Hadoti (Kota)", "Bikaner Zone"], district_count: 50 },
  { code: "S22", name: "Sikkim", type: "State", region: "East India", zones: ["East-North Sikkim (Gangtok)", "South-West Sikkim (Namchi)"], district_count: 6 },
  { code: "S23", name: "Tamil Nadu", type: "State", region: "South India", zones: ["Chennai Metro Region", "Kongu Nadu (Coimbatore/Salem)", "Cauvery Delta (Trichy/Thanjavur)", "Southern Tamil Nadu (Madurai/Tirunelveli)"], district_count: 38 },
  { code: "S24", name: "Telangana", type: "State", region: "South India", zones: ["Hyderabad Metro (GHMC/Cyberabad)", "Northern Telangana (Warangal/Karimnagar/Nizamabad)", "Southern Telangana (Khammam/Mahabubnagar/Nalgonda)"], district_count: 33 },
  { code: "S25", name: "Tripura", type: "State", region: "North-East India", zones: ["West Tripura (Agartala)", "South-North Tripura Zone"], district_count: 8 },
  { code: "S26", name: "Uttar Pradesh", type: "State", region: "North India", zones: ["Western UP (Noida/Ghaziabad/Meerut NCR)", "Central UP (Lucknow/Kanpur)", "Eastern UP - Purvanchal (Varanasi/Gorakhpur/Prayagraj)", "Rohilkhand (Bareilly)", "Bundelkhand (Jhansi)"], district_count: 75 },
  { code: "S27", name: "Uttarakhand", type: "State", region: "North India", zones: ["Garhwal (Dehradun/Haridwar)", "Kumaon (Nainital/Haldwani)"], district_count: 13 },
  { code: "S28", name: "West Bengal", type: "State", region: "East India", zones: ["Kolkata Metropolitan Area (KMA)", "North Bengal (Siliguri/Darjeeling)", "South Bengal (Burdwan/Asansol/Howrah)", "Rarh-Medinipur Zone"], district_count: 23 },
  { code: "S29", name: "Andaman and Nicobar Islands", type: "Union Territory", region: "South India", zones: ["Andaman (Port Blair)", "Nicobar"], district_count: 3 },
  { code: "S30", name: "Chandigarh", type: "Union Territory", region: "North India", zones: ["Chandigarh Tri-City Metro"], district_count: 1 },
  { code: "S31", name: "Dadra and Nagar Haveli and Daman and Diu", type: "Union Territory", region: "West India", zones: ["Daman & Diu Coastal Zone", "Dadra & Nagar Haveli (Silvassa)"], district_count: 3 },
  { code: "S32", name: "Delhi (NCT)", type: "Union Territory", region: "North India", zones: ["Delhi Central-North", "Delhi South-East", "Delhi West-Southwest", "Trans-Yamuna East"], district_count: 11 },
  { code: "S33", name: "Jammu and Kashmir", type: "Union Territory", region: "North India", zones: ["Jammu Division", "Kashmir Division (Srinagar)"], district_count: 20 },
  { code: "S34", name: "Ladakh", type: "Union Territory", region: "North India", zones: ["Leh District Zone", "Kargil District Zone"], district_count: 2 },
  { code: "S35", name: "Lakshadweep", type: "Union Territory", region: "South India", zones: ["Lakshadweep Islands (Kavaratti)"], district_count: 1 },
  { code: "S36", name: "Puducherry", type: "Union Territory", region: "South India", zones: ["Puducherry & Karaikal Zone", "Mahe & Yanam Zone"], district_count: 4 },
];

/**
 * Returns list of States belonging to a given Region.
 */
export function getStatesByRegion(regionName?: string): IndiaStateMaster[] {
  if (!regionName || regionName === "all") return INDIA_STATES_MASTER;
  const clean = regionName.toLowerCase().trim();
  return INDIA_STATES_MASTER.filter(s => s.region.toLowerCase() === clean);
}

/**
 * Given a State name, returns its corresponding Region name.
 */
export function getRegionByState(stateName?: string): string | null {
  if (!stateName) return null;
  const clean = stateName.toLowerCase().trim();
  const found = INDIA_STATES_MASTER.find(s => s.name.toLowerCase() === clean || s.code.toLowerCase() === clean);
  return found ? found.region : null;
}

/**
 * Given a State name, returns suggested Zones for that State.
 */
export function getZonesByState(stateName?: string): string[] {
  if (!stateName) return [];
  const clean = stateName.toLowerCase().trim();
  const found = INDIA_STATES_MASTER.find(s => s.name.toLowerCase() === clean || s.code.toLowerCase() === clean);
  return found ? found.zones : [];
}

/**
 * Auto-generates a standard branch code proposal based on State, Zone, and sequence
 */
export function generateBranchCodeSuggestion(stateName: string, zoneName?: string, seq = 1): string {
  const cleanState = stateName?.trim() || "IN";
  const stateFound = INDIA_STATES_MASTER.find(s => s.name.toLowerCase() === cleanState.toLowerCase());
  const statePrefix = stateFound ? stateFound.code.replace("S", "ST-") : "BR";
  
  let zonePrefix = "GEN";
  if (zoneName) {
    const parts = zoneName.split(/[\s-]+/);
    zonePrefix = parts.map(p => p[0]?.toUpperCase()).join("").slice(0, 3) || "ZN";
  }
  
  const seqStr = String(seq).padStart(3, "0");
  return `${statePrefix}-${zonePrefix}-${seqStr}`;
}
