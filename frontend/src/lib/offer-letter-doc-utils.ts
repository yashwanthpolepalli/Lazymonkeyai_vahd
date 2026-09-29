/**
 * Utility functions for exporting and printing professional offer letters in Word (.doc) and PDF formats
 * with customizable company logo, watermark, letterhead styling, and compensation matrices.
 */

export interface OfferLetterExportOptions {
  candidateName: string;
  candidateEmail?: string;
  role: string;
  department?: string;
  ctc: number;
  currencySymbol: string;
  salarySplit: {
    basicPct: number;
    hraPct: number;
    specialPct: number;
    pfPct: number;
    bonusAmount?: number;
  };
  joiningDate: string;
  expiryDate: string;
  probationMonths: number;
  noticeDays: number;
  signingAuthority: string;
  signingTitle: string;
  clauses: string;
  subjectText?: string;
  openingText?: string;
  closingText?: string;
  templateTitle?: string;
  // Typography & Styling (Word-like)
  fontFamily?: string;
  fontSize?: number; // Base body font size in pt (e.g. 10, 11, 12)
  headingSize?: number; // Heading size in pt (e.g. 16, 18, 20)
  lineHeight?: number; // e.g. 1.2, 1.45, 1.6
  primaryColor?: string; // e.g. #0f172a, #1e1b4b, #1e293b
  accentColor?: string; // e.g. #4f46e5, #0284c7, #059669
  textAlign?: "left" | "justify";
  marginSize?: "compact" | "normal" | "spacious";
  // Letterhead & Branding
  orgName: string;
  orgAddress: string;
  orgEmail?: string;
  orgPhone?: string;
  orgGstin?: string;
  orgCin?: string;
  orgLogo?: string;
  logoPosition?: "left" | "center" | "right" | "hidden";
  logoSize?: "small" | "medium" | "large";
  headerBadgeText?: string;
  footerText?: string;
  letterheadStyle?: "corporate" | "modern" | "minimal" | "bordered" | "banner";
  // Watermark
  watermarkEnabled?: boolean;
  watermarkText?: string;
  watermarkOpacity?: number; // 0.05 - 0.3
}

export function formatDateDDMMYYYY(dateVal: any): string {
  if (!dateVal) return "";
  if (typeof dateVal === "string") {
    const str = dateVal.trim();
    // Already in DD/MM/YYYY format
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      return str;
    }
    // Standard ISO format YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
      const [y, m, d] = str.slice(0, 10).split("-");
      return `${d}/${m}/${y}`;
    }
  }
  try {
    const d = new Date(dateVal);
    if (!isNaN(d.getTime())) {
      const day = String(d.getDate()).padStart(2, "0");
      const month = String(d.getMonth() + 1).padStart(2, "0");
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    }
  } catch {
    // fallback
  }
  return String(dateVal);
}

/**
 * Downloads a formatted Microsoft Word document (.doc) with letterhead, logo, watermark, typography, and tables.
 */
