/**
 * Precision Multi-Color A4 Student Admission Form Print Engine
 * Renders an isolated, pure HTML/CSS A4 document with crisp multi-color section banners,
 * borders, photo, and signature blocks without leaking any background web app elements.
 */

export interface StudentPrintData {
  collegeName?: string;
  affiliation?: string;
  collegeLogo?: string | null;
  academicYear?: string;
  course?: string;
  medium?: string;
  fullName?: string;
  fatherName?: string;
  motherName?: string;
  permDoorNo?: string;
  permStreet?: string;
  permVillage?: string;
  permMandal?: string;
  permDistrict?: string;
  permState?: string;
  permMobile?: string;
  presDoorNo?: string;
  presStreet?: string;
  presVillage?: string;
  presMandal?: string;
  presDistrict?: string;
  presState?: string;
  presMobile?: string;
  telephone?: string;
  dob?: string;
  age?: string | number;
  gender?: string;
  caste?: string;
  subCaste?: string;
  motherTongue?: string;
  nationality?: string;
  maritalStatus?: string;
  placeOfBirth?: string;
  identificationMark1?: string;
  identificationMark2?: string;
  parentOccupation?: string;
  annualIncome?: string | number;
  aadharNumber?: string | string[];
  photoBase64?: string | null;
}

