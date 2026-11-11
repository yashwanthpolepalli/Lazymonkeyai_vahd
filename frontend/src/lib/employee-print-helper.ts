/**
 * Precision Multi-Color A4 Employee Service Record & Profile Print Engine
 * Renders an isolated, pure HTML/CSS A4 document with crisp multi-color section banners,
 * borders, photo, and signature blocks without leaking any background web app elements.
 */

export interface EmployeePrintData {
  organisationName?: string;
  branchName?: string;
  orgLogo?: string | null;
  empNo?: string;
  fullName?: string;
  department?: string;
  designation?: string;
  role?: string;
  email?: string;
  phone?: string;
  gender?: string;
  dob?: string;
  age?: string | number;
  maritalStatus?: string;
  bloodGroup?: string;
  caste?: string;
  subCaste?: string;
  fatherName?: string;
  motherName?: string;
  aadharNumber?: string | string[];
  panNumber?: string;
  joinedDate?: string;
  lengthOfService?: string;
  retirementDate?: string;
  stationDate?: string;
  district?: string;
  nativeDistrict?: string;
  zone?: string;
  multiZone?: string;
  sourceMandal?: string;
  sourceVillage?: string;
  permanentAddress?: string;
  temporaryAddress?: string;
  bankAccountNo?: string;
  bankIfsc?: string;
  upiId?: string;
  baseMonthlySalary?: number;
  status?: string;
  photoBase64?: string | null;
}

