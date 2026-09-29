/**
 * Shared Barcode SVG renderer — ISO/IEC 15417 Code-128 & GS1 EAN-13
 * Hardware-scannable: strict integer module widths, floor-accumulated X positions,
 * extending guard bars for EAN-13, and calibrated print dimensions.
 */
import { useMemo } from "react";
import {
  encodeCode128,
  encodeEAN13Structured,
  getHardwareScannableBarcode,
  type EAN13Structured,
} from "./code128";
import { useCurrency } from "@/hooks/use-currency";
import { getActiveBillingGst } from "./receipt-template-store";

export interface ProductBarcodeLike {
  product_name: string;
  barcode?: string | null;
  sku?: string | null;
  selling_price?: number | null;
  mrp?: number | null;
  category_name?: string | null;
  format?: string | null;
  batch_no?: string | null;
  mfg_lic_no?: string | null;
  pkd_date?: string | null;
  exp_date?: string | null;
  net_qty?: string | null;
  usp_rate?: string | null;
}

/**
 * Gs1Ean13Svg — Genuine GS1 EAN-13 Barcode with extending guard bars and dual-grouped digits.
 * Matches physical FMCG packaging standard (e.g. 8 904358 601259).
 */
/**
 * Gs1Ean13Svg — Genuine GS1 EAN-13 Barcode with extending guard bars and dual-grouped digits.
 * Strict ISO/IEC 15420 geometry: zero text overlap, proper quiet zones, crisp high contrast.
 */