export function downloadOfferLetterWordDoc(opts: OfferLetterExportOptions) {
  const {
    candidateName,
    candidateEmail,
    role,
    department,
    ctc,
    currencySymbol,
    salarySplit,
    joiningDate,
    expiryDate,
    probationMonths,
    noticeDays,
    signingAuthority,
    signingTitle,
    clauses,
    subjectText,
    openingText,
    closingText,
    footerText,
    templateTitle = "Employment Offer & Agreement",
    fontFamily = "'Calibri', 'Segoe UI', Arial, sans-serif",
    fontSize = 10.5,
    headingSize = 17,
    lineHeight = 1.45,
    primaryColor = "#0f172a",
    accentColor = "#4f46e5",
    textAlign = "left",
    marginSize = "normal",
    orgName,
    orgAddress,
    orgEmail,
    orgPhone,
    orgGstin,
    orgCin,
    orgLogo,
    logoPosition = "left",
    logoSize = "medium",
    headerBadgeText = "OFFICIAL OFFER",
    letterheadStyle = "corporate",
    watermarkEnabled = true,
    watermarkText = "CONFIDENTIAL",
    watermarkOpacity = 0.12,
  } = opts;

  const marginMap = {
    compact: "0.6in 0.6in 0.6in 0.6in",
    normal: "0.9in 0.9in 0.9in 0.9in",
    spacious: "1.2in 1.2in 1.2in 1.2in"
  };
  const pageMargin = marginMap[marginSize] || marginMap.normal;

  const basic = (ctc * salarySplit.basicPct) / 100;
  const hra = (ctc * salarySplit.hraPct) / 100;
  const special = (ctc * salarySplit.specialPct) / 100;
  const pf = (ctc * salarySplit.pfPct) / 100;
  const monthlyGross = (ctc - pf) / 12;

  const formattedJoinDate = joiningDate ? formatDateDDMMYYYY(joiningDate) : "[Joining Date]";
  const formattedExpiryDate = expiryDate ? formatDateDDMMYYYY(expiryDate) : "[Expiry Date]";
  const refNumber = `BOS-OFFER-${Math.floor(100000 + Math.random() * 900000)}`;

  const substituteVars = (str: string) => {
    if (!str) return "";
    return str
      .replace(/\{\{candidate_name\}\}/gi, candidateName)
      .replace(/\{\{candidate_email\}\}/gi, candidateEmail || "")
      .replace(/\{\{role\}\}/gi, role)
      .replace(/\{\{designation\}\}/gi, role)
      .replace(/\{\{department\}\}/gi, department || "General")
      .replace(/\{\{candidate_department\}\}/gi, department || "General")
      .replace(/\{\{company_name\}\}/gi, orgName)
      .replace(/\{\{org_name\}\}/gi, orgName)
      .replace(/\{\{ctc_annual\}\}/gi, `${currencySymbol}${ctc.toLocaleString()}`)
      .replace(/\{\{joining_date\}\}/gi, formattedJoinDate)
      .replace(/\{\{expiry_date\}\}/gi, formattedExpiryDate)
      .replace(/\{\{probation\}\}/gi, probationMonths > 0 ? `${probationMonths} months` : "None")
      .replace(/\{\{notice\}\}/gi, `${noticeDays} days`)
      .replace(/\{\{signatory_name\}\}/gi, signingAuthority)
      .replace(/\{\{signatory_title\}\}/gi, signingTitle);
  };

  const resolvedSubject = substituteVars(subjectText || `Formal Offer of Employment — ${role}`);
  const resolvedOpening = substituteVars(openingText || `On behalf of <strong>${orgName}</strong>, we are pleased to extend this formal offer of employment for the position of <strong>${role}</strong>${department ? ` in the <strong>${department}</strong> team` : ""}. We were exceptionally impressed with your achievements, domain knowledge, and leadership alignment with our organization.`);
  const resolvedClosing = substituteVars(closingText || `This offer remains valid until <strong>${formattedExpiryDate}</strong>. Please sign and return a duplicate copy of this letter as confirmation of your acceptance.`);
  const resolvedClauses = substituteVars(clauses);

  const docHtml = `
    <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head>
      <meta charset='utf-8'>
      <title>Offer Letter - ${candidateName}</title>
      <style>
        @page {
          size: 8.5in 11.0in;
          margin: ${pageMargin};
          mso-header-margin: 0.5in;
          mso-footer-margin: 0.5in;
        }
        body {
          font-family: ${fontFamily};
          font-size: ${fontSize}pt;
          line-height: ${lineHeight};
          color: ${primaryColor};
          text-align: ${textAlign};
          position: relative;
        }
        .header-table {
          width: 100%;
          border-bottom: 2pt solid ${primaryColor};
          padding-bottom: 12pt;
          margin-bottom: 16pt;
        }
        .company-title {
          font-size: ${headingSize + 2}pt;
          font-weight: bold;
          color: ${primaryColor};
          margin: 0;
        }
        .company-sub {
          font-size: ${fontSize - 1.5}pt;
          color: #64748b;
          margin: 2pt 0 0 0;
        }
        .badge {
          background-color: ${primaryColor};
          color: #ffffff;
          padding: 4pt 8pt;
          font-size: ${fontSize - 1.5}pt;
          font-weight: bold;
          text-align: right;
          border-radius: 3pt;
        }
        .meta-box {
          background-color: #f8fafc;
          border: 1pt solid #e2e8f0;
          padding: 10pt;
          margin-bottom: 14pt;
          border-radius: 4pt;
        }
        table.salary-table {
          width: 100%;
          border-collapse: collapse;
          margin: 12pt 0;
          font-size: ${fontSize - 1}pt;
        }
        table.salary-table th {
          background-color: #f1f5f9;
          border: 1pt solid #cbd5e1;
          padding: 6pt 8pt;
          text-align: left;
          font-weight: bold;
        }
        table.salary-table td {
          border: 1pt solid #e2e8f0;
          padding: 5pt 8pt;
        }
        .total-row {
          background-color: #e0f2fe;
          font-weight: bold;
        }
        .clause-box {
          background-color: #fcfcfc;
          border-left: 3pt solid ${accentColor};
          padding: 8pt 12pt;
          margin: 12pt 0;
          font-size: ${fontSize - 1}pt;
          line-height: ${lineHeight};
        }
        .watermark {
          position: fixed;
          top: 35%;
          left: 15%;
          width: 70%;
          text-align: center;
          font-size: 52pt;
          font-weight: 900;
          color: rgba(148, 163, 184, ${watermarkOpacity});
          transform: rotate(-35deg);
          z-index: -1000;
          text-transform: uppercase;
          pointer-events: none;
        }
        .sig-table {
          width: 100%;
          margin-top: 26pt;
          border-top: 1pt solid #e2e8f0;
          padding-top: 10pt;
        }
      </style>
    </head>
    <body>
      ${watermarkEnabled ? `<div class="watermark">${watermarkText}</div>` : ""}

      <!-- Header Table -->
      <table class="header-table">
        <tr>
          <td style="vertical-align: middle;">
            ${orgLogo ? `<img src="${orgLogo}" style="max-height: 48pt; max-width: 150pt; margin-bottom: 4pt;" /><br>` : ""}
            <div class="company-title">${orgName}</div>
            <div class="company-sub">${orgAddress}</div>
            <div class="company-sub">Email: ${orgEmail || "hr@" + orgName.toLowerCase().replace(/[^a-z]/g, "") + ".com"} | Phone: ${orgPhone || "+91-800-555-0199"}${orgGstin ? ` | GSTIN: ${orgGstin}` : ""}</div>
          </td>
          <td style="text-align: right; vertical-align: top;">
            <span class="badge">${headerBadgeText}</span>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 4pt; font-family: monospace;">REF: ${refNumber}</div>
            <div style="font-size: 8.5pt; color: #64748b; margin-top: 2pt;">Date: ${formatDateDDMMYYYY(new Date())}</div>
          </td>
        </tr>
      </table>

      <!-- Recipient Block -->
      <div class="meta-box">
        <table style="width: 100%; border: none;">
          <tr>
            <td>
              <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">APPOINTMENT OFFERED TO:</span><br>
              <strong style="font-size: ${fontSize + 1.5}pt; color: ${primaryColor};">${candidateName}</strong><br>
              <span style="color: #475569;">${candidateEmail || ""}</span>
            </td>
            <td style="text-align: right;">
              <span style="font-size: 8pt; font-weight: bold; color: #64748b; text-transform: uppercase;">POSITION & DESIGNATION:</span><br>
              <strong style="font-size: ${fontSize + 0.5}pt; color: ${primaryColor};">${role}</strong><br>
              ${department ? `<span style="color: #475569; font-size: ${fontSize - 1.5}pt;">Department: <strong>${department}</strong></span><br>` : ""}
              <span style="color: #475569;">Target Joining: ${formattedJoinDate}</span>
            </td>
          </tr>
        </table>
      </div>

      <p style="font-weight: bold; font-size: ${headingSize - 4}pt; margin-bottom: 6pt;">${resolvedSubject}</p>
      <p style="margin-bottom: 8pt;">Dear <strong>${candidateName}</strong>,</p>
      <p style="margin-bottom: 12pt;">${resolvedOpening}</p>

      <h3 style="font-size: ${headingSize - 4}pt; color: ${primaryColor}; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 16pt;">1. Compensation Structure (Annual & Monthly Breakup)</h3>
      <p style="font-size: ${fontSize - 0.5}pt; color: #475569;">Your Total Cost to Company (CTC) is agreed at <strong>${currencySymbol}${ctc.toLocaleString()}</strong> per annum, distributed as follows:</p>

      <table class="salary-table">
        <thead>
          <tr>
            <th>Salary Component</th>
            <th style="text-align: right;">Split %</th>
            <th style="text-align: right;">Monthly (${currencySymbol})</th>
            <th style="text-align: right;">Annual (${currencySymbol})</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Basic Salary</td>
            <td style="text-align: right;">${salarySplit.basicPct}%</td>
            <td style="text-align: right;">${currencySymbol}${Math.round(basic / 12).toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">${currencySymbol}${Math.round(basic).toLocaleString()}</td>
          </tr>
          <tr>
            <td>House Rent Allowance (HRA)</td>
            <td style="text-align: right;">${salarySplit.hraPct}%</td>
            <td style="text-align: right;">${currencySymbol}${Math.round(hra / 12).toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">${currencySymbol}${Math.round(hra).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Special / Flexi Allowance</td>
            <td style="text-align: right;">${salarySplit.specialPct}%</td>
            <td style="text-align: right;">${currencySymbol}${Math.round(special / 12).toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">${currencySymbol}${Math.round(special).toLocaleString()}</td>
          </tr>
          <tr>
            <td>Employer Provident Fund (PF) Contribution</td>
            <td style="text-align: right;">${salarySplit.pfPct}%</td>
            <td style="text-align: right;">${currencySymbol}${Math.round(pf / 12).toLocaleString()}</td>
            <td style="text-align: right; font-weight: bold;">${currencySymbol}${Math.round(pf).toLocaleString()}</td>
          </tr>
          <tr class="total-row">
            <td><strong>Total Gross Cost to Company (CTC)</strong></td>
            <td style="text-align: right;"><strong>100%</strong></td>
            <td style="text-align: right;"><strong>${currencySymbol}${Math.round(ctc / 12).toLocaleString()}</strong></td>
            <td style="text-align: right;"><strong>${currencySymbol}${Math.round(ctc).toLocaleString()}</strong></td>
          </tr>
        </tbody>
      </table>

      <div style="background-color: #f0fdf4; border: 1pt solid #bbf7d0; padding: 8pt; border-radius: 4pt; margin-bottom: 12pt; font-size: ${fontSize - 1}pt; color: #166534;">
        <strong>Net Estimated In-Hand Gross:</strong> ${currencySymbol}${Math.round(monthlyGross).toLocaleString()} / month (Subject to applicable statutory tax withholding).
      </div>

      <h3 style="font-size: ${headingSize - 4}pt; color: ${primaryColor}; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 14pt;">2. Employment Terms & Standard Covenants</h3>
      <div class="clause-box">
        <p><strong>Probation Period:</strong> ${probationMonths > 0 ? `${probationMonths} months from joining date.` : "No probation required (Direct Appointment)."}</p>
        <p><strong>Notice Period:</strong> ${noticeDays} days written notice or gross salary in lieu thereof.</p>
        <div style="margin-top: 6pt; white-space: pre-wrap;">${resolvedClauses}</div>
      </div>

      <h3 style="font-size: ${headingSize - 4}pt; color: ${primaryColor}; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 14pt;">3. Acceptance & Expiry</h3>
      <p style="margin-bottom: 14pt;">${resolvedClosing}</p>

      <!-- Signature Section -->
      <table class="sig-table">
        <tr>
          <td style="vertical-align: top; width: 50%;">
            <div style="font-size: 8.5pt; color: #64748b; text-transform: uppercase;">Authorized Signatory:</div>
            <div style="margin-top: 25pt; border-bottom: 1pt solid #94a3b8; width: 80%;"></div>
            <strong style="font-size: ${fontSize}pt; color: ${primaryColor}; display: block; margin-top: 4pt;">${signingAuthority}</strong>
            <span style="font-size: 8.5pt; color: #64748b;">${signingTitle}</span><br>
            <span style="font-size: 8.5pt; color: #64748b;">${orgName}</span>
          </td>
          <td style="vertical-align: top; width: 50%; text-align: right;">
            <div style="font-size: 8.5pt; color: #64748b; text-transform: uppercase;">Candidate Acceptance Signature:</div>
            <div style="margin-top: 25pt; border-bottom: 1pt solid #94a3b8; width: 80%; margin-left: auto;"></div>
            <strong style="font-size: ${fontSize}pt; color: ${primaryColor}; display: block; margin-top: 4pt;">${candidateName}</strong>
            <span style="font-size: 8.5pt; color: #64748b;">Date of Acceptance: __________________</span>
          </td>
        </tr>
      </table>

      ${footerText ? `<div style="font-size: 8pt; color: #94a3b8; text-align: center; margin-top: 24pt; border-top: 1pt solid #e2e8f0; padding-top: 8pt;">${footerText}</div>` : ""}
    </body>
    </html>
  `;

  const blob = new Blob(["\ufeff" + docHtml], { type: "application/msword;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");
  downloadLink.href = url;
  downloadLink.download = `Offer_Letter_${candidateName.replace(/[^a-zA-Z0-9]/g, "_")}.doc`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}