export function printEmployeeServiceRecordForm(data: EmployeePrintData) {
  const safeVal = (v?: string | number | null) =>
    v !== undefined && v !== null && String(v).trim() ? String(v).trim() : '—';

  const orgName = data.organisationName || localStorage.getItem('ssdc_college_name') || 'Organisation / Institution';
  const branchName = data.branchName || 'Main Campus';
  const orgLogo = data.orgLogo || localStorage.getItem('ssdc_college_logo') || null;

  // Format Aadhar digits
  let aadharDigits: string[] = [];
  if (Array.isArray(data.aadharNumber)) {
    aadharDigits = data.aadharNumber;
  } else if (typeof data.aadharNumber === 'string') {
    aadharDigits = data.aadharNumber.split('').slice(0, 12);
  }
  while (aadharDigits.length < 12) {
    aadharDigits.push('');
  }

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Employee Service Record - ${data.fullName || 'Employee'}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 6mm 8mm 6mm 8mm;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
            box-sizing: border-box;
          }
          body {
            background: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            font-size: 11px;
            line-height: 1.35;
          }
          .page-border {
            border: 2px solid #1e3a8a;
            border-radius: 4px;
            padding: 7px 9px 8px 9px;
            min-height: 98vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .header-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 6px;
          }
          .header-title {
            text-align: center;
          }
          .header-title h1 {
            margin: 0;
            font-size: 16px;
            font-weight: 900;
            color: #1e3a8a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .header-title h2 {
            margin: 2px 0 0 0;
            font-size: 11px;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
          }
          .header-title h3 {
            margin: 3px 0 0 0;
            font-size: 10.5px;
            font-weight: 800;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            background: #fee2e2;
            display: inline-block;
            padding: 2px 10px;
            border-radius: 3px;
            border: 1px solid #fca5a5;
          }
          .banner {
            background: #1e3a8a;
            color: #ffffff;
            font-size: 9.5px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding: 3px 6px;
            margin: 5px 0 3px 0;
            border-radius: 2px;
          }
          .banner-green {
            background: #047857;
          }
          .banner-amber {
            background: #b45309;
          }
          .data-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 3px;
          }
          .data-table td {
            border: 1px solid #cbd5e1;
            padding: 3px 5px;
            font-size: 9.5px;
            vertical-align: top;
          }
          .lbl {
            font-weight: 700;
            color: #475569;
            width: 25%;
            background: #f8fafc;
          }
          .val {
            font-weight: 700;
            color: #0f172a;
            width: 25%;
          }
          .photo-box {
            width: 82px;
            height: 98px;
            border: 1.5px solid #1e3a8a;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #f8fafc;
            margin: 0 auto;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .photo-placeholder {
            font-size: 8px;
            font-weight: 700;
            color: #94a3b8;
            text-align: center;
            padding: 4px;
          }
          .aadhar-grid {
            display: inline-flex;
            gap: 2px;
            vertical-align: middle;
          }
          .aadhar-cell {
            width: 15px;
            height: 16px;
            border: 1px solid #0f172a;
            text-align: center;
            line-height: 15px;
            font-family: monospace;
            font-size: 10px;
            font-weight: 800;
            background: #ffffff;
          }
          .sig-row {
            margin-top: 10px;
            padding-top: 20px;
            display: flex;
            justify-content: space-between;
            font-size: 9px;
            font-weight: 800;
            color: #0f172a;
          }
          .sig-line {
            width: 200px;
            border-top: 1px dashed #64748b;
            text-align: center;
            padding-top: 3px;
          }
        </style>
      </head>
      <body>
        <div class="page-border">
          <div>
            <!-- Header Table -->
            <table class="header-table">
              <tr>
                <td style="width: 70px; vertical-align: middle;">
                  ${
                    orgLogo
                      ? `<img src="${orgLogo}" style="max-width: 65px; max-height: 65px; object-fit: contain; border-radius: 6px;" alt="Logo" />`
                      : `<div style="width: 55px; height: 55px; border-radius: 8px; background: #1e3a8a; color: #fff; font-size: 20px; font-weight: 900; line-height: 55px; text-align: center;">${(orgName[0] || 'O').toUpperCase()}</div>`
                  }
                </td>
                <td class="header-title" style="vertical-align: middle;">
                  <h1>${orgName}</h1>
                  <h2>Branch / Campus: ${branchName}</h2>
                  <h3>Official Staff &amp; Employee Service Record Form</h3>
                </td>
                <td style="width: 90px; text-align: right; vertical-align: top;">
                  <div class="photo-box">
                    ${
                      data.photoBase64
                        ? `<img src="${data.photoBase64}" alt="Employee Photo" />`
                        : `<div class="photo-placeholder">AFFIX RECENT PASSPORT PHOTO</div>`
                    }
                  </div>
                </td>
              </tr>
            </table>

            <!-- Section 1: Official Employment Details -->
            <div class="banner">1. Official Employment &amp; Service Information</div>
            <table class="data-table">
              <tr>
                <td class="lbl">Employee Code / Reg No.:</td>
                <td class="val" style="font-family: monospace; color: #1e3a8a; font-size: 10.5px;">${safeVal(data.empNo)}</td>
                <td class="lbl">Employment Status:</td>
                <td class="val" style="color: ${data.status === 'Active' ? '#047857' : '#dc2626'}; font-weight: 900;">${safeVal(data.status)}</td>
              </tr>
              <tr>
                <td class="lbl">Designation:</td>
                <td class="val">${safeVal(data.designation)}</td>
                <td class="lbl">Department:</td>
                <td class="val">${safeVal(data.department)}</td>
              </tr>
              <tr>
                <td class="lbl">Role / Category:</td>
                <td class="val">${safeVal(data.role)}</td>
                <td class="lbl">Organisation &amp; Branch:</td>
                <td class="val">${safeVal(data.organisationName)} - ${safeVal(data.branchName)}</td>
              </tr>
              <tr>
                <td class="lbl">Date of Joining:</td>
                <td class="val">${safeVal(data.joinedDate)}</td>
                <td class="lbl">Length of Service:</td>
                <td class="val">${safeVal(data.lengthOfService)}</td>
              </tr>
              <tr>
                <td class="lbl">Retirement Date:</td>
                <td class="val">${safeVal(data.retirementDate)}</td>
                <td class="lbl">Present Station Date:</td>
                <td class="val">${safeVal(data.stationDate)}</td>
              </tr>
              <tr>
                <td class="lbl">District:</td>
                <td class="val">${safeVal(data.district)}</td>
                <td class="lbl">Zone / Multi-Zone:</td>
                <td class="val">${safeVal(data.zone)} / ${safeVal(data.multiZone)}</td>
              </tr>
              <tr>
                <td class="lbl">Source Mandal &amp; Village:</td>
                <td class="val" colspan="3">${safeVal(data.sourceMandal)} — ${safeVal(data.sourceVillage)}</td>
              </tr>
            </table>

            <!-- Section 2: Personal Identification -->
            <div class="banner banner-green">2. Personal Profile &amp; Identification</div>
            <table class="data-table">
              <tr>
                <td class="lbl">Full Name (in Block Letters):</td>
                <td class="val" colspan="3" style="font-size: 11px; font-weight: 900; text-transform: uppercase; color: #0f172a;">${safeVal(data.fullName)}</td>
              </tr>
              <tr>
                <td class="lbl">Father's / Husband's Name:</td>
                <td class="val">${safeVal(data.fatherName)}</td>
                <td class="lbl">Mother's Name:</td>
                <td class="val">${safeVal(data.motherName)}</td>
              </tr>
              <tr>
                <td class="lbl">Date of Birth &amp; Age:</td>
                <td class="val">${safeVal(data.dob)} ${data.age ? `(${data.age} Yrs)` : ''}</td>
                <td class="lbl">Gender:</td>
                <td class="val">${safeVal(data.gender)}</td>
              </tr>
              <tr>
                <td class="lbl">Marital Status:</td>
                <td class="val">${safeVal(data.maritalStatus)}</td>
                <td class="lbl">Blood Group:</td>
                <td class="val" style="color: #dc2626; font-weight: 900;">${safeVal(data.bloodGroup)}</td>
              </tr>
              <tr>
                <td class="lbl">Caste &amp; Sub-Caste:</td>
                <td class="val">${safeVal(data.caste)} ${data.subCaste ? `(${data.subCaste})` : ''}</td>
                <td class="lbl">Native District:</td>
                <td class="val">${safeVal(data.nativeDistrict)}</td>
              </tr>
              <tr>
                <td class="lbl">Aadhar Card Number:</td>
                <td class="val">
                  <div class="aadhar-grid">
                    ${aadharDigits.map((d) => `<div class="aadhar-cell">${d || '&nbsp;'}</div>`).join('')}
                  </div>
                </td>
                <td class="lbl">Permanent Account Number (PAN):</td>
                <td class="val" style="font-family: monospace; font-weight: 800;">${safeVal(data.panNumber)}</td>
              </tr>
            </table>

            <!-- Section 3: Contact & Address Information -->
            <div class="banner banner-amber">3. Contact &amp; Residential Address</div>
            <table class="data-table">
              <tr>
                <td class="lbl">Primary Mobile Phone:</td>
                <td class="val" style="font-family: monospace; font-weight: 800;">${safeVal(data.phone)}</td>
                <td class="lbl">Official / Personal Email:</td>
                <td class="val">${safeVal(data.email)}</td>
              </tr>
              <tr>
                <td class="lbl">Permanent Postal Address:</td>
                <td class="val" colspan="3">${safeVal(data.permanentAddress)}</td>
              </tr>
              <tr>
                <td class="lbl">Present / Temporary Address:</td>
                <td class="val" colspan="3">${safeVal(data.temporaryAddress)}</td>
              </tr>
            </table>

            <!-- Section 4: Banking & Remittance -->
            <div class="banner">4. Salary Account &amp; Banking Details</div>
            <table class="data-table">
              <tr>
                <td class="lbl">Bank Account Number:</td>
                <td class="val" style="font-family: monospace;">${safeVal(data.bankAccountNo)}</td>
                <td class="lbl">Bank IFSC Code:</td>
                <td class="val" style="font-family: monospace;">${safeVal(data.bankIfsc)}</td>
              </tr>
              <tr>
                <td class="lbl">UPI ID / Virtual Address:</td>
                <td class="val">${safeVal(data.upiId)}</td>
                <td class="lbl">Base Monthly Salary (₹):</td>
                <td class="val" style="font-weight: 800; color: #047857;">${data.baseMonthlySalary ? `₹ ${Number(data.baseMonthlySalary).toLocaleString('en-IN')}` : '—'}</td>
              </tr>
            </table>
          </div>

          <!-- Section 5: Official Attestation & Signatures -->
          <div>
            <div style="font-size: 8px; color: #64748b; margin-top: 4px; text-align: justify; line-height: 1.2;">
              <strong>Declaration:</strong> I hereby declare that the particulars provided above are true, complete and correct to the best of my knowledge and belief. In the event of any information being found false or incomplete, my service is liable to be terminated without notice.
            </div>
            <div class="sig-row">
              <div class="sig-line">
                Signature of the Employee
              </div>
              <div class="sig-line">
                Verified by HR / Head of Department
              </div>
              <div class="sig-line">
                Authorised Signatory / Head Office
              </div>
            </div>
          </div>
        </div>

        <script>
          window.onload = function() {
            window.focus();
            window.print();
            setTimeout(function() {
              if (window.frameElement && window.frameElement.parentNode) {
                window.frameElement.parentNode.removeChild(window.frameElement);
              }
            }, 1200);
          };
        </script>
      </body>
    </html>
  `;

  // Create an isolated iframe for clean document printing
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  doc.open();
  doc.write(html);
  doc.close();
}