export function Gs1Ean13Svg({
  code,
  height = 52,
  unitPx = 2,
}: {
  code: string;
  height?: number;
  unitPx?: number;
}) {
  const structured = useMemo<EAN13Structured>(() => {
    return encodeEAN13Structured(code || "8904358601259");
  }, [code]);

  const unit = Math.max(1, Math.round(unitPx || 2));
  const leftQuietWidth = 11 * unit; // 11 modules quiet zone
  const rightQuietWidth = 8 * unit;  // 8 modules quiet zone
  const barsWidth = 95 * unit; // 95 modules
  const svgWidth = leftQuietWidth + barsWidth + rightQuietWidth;

  const fontSize = Math.max(8.5, Math.min(11, Math.round(height * 0.22)));
  const textBaseline = height - 1.5;
  const barTop = 1;
  const dataBarHeight = Math.max(18, Math.round(height - fontSize - 5));
  const guardBarHeight = Math.min(height - 2, dataBarHeight + 5);

  let curX = leftQuietWidth;
  const barElements = structured.allBars.map((b, i) => {
    const w = b.width * unit;
    const x = curX;
    curX += w;
    if (!b.isBlack) return null;
    const h = b.isGuard ? guardBarHeight : dataBarHeight;
    return (
      <rect
        key={i}
        x={x}
        y={barTop}
        width={w}
        height={h}
        fill="#000000"
      />
    );
  });

  return (
    <div className="flex flex-col items-center justify-center bg-white p-0 rounded overflow-hidden select-none">
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        shapeRendering="crispEdges"
        style={{ display: "block", background: "#ffffff", imageRendering: "pixelated" }}
      >
        <rect width={svgWidth} height={height} fill="#ffffff" />
        <text
          x={Math.max(2, leftQuietWidth - 5 * unit)}
          y={textBaseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="'OCR-B', 'Courier New', monospace"
          fontWeight="bold"
          fill="#000000"
        >
          {structured.firstDigit}
        </text>
        {barElements}
        <text
          x={leftQuietWidth + Math.round(21 * unit)}
          y={textBaseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="'OCR-B', 'Courier New', monospace"
          fontWeight="bold"
          letterSpacing="0.8px"
          fill="#000000"
        >
          {structured.leftDigits}
        </text>
        <text
          x={leftQuietWidth + Math.round(68 * unit)}
          y={textBaseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="'OCR-B', 'Courier New', monospace"
          fontWeight="bold"
          letterSpacing="0.8px"
          fill="#000000"
        >
          {structured.rightDigits}
        </text>
        <text
          x={svgWidth - 4}
          y={textBaseline}
          textAnchor="middle"
          fontSize={Math.max(6.5, fontSize - 2)}
          fontFamily="monospace"
          fontWeight="bold"
          fill="#666666"
        >
          &gt;
        </text>
      </svg>
    </div>
  );
}

/**
 * Code128Svg — Hardware-Scannable ISO/IEC 15417 Code 128
 * Guaranteed clear margin above text baseline for flawless laser gun recognition.
 */
export function Code128Svg({
  code,
  width = 200,
  height = 52,
  unitPx = 2,
}: {
  code: string;
  width?: number;
  height?: number;
  unitPx?: number;
}) {
  const clean = (code || "SN-2026-0001").trim();
  const bars = useMemo(() => encodeCode128(clean), [clean]);
  const unit = Math.max(1, Math.round(unitPx || 2));
  const quietZone = 12 * unit;

  let totalModules = 0;
  bars.forEach((b) => (totalModules += b.width));

  const contentWidth = totalModules * unit;
  const svgWidth = Math.max(width, contentWidth + quietZone * 2);

  const fontSize = Math.max(8.5, Math.min(11, Math.round(height * 0.20)));
  const textBaseline = height - 1.5;
  const barTop = 1;
  const barHeight = Math.max(18, Math.round(height - fontSize - 5));

  let curX = quietZone;
  const barElements = bars.map((b, i) => {
    const w = b.width * unit;
    const x = curX;
    curX += w;
    if (!b.isBlack) return null;
    return (
      <rect
        key={i}
        x={x}
        y={barTop}
        width={w}
        height={barHeight}
        fill="#000000"
      />
    );
  });

  return (
    <div className="flex flex-col items-center justify-center bg-white p-0 rounded overflow-hidden select-none">
      <svg
        width={svgWidth}
        height={height}
        viewBox={`0 0 ${svgWidth} ${height}`}
        shapeRendering="crispEdges"
        style={{ display: "block", background: "#ffffff", imageRendering: "pixelated" }}
      >
        <rect width={svgWidth} height={height} fill="#ffffff" />
        {barElements}
        <text
          x={Math.round(svgWidth / 2)}
          y={textBaseline}
          textAnchor="middle"
          fontSize={fontSize}
          fontFamily="'Courier New', monospace"
          fontWeight="bold"
          letterSpacing="1px"
          fill="#000000"
        >
          {clean}
        </text>
      </svg>
    </div>
  );
}

/**
 * RealBarcodeSvg — Auto-detects GS1 EAN-13 (12/13 digits) vs Code-128
 */
export function RealBarcodeSvg({
  code,
  width = 200,
  height = 50,
  unitPx = 1.8,
}: {
  code: string;
  format?: string;
  width?: number;
  height?: number;
  unitPx?: number;
}) {
  const clean = (code || "").trim().replace(/\s/g, "");
  const isEan13 = /^\d{12,13}$/.test(clean);

  if (isEan13) {
    return <Gs1Ean13Svg code={clean} height={height} unitPx={unitPx} />;
  }

  return (
    <Code128Svg
      code={clean || "8904358601259"}
      width={width}
      height={height}
      unitPx={unitPx}
    />
  );
}

/**
 * FmcgProductLabelCard — Exact physical FMCG packaging label format matching the uploaded UrbanGabru photo.
 */
export function FmcgProductLabelCard({
  item,
  isPrint = false,
}: {
  item: ProductBarcodeLike;
  isPrint?: boolean;
}) {
  const barcode = item.barcode || "8904358601259";
  const mfgLic = item.mfg_lic_no || "MH/104643";
  const batchNo = item.batch_no || "173";
  const pkdDate = item.pkd_date || "11/2025";
  const expDate = item.exp_date || "10/2028";
  const mrp = item.mrp || item.selling_price || 399;
  const netQty = item.net_qty || "10 g (0.33 oz)";
  const uspRate = item.usp_rate || `₹${(mrp / 10).toFixed(2)} per g`;

  return (
    <div
      className={`bg-black text-white rounded-lg p-3 font-sans shadow-md flex flex-col justify-between select-none ${
        isPrint ? "w-[50mm] h-[48mm] border border-black" : "w-full max-w-sm"
      }`}
    >
      {/* Product Spec Table */}
      <div className="text-[10px] leading-tight space-y-0.5 font-medium">
        <div className="flex justify-between">
          <span className="text-slate-300">Mfg Lic. No</span>
          <span className="font-mono font-bold">: {mfgLic}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Batch No.</span>
          <span className="font-mono font-bold">: {batchNo}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Pkd On Date</span>
          <span className="font-mono font-bold">: {pkdDate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Exp. Date</span>
          <span className="font-mono font-bold">: {expDate}</span>
        </div>
        <div className="flex justify-between font-bold text-amber-400">
          <span>MRP. Rs.</span>
          <span>: ₹{Number(mrp).toFixed(2)} (Incl. of all taxes)</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">USP: Rs.</span>
          <span>: {uspRate}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-slate-300">Net Qty</span>
          <span className="font-bold">: {netQty}</span>
        </div>
      </div>

      {/* Embedded Hardware Scannable EAN-13 Barcode */}
      <div className="bg-white p-1 rounded mt-1.5 flex items-center justify-center">
        <RealBarcodeSvg code={barcode} height={46} unitPx={1.8} />
      </div>

      {/* GMP Certified / Brand Note */}
      <div className="text-[8px] text-slate-400 text-center mt-1 border-t border-slate-800 pt-0.5">
        GMP Certified · Keep in cool, dry place
      </div>
    </div>
  );
}

/**
 * Helper to dynamically resolve active organization / workspace name
 */
export function resolveOrgName(orgName?: string, templateStoreName?: string): string {
  // 1. Explicitly passed from useTenant()
  if (orgName && orgName.trim() && !orgName.toUpperCase().includes("LAZYMONKEY")) {
    return orgName.trim().toUpperCase();
  }

  // 2. Check active billing company / GST registration
  if (typeof window !== "undefined") {
    try {
      const activeGst = getActiveBillingGst();
      if (activeGst?.trade_name && !activeGst.trade_name.toUpperCase().includes("LAZYMONKEY") && !activeGst.trade_name.toUpperCase().includes("STORE")) {
        return activeGst.trade_name.trim().toUpperCase();
      }
      if (activeGst?.legal_name && !activeGst.legal_name.toUpperCase().includes("LAZYMONKEY") && !activeGst.legal_name.toUpperCase().includes("STORE")) {
        return activeGst.legal_name.trim().toUpperCase();
      }

      const bosTenant = localStorage.getItem("bos-tenant");
      if (bosTenant) {
        const parsed = JSON.parse(bosTenant);
        const name = parsed?.name || parsed?.slug;
        if (name && name.trim() && !name.toUpperCase().includes("LAZYMONKEY")) {
          return name.trim().toUpperCase();
        }
      }

      const bosAuth = localStorage.getItem("bos-auth");
      if (bosAuth) {
        const parsed = JSON.parse(bosAuth);
        const name = parsed?.user?.tenantName || (parsed?.user as any)?.tenant_name || parsed?.tenant?.name || parsed?.user?.companyName;
        if (name && name.trim() && !name.toUpperCase().includes("LAZYMONKEY")) {
          return name.trim().toUpperCase();
        }
      }
    } catch {}
  }

  // 3. User-customized template store name (excluding legacy defaults and placeholders)
  if (
    templateStoreName &&
    templateStoreName.trim() &&
    !templateStoreName.toUpperCase().includes("LAZYMONKEY") &&
    templateStoreName.toUpperCase() !== "RETAIL STORE" &&
    templateStoreName.toUpperCase() !== "LOGISTICS STORE" &&
    templateStoreName.toUpperCase() !== "GLOBAL LOGISTICS NETWORK" &&
    templateStoreName.toUpperCase() !== "MY STORE" &&
    templateStoreName.toUpperCase() !== "STORE" &&
    templateStoreName.toUpperCase() !== "ORGANIZATION"
  ) {
    return templateStoreName.trim().toUpperCase();
  }

  if (orgName && orgName.trim()) {
    return orgName.trim().toUpperCase();
  }

  return "VENATIC";
}

/**
 * SingleBarcodeLabelCard — renders a single product barcode label per template.
 */
export function SingleBarcodeLabelCard({
  item,
  template,
  isPrint = false,
  orgName,
}: {
  item: ProductBarcodeLike;
  template: any;
  isPrint?: boolean;
  orgName?: string;
}) {
  const { currency } = useCurrency();
  const f = template?.fields || {};
  const storeName = resolveOrgName(orgName, template?.storeName);

  const sellingPrice = item.selling_price != null && Number(item.selling_price) > 0 ? `${currency.symbol}${Number(item.selling_price).toFixed(2)}` : "";
  const mrp = item.mrp != null && Number(item.mrp) > 0 ? `${currency.symbol}${Number(item.mrp).toFixed(2)}` : "";

  return (
    <div
      className={`bg-white text-black border border-slate-300 rounded ${
        isPrint ? "p-0.5 h-[21.5mm] max-h-[21.5mm] w-full" : "p-2.5 min-h-[160px]"
      } flex flex-col justify-between font-sans shadow-xs select-none overflow-hidden box-border`}
    >
      {/* Company Header */}
      {f.showCompanyName !== false && (
        <div className="flex items-center justify-between border-b border-slate-300 pb-0.5 mb-0.5">
          <span
            className={`font-black ${
              isPrint ? "text-[7.5px]" : "text-[11px]"
            } tracking-wider uppercase truncate`}
            style={{ color: template?.primaryColor || "#0f172a" }}
          >
            {storeName}
          </span>
          {f.showCategoryBrand !== false && item.category_name && (
            <span
              className={`font-semibold text-slate-500 uppercase ${
                isPrint ? "text-[6px]" : "text-[8.5px]"
              } truncate ml-1`}
            >
              {item.category_name}
            </span>
          )}
        </div>
      )}

      {/* Product Name & SKU / Pricing in Compact Rows */}
      <div className="min-w-0 space-y-0.5">
        {f.showProductName !== false && (
          <h4
            className={`font-black leading-tight text-slate-950 truncate ${
              isPrint ? "text-[8px]" : "text-[12px]"
            }`}
          >
            {item.product_name}
          </h4>
        )}
        <div className="flex items-baseline justify-between">
          {f.showSKU !== false && item.sku ? (
            <span
              className={`font-mono font-bold text-slate-700 truncate ${
                isPrint ? "text-[6px]" : "text-[9.5px]"
              }`}
            >
              SKU: {item.sku}
            </span>
          ) : (
            <span />
          )}
          <div className="flex items-baseline gap-1 shrink-0 ml-1">
            {sellingPrice ? (
              <span
                className={`font-black text-slate-950 ${
                  isPrint ? "text-[8.5px]" : "text-xs"
                }`}
              >
                {sellingPrice}
              </span>
            ) : mrp ? (
              <span
                className={`font-black text-slate-950 ${
                  isPrint ? "text-[8.5px]" : "text-xs"
                }`}
              >
                MRP: {mrp}
              </span>
            ) : (
              <span
                className={`font-semibold text-slate-500 ${
                  isPrint ? "text-[5.5px]" : "text-[8px]"
                }`}
              >
                Incl. of all taxes
              </span>
            )}
            {sellingPrice && mrp && sellingPrice !== mrp && (
              <span
                className={`text-slate-400 line-through ${
                  isPrint ? "text-[6px]" : "text-[9px]"
                }`}
              >
                {mrp}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Barcode Graphic - Fills remaining height cleanly */}
      {f.showBarcodeGraphic !== false && item.barcode && (
        <div className="mt-auto pt-0.5 flex justify-center w-full overflow-hidden">
          <RealBarcodeSvg
            code={item.barcode}
            width={220}
            height={isPrint ? 32 : 48}
            unitPx={1.35}
          />
        </div>
      )}
    </div>
  );
}

/**
 * Generates standalone SVG barcode string with crisp black lines for print documents
 * Engineered specifically for 100% optical readability on Handheld CCD & Laser scanners (TVS, Zebra, Honeywell, TSC).
 */
export function generateBarcodeSvgString(
  code: string,
  height: number = 42,
  unitPx: number = 2,
  formatOverride?: "Auto" | "Code-128" | "EAN-13"
): string {
  const clean = (code || "").trim().replace(/\s/g, "");
  const isEan13Candidate = /^\d{12,13}$/.test(clean);
  const useEan13 = formatOverride === "EAN-13" || (formatOverride !== "Code-128" && isEan13Candidate);

  if (useEan13) {
    const structured = encodeEAN13Structured(clean || "8904358601259");
    const unit = Math.max(1, Math.round(unitPx || 2));
    const leftQuietWidth = 11 * unit;
    const rightQuietWidth = 8 * unit;
    const barsWidth = 95 * unit;
    const svgWidth = leftQuietWidth + barsWidth + rightQuietWidth;

    const fontSize = Math.max(8.5, Math.min(11, Math.round(height * 0.22)));
    const textBaseline = height - 1.5;
    const barTop = 1;
    const dataBarHeight = Math.max(18, Math.round(height - fontSize - 5));
    const guardBarHeight = Math.min(height - 2, dataBarHeight + 5);

    let curX = leftQuietWidth;
    let barsHtml = "";
    structured.allBars.forEach((b) => {
      const w = b.width * unit;
      const x = curX;
      curX += w;
      if (b.isBlack) {
        const h = b.isGuard ? guardBarHeight : dataBarHeight;
        barsHtml += `<rect x="${x}" y="${barTop}" width="${w}" height="${h}" fill="#000000" />`;
      }
    });

    return `<svg width="${svgWidth}" height="${height}" viewBox="0 0 ${svgWidth} ${height}" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;max-height:100%;image-rendering:pixelated;">
      <rect width="${svgWidth}" height="${height}" fill="#ffffff" />
      <text x="${Math.max(2, leftQuietWidth - 5 * unit)}" y="${textBaseline}" text-anchor="middle" font-size="${fontSize}" font-family="'OCR-B', 'Courier New', monospace" font-weight="bold" fill="#000000">${structured.firstDigit}</text>
      ${barsHtml}
      <text x="${leftQuietWidth + Math.round(21 * unit)}" y="${textBaseline}" text-anchor="middle" font-size="${fontSize}" font-family="'OCR-B', 'Courier New', monospace" font-weight="bold" letter-spacing="0.8px" fill="#000000">${structured.leftDigits}</text>
      <text x="${leftQuietWidth + Math.round(68 * unit)}" y="${textBaseline}" text-anchor="middle" font-size="${fontSize}" font-family="'OCR-B', 'Courier New', monospace" font-weight="bold" letter-spacing="0.8px" fill="#000000">${structured.rightDigits}</text>
      <text x="${svgWidth - 4}" y="${textBaseline}" text-anchor="middle" font-size="${Math.max(6.5, fontSize - 2)}" font-family="monospace" font-weight="bold" fill="#666666">&gt;</text>
    </svg>`;
  }

  // Code-128 Mode (Universal Handheld CCD Scanner Standard)
  const bars = encodeCode128(clean || "SN-2026-0001");
  const unit = Math.max(1, Math.round(unitPx || 2));
  const quietZone = 12 * unit;
  let totalModules = 0;
  bars.forEach((b) => (totalModules += b.width));
  const svgWidth = totalModules * unit + quietZone * 2;
  const fontSize = Math.max(8.5, Math.min(11, Math.round(height * 0.20)));
  const textBaseline = height - 1.5;
  const barTop = 1;
  const barHeight = Math.max(18, Math.round(height - fontSize - 5));

  let barsHtml = "";
  let curX = quietZone;
  bars.forEach((b) => {
    const w = b.width * unit;
    const x = curX;
    curX += w;
    if (b.isBlack) {
      barsHtml += `<rect x="${x}" y="${barTop}" width="${w}" height="${barHeight}" fill="#000000" />`;
    }
  });

  return `<svg width="${svgWidth}" height="${height}" viewBox="0 0 ${svgWidth} ${height}" shape-rendering="crispEdges" style="display:block;margin:0 auto;background:#ffffff;max-height:100%;image-rendering:pixelated;">
    <rect width="${svgWidth}" height="${height}" fill="#ffffff" />
    ${barsHtml}
    <text x="${Math.round(svgWidth / 2)}" y="${textBaseline}" text-anchor="middle" font-size="${fontSize}" font-family="'Courier New', monospace" font-weight="bold" letter-spacing="0.8px" fill="#000000">${clean}</text>
  </svg>`;
}

/**
 * Direct print trigger for thermal barcode printers (Xprinter XP-TT426B, Zebra, TSC, TVS) and A4 sheets
 */
export function printBarcodePopup(
  items: ProductBarcodeLike[],
  template: any = {},
  layout: "1up" | "2up" | "3up" | "4up" | "a4" | "a4_24" | "a4_30" | "a4_40" | "a4_65" | "fmcg" = "2up",
  currencySymbol: string = "₹",
  orgName?: string,
  barcodeFormatOverride?: "Auto" | "Code-128" | "EAN-13"
) {
  if (!items || items.length === 0) return;

  const f = template?.fields || {
    showCompanyName: true,
    showCategoryBrand: true,
    showProductName: true,
    showSKU: true,
    showPrice: true,
    showMRP: true,
    showBarcodeGraphic: true,
  };
  const storeName = resolveOrgName(orgName, template?.storeName);
  const primaryColor = template?.primaryColor || "#0f172a";
  const activeFormat = barcodeFormatOverride || template?.barcodeFormat || "Auto";

  let pageCss = "@page { size: auto; margin: 0mm !important; }";
  let containerStyle = "width: 100%; margin: 0; padding: 0; box-sizing: border-box;";
  let rowStyle = "";
  let cardStyle = "";
  let columns = 2;
  let isSmallCard = false;
  let barcodeHeightPx = 36;
  let barcodeUnitPx = 1.35;

  if (layout === "1up") {
    pageCss = "@page { size: 50mm 25mm; margin: 0mm !important; }";
    rowStyle = "width: 50mm; height: 25mm; max-height: 25mm; margin: 0 auto; display: flex; justify-content: center; align-items: center; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden;";
    cardStyle = "width: 48mm; height: 22.5mm; max-height: 22.5mm; box-sizing: border-box;";
    columns = 1;
    barcodeHeightPx = 38;
    barcodeUnitPx = 1.4;
  } else if (layout === "2up") {
    pageCss = "@page { size: 100mm 25mm; margin: 0mm !important; }";
    rowStyle = "width: 100mm; height: 25mm; max-height: 25mm; margin: 0 auto; display: grid; grid-template-columns: repeat(2, 48.5mm); gap: 1.5mm; justify-content: center; align-items: center; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden;";
    cardStyle = "width: 48.5mm; height: 22.5mm; max-height: 22.5mm; box-sizing: border-box;";
    columns = 2;
    barcodeHeightPx = 38;
    barcodeUnitPx = 1.35;
  } else if (layout === "3up") {
    pageCss = "@page { size: 114mm 25mm; margin: 0mm !important; }";
    rowStyle = "width: 114mm; height: 25mm; max-height: 25mm; margin: 0 auto; display: grid; grid-template-columns: repeat(3, 36.5mm); gap: 1mm; justify-content: center; align-items: center; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden;";
    cardStyle = "width: 36.5mm; height: 22mm; max-height: 22mm; box-sizing: border-box;";
    columns = 3;
    barcodeHeightPx = 32;
    barcodeUnitPx = 1.2;
  } else if (layout === "4up") {
    pageCss = "@page { size: 100mm 25mm; margin: 0mm !important; }";
    rowStyle = "width: 100mm; height: 25mm; max-height: 25mm; margin: 0 auto; display: grid; grid-template-columns: repeat(4, 23.5mm); gap: 0.8mm; justify-content: center; align-items: center; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden;";
    cardStyle = "width: 23.5mm; height: 22mm; max-height: 22mm; box-sizing: border-box;";
    columns = 4;
    isSmallCard = true;
    barcodeHeightPx = 28;
    barcodeUnitPx = 1.05;
  } else if (layout === "fmcg") {
    pageCss = "@page { size: 50mm 50mm; margin: 0mm !important; }";
    rowStyle = "width: 50mm; height: 50mm; max-height: 50mm; margin: 0 auto; display: flex; justify-content: center; align-items: center; page-break-after: always; break-after: page; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box; overflow: hidden;";
    cardStyle = "width: 48mm; height: 48mm; box-sizing: border-box;";
    columns = 1;
    barcodeHeightPx = 46;
    barcodeUnitPx = 1.6;
  } else if (layout === "a4_24") {
    pageCss = "@page { size: A4 portrait; margin: 6mm 4mm !important; }";
    rowStyle = "width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin-bottom: 2mm; box-sizing: border-box;";
    cardStyle = "width: 100%; height: 35mm; max-height: 35mm; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;";
    columns = 3;
    barcodeHeightPx = 42;
    barcodeUnitPx = 1.5;
  } else if (layout === "a4_30") {
    pageCss = "@page { size: A4 portrait; margin: 5mm 3mm !important; }";
    rowStyle = "width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; margin-bottom: 2mm; box-sizing: border-box;";
    cardStyle = "width: 100%; height: 26mm; max-height: 26mm; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;";
    columns = 3;
    barcodeHeightPx = 36;
    barcodeUnitPx = 1.35;
  } else if (layout === "a4_40") {
    pageCss = "@page { size: A4 portrait; margin: 5mm 3mm !important; }";
    rowStyle = "width: 100%; display: grid; grid-template-columns: repeat(4, 1fr); gap: 2mm; margin-bottom: 2mm; box-sizing: border-box;";
    cardStyle = "width: 100%; height: 26mm; max-height: 26mm; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;";
    columns = 4;
    isSmallCard = true;
    barcodeHeightPx = 32;
    barcodeUnitPx = 1.15;
  } else if (layout === "a4_65") {
    pageCss = "@page { size: A4 portrait; margin: 4mm 2mm !important; }";
    rowStyle = "width: 100%; display: grid; grid-template-columns: repeat(5, 1fr); gap: 1.5mm; margin-bottom: 1.5mm; box-sizing: border-box;";
    cardStyle = "width: 100%; height: 20mm; max-height: 20mm; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;";
    columns = 5;
    isSmallCard = true;
    barcodeHeightPx = 26;
    barcodeUnitPx = 1.0;
  } else {
    // general a4
    pageCss = "@page { size: A4 portrait; margin: 5mm 3mm !important; }";
    rowStyle = "width: 100%; display: grid; grid-template-columns: repeat(3, 1fr); gap: 2.5mm; margin-bottom: 2.5mm; box-sizing: border-box;";
    cardStyle = "width: 100%; height: 25mm; max-height: 25mm; page-break-inside: avoid; break-inside: avoid; box-sizing: border-box;";
    columns = 3;
    barcodeHeightPx = 36;
    barcodeUnitPx = 1.35;
  }

  // Chunk items into rows matching physical label dimensions
  const rows: ProductBarcodeLike[][] = [];
  for (let i = 0; i < items.length; i += columns) {
    rows.push(items.slice(i, i + columns));
  }

  const cardsHtml = rows.map((rowItems) => {
    const rowCards = rowItems.map((item) => {
      const barcodeSvg = f.showBarcodeGraphic !== false && item.barcode
        ? generateBarcodeSvgString(item.barcode, barcodeHeightPx, barcodeUnitPx, activeFormat)
        : "";

      const sellingPrice = item.selling_price != null && Number(item.selling_price) > 0 ? `${currencySymbol}${Number(item.selling_price).toFixed(2)}` : "";
      const mrp = item.mrp != null && Number(item.mrp) > 0 ? `${currencySymbol}${Number(item.mrp).toFixed(2)}` : "";

      return `
        <div class="businessos-barcode-card" style="${cardStyle}">
          <div class="businessos-card-inner">
            ${f.showCompanyName !== false ? `
              <div class="businessos-header-row">
                <span class="businessos-store-name" style="color:${primaryColor};">${storeName}</span>
                ${f.showCategoryBrand !== false && item.category_name ? `<span class="businessos-category-name">${item.category_name}</span>` : ""}
              </div>
            ` : ""}
            <div class="businessos-product-info">
              ${f.showProductName !== false ? `<div class="businessos-product-name">${item.product_name || "Product"}</div>` : ""}
              <div class="businessos-price-row">
                ${f.showSKU !== false && item.sku ? `<span class="businessos-sku">SKU: ${item.sku}</span>` : "<span></span>"}
                <div class="businessos-prices">
                  ${sellingPrice ? `<span class="businessos-selling-price">${sellingPrice}</span>` : mrp ? `<span class="businessos-selling-price">MRP: ${mrp}</span>` : `<span class="businessos-mrp-price" style="text-decoration:none;font-size:4.5pt;">INCL. TAXES</span>`}
                  ${sellingPrice && mrp && sellingPrice !== mrp ? `<span class="businessos-mrp-price">${mrp}</span>` : ""}
                </div>
              </div>
            </div>
            ${barcodeSvg ? `<div class="businessos-barcode-wrapper">${barcodeSvg}</div>` : ""}
          </div>
        </div>
      `;
    }).join("");

    return `<div class="businessos-label-row" style="${rowStyle}">${rowCards}</div>`;
  }).join("");

  // Remove previous print container/style if exists
  const oldContainer = document.getElementById("businessos-barcode-direct-print-container");
  if (oldContainer) oldContainer.remove();
  const oldStyle = document.getElementById("businessos-barcode-direct-print-style");
  if (oldStyle) oldStyle.remove();

  // Create style element
  const styleEl = document.createElement("style");
  styleEl.id = "businessos-barcode-direct-print-style";
  styleEl.innerHTML = `
    @media screen {
      #businessos-barcode-direct-print-container {
        display: none !important;
        visibility: hidden !important;
      }
    }
    @media print {
      ${pageCss}
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #ffffff !important;
        width: 100% !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
      }
      body > *:not(#businessos-barcode-direct-print-container) {
        display: none !important;
      }
      #businessos-barcode-direct-print-container {
        display: block !important;
        visibility: visible !important;
        position: absolute !important;
        left: 0 !important;
        top: 0 !important;
        background: #ffffff !important;
        margin: 0 !important;
        padding: 0 !important;
        z-index: 9999999 !important;
      }
      #businessos-barcode-direct-print-container * {
        visibility: visible !important;
      }
      .businessos-barcode-card {
        border: 0.5pt solid #94a3b8;
        border-radius: 1pt;
        background: #ffffff !important;
        overflow: hidden;
        padding: 0.6mm 1mm 0.3mm 1mm;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        box-sizing: border-box;
      }
      .businessos-card-inner {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        overflow: hidden;
        box-sizing: border-box;
      }
      .businessos-header-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 0.5pt solid #64748b;
        padding-bottom: 0.2mm;
        margin-bottom: 0.2mm;
        line-height: 1;
        height: 2.6mm;
        max-height: 2.6mm;
        box-sizing: border-box;
        overflow: hidden;
      }
      .businessos-store-name {
        font-size: ${isSmallCard ? "4.5pt" : "6pt"};
        font-weight: 900;
        text-transform: uppercase;
        letter-spacing: 0.2pt;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        line-height: 1;
      }
      .businessos-category-name {
        font-size: ${isSmallCard ? "4pt" : "5pt"};
        font-weight: 600;
        color: #475569;
        text-transform: uppercase;
        white-space: nowrap;
        line-height: 1;
      }
      .businessos-product-info {
        width: 100%;
        overflow: hidden;
        line-height: 1;
      }
      .businessos-product-name {
        font-size: ${isSmallCard ? "5.5pt" : "7.2pt"};
        font-weight: 900;
        color: #000000;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .businessos-price-row {
        display: flex;
        justify-content: space-between;
        align-items: baseline;
        margin-top: 0.2mm;
        line-height: 1;
      }
      .businessos-sku {
        font-size: ${isSmallCard ? "4.5pt" : "5.5pt"};
        font-family: monospace;
        color: #1e293b;
        font-weight: 800;
      }
      .businessos-prices {
        display: flex;
        align-items: baseline;
        gap: 1.5pt;
      }
      .businessos-selling-price {
        font-size: ${isSmallCard ? "5.5pt" : "7.5pt"};
        font-weight: 900;
        color: #000000;
      }
      .businessos-mrp-price {
        font-size: ${isSmallCard ? "4pt" : "5pt"};
        color: #64748b;
        text-decoration: line-through;
      }
      .businessos-barcode-wrapper {
        margin-top: auto;
        padding-top: 0.3mm;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        box-sizing: border-box;
      }
      .businessos-barcode-wrapper svg {
        max-width: 98% !important;
        max-height: 14mm !important;
        height: auto !important;
        display: block !important;
        margin: 0 auto !important;
        shape-rendering: crispEdges !important;
        -webkit-print-color-adjust: exact !important;
        print-color-adjust: exact !important;
        image-rendering: pixelated !important;
      }
    }
  `;
  document.head.appendChild(styleEl);

  // Create container element directly on body
  const printContainer = document.createElement("div");
  printContainer.id = "businessos-barcode-direct-print-container";
  printContainer.innerHTML = `<div style="${containerStyle}">${cardsHtml}</div>`;
  document.body.appendChild(printContainer);

  const cleanup = () => {
    try {
      printContainer.remove();
      styleEl.remove();
    } catch {}
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup, { once: true });

  // Call window.print synchronously inside user gesture
  try {
    window.print();
  } catch (e) {
    console.error("Window print invocation error:", e);
  }

  // Backup cleanup after 60s in case afterprint does not fire
  setTimeout(cleanup, 60000);
}