export function printStudentAdmissionForm(data: StudentPrintData) {
  const safeVal = (v?: string | number | null) => (v !== undefined && v !== null && String(v).trim() ? String(v).trim() : '—');
  
  const checkedIcon = (checked: boolean) =>
    checked
      ? `<span style="display:inline-block;width:13px;height:13px;background-color:#1d4ed8;color:#ffffff;border-radius:2px;font-size:10px;line-height:13px;text-align:center;font-weight:bold;margin-right:4px;">✓</span>`
      : `<span style="display:inline-block;width:13px;height:13px;border:1.5px solid #64748b;border-radius:2px;margin-right:4px;vertical-align:middle;"></span>`;

  const collegeName = data.collegeName || localStorage.getItem('ssdc_college_name') || 'SRI SAI DEGREE COLLEGE - BOBBILI';
  const affiliation = data.affiliation || localStorage.getItem('ssdc_affiliation') || 'Affiliated to ANDHRA UNIVERSITY';
  const collegeLogo = data.collegeLogo || localStorage.getItem('ssdc_college_logo') || null;

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
        <title>Student Admission Form - ${data.fullName || 'Student'}</title>
        <meta charset="utf-8">
        <style>
          @page {
            size: A4 portrait;
            margin: 5mm 7mm 5mm 7mm;
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
            font-size: 10px;
            line-height: 1.25;
          }
          .form-wrapper {
            width: 100%;
            border: 2px solid #1e3a8a;
            border-radius: 4px;
            overflow: hidden;
          }
          .institution-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 6px 12px;
            background: linear-gradient(90deg, #1e3a8a, #2563eb) !important;
            background-color: #1e3a8a !important;
            color: #ffffff;
            border-bottom: 2px solid #1e3a8a;
          }
          .logo-box {
            width: 44px;
            height: 44px;
            background: #ffffff;
            border-radius: 6px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            flex-shrink: 0;
            border: 1px solid #93c5fd;
          }
          .logo-box img {
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 2px;
          }
          .section-bar {
            padding: 3px 8px;
            font-weight: 900;
            font-size: 9.5px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #ffffff !important;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .table-grid {
            width: 100%;
            border-collapse: collapse;
          }
          .table-grid td, .table-grid th {
            padding: 3.5px 6px;
            border: 1px solid #cbd5e1;
            vertical-align: middle;
          }
          .label {
            font-weight: 800;
            color: #0f172a;
            font-size: 9.5px;
          }
          .val {
            color: #0f172a;
            font-weight: 600;
            font-size: 10px;
          }
          .val-bold {
            color: #1e3a8a;
            font-weight: 800;
          }
          .photo-box {
            width: 105px;
            height: 125px;
            border: 1.5px dashed #2563eb;
            background-color: #f8fafc;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            text-align: center;
            margin: 0 auto;
            border-radius: 4px;
            overflow: hidden;
          }
          .photo-box img {
            width: 100%;
            height: 100%;
            object-fit: cover;
          }
          .digit-box {
            display: inline-block;
            width: 15px;
            height: 18px;
            border: 1.5px solid #1e3a8a;
            text-align: center;
            line-height: 16px;
            font-weight: 900;
            font-family: monospace;
            font-size: 11px;
            margin-right: 2px;
            background: #ffffff;
            color: #1e3a8a;
          }
        </style>
      </head>
      <body>
        <div class="form-wrapper">
          
          <!-- Institution & Form Top Header -->
          <div class="institution-header">
            <div style="display: flex; align-items: center; gap: 10px;">
              ${
                collegeLogo
                  ? `<div class="logo-box"><img src="${collegeLogo}" alt="Logo" /></div>`
                  : `<div class="logo-box" style="font-size:20px;">🎓</div>`
              }
              <div>
                <h1 style="margin: 0; font-size: 14px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.5px; color: #ffffff;">
                  ${collegeName}
                </h1>
                <span style="font-size: 8.5px; opacity: 0.95; font-weight: 600; color: #dbeafe;">
                  (${affiliation}) • Student Admission Application Form
                </span>
              </div>
            </div>
            <div style="text-align: right; background: rgba(255,255,255,0.15); padding: 4px 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.25);">
              <span style="font-size: 8.5px; font-weight: 800; display: block; color: #ffffff; text-transform: uppercase;">Academic Year</span>
              <span style="font-size: 11px; font-weight: 900; color: #ffffff;">${safeVal(data.academicYear || '2026 - 2027')}</span>
            </div>
          </div>

          <!-- Top Course & Photo Container -->
          <table class="table-grid" style="border: none; border-bottom: 2px solid #1e3a8a;">
            <tr>
              <td style="width: 78%; padding: 0; vertical-align: top; border: none; border-right: 2px solid #1e3a8a;">
                
                <table class="table-grid" style="border: none;">
                  <tr>
                    <td style="width: 60%; background-color: #e0f2fe; border: none; border-bottom: 1.5px solid #1e3a8a; border-right: 1.5px solid #1e3a8a;">
                      <span class="label" style="color: #0369a1; font-size: 10px;">COURSE APPLIED FOR: </span>
                      <span class="val-bold" style="font-size: 12px; color: #0c4a6e;">${safeVal(data.course)}</span>
                    </td>
                    <td style="width: 40%; background-color: #eef2ff; border: none; border-bottom: 1.5px solid #1e3a8a;">
                      <span class="label" style="color: #3730a3;">MEDIUM: </span>
                      <span class="val-bold" style="font-size: 11px; color: #4338ca;">${safeVal(data.medium)}</span>
                    </td>
                  </tr>
                </table>

                <!-- SECTION 1: CANDIDATE & PARENT DETAILS (Emerald Header) -->
                <div class="section-bar" style="background: linear-gradient(90deg, #047857, #059669) !important; background-color: #047857 !important;">
                  <span>1. CANDIDATE & PARENT DETAILS</span>
                  <span style="font-size: 8.5px; opacity: 0.9;">Section 1</span>
                </div>

                <table class="table-grid" style="border: none;">
                  <tr style="background-color: #f0fdf4;">
                    <td colspan="2" style="border-top: none; border-left: none; border-right: none;">
                      <span class="label">1. Name of Candidate (in BLOCK LETTERS as per SSC): </span>
                      <span class="val-bold" style="font-size: 11px; color: #065f46; text-transform: uppercase;">${safeVal(data.fullName)}</span>
                    </td>
                  </tr>
                  <tr style="background-color: #ffffff;">
                    <td style="width: 50%; border-left: none;">
                      <span class="label">2. Father's / Guardian's Name: </span>
                      <span class="val" style="text-transform: uppercase;">${safeVal(data.fatherName)}</span>
                    </td>
                    <td style="width: 50%; border-right: none;">
                      <span class="label">3. Mother's Name: </span>
                      <span class="val" style="text-transform: uppercase;">${safeVal(data.motherName)}</span>
                    </td>
                  </tr>
                </table>

              </td>

              <!-- Photo Box on Right Column -->
              <td style="width: 22%; text-align: center; vertical-align: middle; background-color: #f8fafc; border: none; padding: 4px;">
                <div class="photo-box">
                  ${
                    data.photoBase64
                      ? `<img src="${data.photoBase64}" alt="Student Photo" />`
                      : `<span style="font-weight:900; font-size:12px; color:#94a3b8; letter-spacing:1px;">PHOTO</span><span style="font-size:8px; color:#94a3b8; margin-top:2px;">Passport Size</span>`
                  }
                </div>
              </td>
            </tr>
          </table>

          <!-- SECTION 2: RESIDENTIAL & POSTAL ADDRESS (Amber Header) -->
          <div class="section-bar" style="background: linear-gradient(90deg, #d97706, #ea580c) !important; background-color: #d97706 !important;">
            <span>2. RESIDENTIAL & POSTAL ADDRESS</span>
            <span style="font-size: 8.5px; opacity: 0.9;">Section 2</span>
          </div>
          <table class="table-grid" style="border: none; border-bottom: 2px solid #d97706;">
            <tr style="background-color: #fffbeb;">
              <th style="width: 50%; border-top: none; border-left: none; text-align: left; background-color: #fef3c7; color: #92400e; font-size: 9.5px;">
                4. Permanent Address
              </th>
              <th style="width: 50%; border-top: none; border-right: none; text-align: left; background-color: #fef3c7; color: #92400e; font-size: 9.5px;">
                5. Present Address for Correspondence
              </th>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="border-left: none; vertical-align: top;">
                <div style="font-size: 9.5px; line-height: 1.35;">
                  <div><span class="label">Door No:</span> ${safeVal(data.permDoorNo)}, <span class="label">Street:</span> ${safeVal(data.permStreet)}</div>
                  <div><span class="label">Village/Town:</span> ${safeVal(data.permVillage)}, <span class="label">Mandal:</span> ${safeVal(data.permMandal)}</div>
                  <div><span class="label">District:</span> ${safeVal(data.permDistrict)}, <span class="label">State:</span> ${safeVal(data.permState)}</div>
                  <div style="margin-top: 2px;"><span class="label">Mobile:</span> <span class="val-bold" style="color: #b45309;">${safeVal(data.permMobile)}</span></div>
                </div>
              </td>
              <td style="border-right: none; vertical-align: top;">
                <div style="font-size: 9.5px; line-height: 1.35;">
                  <div><span class="label">Door No:</span> ${safeVal(data.presDoorNo)}, <span class="label">Street:</span> ${safeVal(data.presStreet)}</div>
                  <div><span class="label">Village/Town:</span> ${safeVal(data.presVillage)}, <span class="label">Mandal:</span> ${safeVal(data.presMandal)}</div>
                  <div><span class="label">District:</span> ${safeVal(data.presDistrict)}, <span class="label">State:</span> ${safeVal(data.presState)}</div>
                  <div style="margin-top: 2px;">
                    <span class="label">Mobile:</span> <span class="val-bold" style="color: #b45309;">${safeVal(data.presMobile)}</span>
                    ${data.telephone ? `&nbsp;·&nbsp;<span class="label">Tel:</span> ${data.telephone}` : ''}
                  </div>
                </div>
              </td>
            </tr>
          </table>

          <!-- SECTION 3: PERSONAL & COMMUNITY PARTICULARS (Purple Header) -->
          <div class="section-bar" style="background: linear-gradient(90deg, #7e22ce, #9333ea) !important; background-color: #7e22ce !important;">
            <span>3. PERSONAL & COMMUNITY PARTICULARS</span>
            <span style="font-size: 8.5px; opacity: 0.9;">Section 3</span>
          </div>
          <table class="table-grid" style="border: none; border-bottom: 2px solid #7e22ce;">
            <tr style="background-color: #faf5ff;">
              <td style="width: 33.33%; border-top: none; border-left: none;">
                <span class="label">7. Date of Birth & Age: </span>
                <span class="val-bold" style="color: #6b21a8;">${safeVal(data.dob)}</span> (${safeVal(data.age)} Yrs)
              </td>
              <td style="width: 33.33%; border-top: none;">
                <span class="label">8. Sex: </span>
                <span>
                  ${checkedIcon(data.gender?.toLowerCase() === 'male')} Male
                  &nbsp;
                  ${checkedIcon(data.gender?.toLowerCase() === 'female')} Female
                </span>
              </td>
              <td style="width: 33.33%; border-top: none; border-right: none;">
                <span class="label">9. Caste: </span>
                <span class="val-bold" style="color: #7e22ce;">${safeVal(data.caste)}</span>
                ${data.subCaste ? `(${data.subCaste})` : ''}
              </td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="border-left: none;">
                <span class="label">10. Mother Tongue: </span>
                <span class="val">${safeVal(data.motherTongue)}</span>
              </td>
              <td>
                <span class="label">11. Nationality & Religion: </span>
                <span class="val">${safeVal(data.nationality)} / Indian</span>
              </td>
              <td style="border-right: none;">
                <span class="label">12. Marital Status: </span>
                <span class="val">${safeVal(data.maritalStatus)}</span>
              </td>
            </tr>
            <tr style="background-color: #faf5ff;">
              <td colspan="3" style="border-left: none; border-right: none; border-bottom: none;">
                <span class="label">13. Place of Birth: </span>
                <span class="val">${safeVal(data.placeOfBirth)}</span>
              </td>
            </tr>
          </table>

          <!-- SECTION 4: IDENTIFICATION & FAMILY PARTICULARS (Cyan Header) -->
          <div class="section-bar" style="background: linear-gradient(90deg, #0e7490, #0891b2) !important; background-color: #0e7490 !important;">
            <span>4. IDENTIFICATION & FAMILY PARTICULARS</span>
            <span style="font-size: 8.5px; opacity: 0.9;">Section 4</span>
          </div>
          <table class="table-grid" style="border: none; border-bottom: 2px solid #0e7490;">
            <tr style="background-color: #ecfeff;">
              <td colspan="2" style="border-top: none; border-left: none; border-right: none;">
                <span class="label">14. Identification Marks (as per SSC Memo):</span>
                <div style="padding-left: 12px; margin-top: 2px; font-size: 9.5px;">
                  <div>1. ${safeVal(data.identificationMark1)}</div>
                  <div>2. ${safeVal(data.identificationMark2)}</div>
                </div>
              </td>
            </tr>
            <tr style="background-color: #ffffff;">
              <td style="width: 50%; border-left: none; border-bottom: none;">
                <span class="label">15. Parent / Guardian Occupation: </span>
                <span class="val">${safeVal(data.parentOccupation)}</span>
              </td>
              <td style="width: 50%; border-right: none; border-bottom: none;">
                <span class="label">16. Annual Income (₹): </span>
                <span class="val-bold" style="color: #0f766e;">${safeVal(data.annualIncome ? `₹ ${Number(data.annualIncome).toLocaleString('en-IN')}` : '')}</span>
              </td>
            </tr>
          </table>

          <!-- SECTION 5: AADHAR CARD & BIOMETRIC PARTICULARS (Rose Header) -->
          <div class="section-bar" style="background: linear-gradient(90deg, #be123c, #e11d48) !important; background-color: #be123c !important;">
            <span>5. AADHAR CARD & BIOMETRIC PARTICULARS</span>
            <span style="font-size: 8.5px; opacity: 0.9;">Section 5</span>
          </div>
          <table class="table-grid" style="border: none; border-bottom: 2px solid #be123c;">
            <tr style="background-color: #fff1f2;">
              <td style="width: 70%; border-top: none; border-left: none; border-bottom: none;">
                <span class="label">17. Aadhar Card Number: </span>
                <div style="display: inline-block; margin-left: 8px;">
                  ${aadharDigits.map((d) => `<span class="digit-box">${d || '&nbsp;'}</span>`).join('')}
                </div>
              </td>
              <td style="width: 30%; border-top: none; border-right: none; border-bottom: none; text-align: center;">
                <span class="val-bold" style="color: #047857; font-size: 9.5px;">✓ Biometric KYC Synced</span>
              </td>
            </tr>
          </table>

          <!-- SECTION 6: DECLARATION & SIGNATURES (Indigo Header) -->
          <div class="section-bar" style="background: linear-gradient(90deg, #3730a3, #4338ca) !important; background-color: #3730a3 !important;">
            <span>6. DECLARATION BY APPLICANT & PARENT</span>
            <span style="font-size: 8.5px; opacity: 0.9;">Section 6</span>
          </div>
          <div style="padding: 6px 8px; background: #faf5ff; font-size: 8px; color: #475569; text-align: justify; line-height: 1.3; border-bottom: 1px solid #e2e8f0;">
            I hereby declare that all particulars stated in this application form are true and complete to the best of my knowledge and belief. I agree to abide by the rules and regulations of the institution.
          </div>

          <!-- Bottom Signatures Grid -->
          <table class="table-grid" style="border: none;">
            <tr style="background-color: #ffffff; height: 42px;">
              <td style="width: 33.33%; vertical-align: bottom; text-align: center; border-left: none; border-bottom: none; border-top: none;">
                <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; font-weight: 800; font-size: 8.5px; color: #0f172a;">
                  Signature of Parent / Guardian
                </div>
              </td>
              <td style="width: 33.33%; vertical-align: bottom; text-align: center; border-bottom: none; border-top: none;">
                <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; font-weight: 800; font-size: 8.5px; color: #0f172a;">
                  Signature of the Candidate
                </div>
              </td>
              <td style="width: 33.33%; vertical-align: bottom; text-align: center; border-right: none; border-bottom: none; border-top: none;">
                <div style="border-top: 1px dashed #94a3b8; padding-top: 3px; font-weight: 800; font-size: 8.5px; color: #0f172a;">
                  Principal / Admissions Officer
                </div>
              </td>
            </tr>
          </table>

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
