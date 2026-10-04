import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Shield,
  Lock,
  Search,
  Printer,
  ChevronRight,
  Database,
  UserCheck,
  Server,
  FileCheck,
  Clock,
  AlertTriangle,
  Mail,
  Building2,
  Cpu,
  Scale,
  CheckCircle2
} from 'lucide-react';
import { Logo } from '@/components/layout/Logo';

interface Section {
  id: string;
  number: string;
  title: string;
  badge?: string;
  icon: React.ElementType;
  content: React.ReactNode;
}

export function PrivacyPolicyPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string>('sec-intro');

  const effectiveDate = 'October 2026';

  const sections: Section[] = useMemo(() => [
    {
      id: 'sec-intro',
      number: '01',
      title: 'Introduction, Scope & Platform Architecture',
      badge: 'Scope & Roles',
      icon: Building2,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            Welcome to <strong>VAHD</strong>, developed and operated by <strong>LazyMonkey AI</strong> (&quot;LazyMonkey AI&quot;, &quot;Platform&quot;, &quot;We&quot;, &quot;Us&quot;, or &quot;Our&quot;).
            VAHD provides an enterprise-grade, multi-tenant software-as-a-service (SaaS) ecosystem, IoT hardware middleware, biometric attendance management,
            Human Resource Management Systems (HRMS), Point of Sale (POS) billing, and member mobile companions designed for fitness clubs, gym owners, martial arts academies, and wellness enterprises.
          </p>
          <p className="text-slate-600 leading-relaxed text-sm">
            This Privacy and Biometric Data Governance Policy explains in comprehensive detail how personal data, employee records, financial transactions,
            and mathematical biometric vector representations are collected, processed, encrypted, stored, and permanently deleted when using VAHD services.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 pt-2">
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100">
              <span className="text-xs font-bold text-blue-900 block mb-1">Facility Operator (Gym Owner) as Data Controller</span>
              <p className="text-xs text-blue-700 leading-relaxed">
                The gym business entity or enterprise subscribing to VAHD acts as the primary <strong>Data Controller</strong> determining the purposes of collecting member and staff records.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-100">
              <span className="text-xs font-bold text-emerald-900 block mb-1">LazyMonkey AI as Data Processor</span>
              <p className="text-xs text-emerald-700 leading-relaxed">
                LazyMonkey AI operates strictly as the <strong>Data Processor</strong> providing enterprise cloud infrastructure, multi-tenant isolation, automated telemetry, and device sync.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-collection',
      number: '02',
      title: 'Categories of Personal Data Collected',
      badge: 'Data Inventory',
      icon: Database,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            Depending on your role (Facility Owner, Staff / Trainer, Member / Student, or SuperAdmin), we collect and process the following specific categories of information:
          </p>

          <div className="space-y-3">
            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-600" />
                Identity &amp; Profile Information
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Full legal name, phone number, email address, gender, date of birth, emergency contact, postal address, profile avatar, and assigned membership plan / batch ID.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                Staff &amp; HRMS Employment Records
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Employee designation, department, work shift timings, base salary, hourly trainer rates, bank payout details (for automated payroll calculation), leave requests, and attendance correction logs.
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-600" />
                Point of Sale (POS) &amp; Billing Data
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                Itemized transaction history, payment mode (Cash, UPI, Card, Bank Transfer), tax breakdown (GST/VAT), discount vouchers, and invoice PDF audit trails. <em>We never store credit card CVV or raw banking credentials.</em>
              </p>
            </div>

            <div className="border border-slate-200 rounded-2xl p-4 bg-white shadow-xs">
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600" />
                Technical &amp; Telemetry Data
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                IP address, user-agent device string, session JWT tokens, operating system details, audit event timestamps, and device sync health metrics.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-biometrics',
      number: '03',
      title: 'Biometric Data Governance & Vector Encryption',
      badge: 'Zero Raw Image Guarantee',
      icon: Shield,
      content: (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-sm block mb-0.5">Zero Raw Image Storage Policy</span>
              <p className="text-xs text-emerald-800 leading-relaxed">
                VAHD <strong>never</strong> stores raw high-resolution facial photographs or fingerprint image bitmaps in its database. All biometric data is converted into irreversible, one-way mathematical coordinate vectors at the hardware boundary layer.
              </p>
            </div>
          </div>

          <h4 className="text-sm font-bold text-slate-900 pt-2">Biometric Processing Lifecycle:</h4>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside leading-relaxed pl-1">
            <li><strong>Hardware Feature Extraction:</strong> When enrolling on integrated terminals (e.g. eSSL AiFace, biometric readers), proprietary algorithms calculate distance vectors between facial landmarks (nodal coordinates) or fingerprint minutiae points.</li>
            <li><strong>Irreversible Vector Hashing:</strong> The output is a binary vector string. It is mathematically impossible to reconstruct the original human face or fingerprint from this hash.</li>
            <li><strong>Transmission Security:</strong> Vector templates synced between local eBioserver middleware and cloud instances are transmitted over AES-256 TLS 1.3 encrypted tunnels.</li>
            <li><strong>Immediate Revocation &amp; Purge:</strong> When a member account is cancelled or employee is offboarded, biometric templates are purged from both cloud databases and edge device flash memory within 30 days.</li>
          </ul>

          <div className="p-3.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-600">
            <strong>Statutory Alignment:</strong> Complies with the Illinois Biometric Information Privacy Act (740 ILCS 14/ - BIPA), EU GDPR Article 9 (Special Category Data), and India Digital Personal Data Protection (DPDP) Act 2023.
          </div>
        </div>
      )
    },
    {
      id: 'sec-hrms',
      number: '04',
      title: 'HRMS, Attendance Tracking & Geofencing',
      badge: 'Staff & Payroll',
      icon: Clock,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            VAHD provides automated HRMS workflows for facility owners to manage employee shifts, biometric check-ins, leaves, and salary disbursements:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-bold text-xs text-slate-900 block mb-1">Time &amp; Attendance Logs</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Biometric punch-in and punch-out timestamps are recorded with millisecond precision to calculate working hours, overtime, late marks, and half-days.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-bold text-xs text-slate-900 block mb-1">Attendance Corrections Audit Trail</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Any manual attendance correction requested by staff requires explicit Facility Owner review and approval. Every change is logged with timestamp and reviewer ID.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-bold text-xs text-slate-900 block mb-1">Geofence Location Verification</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Mobile companion clock-ins use device GPS exclusively at the exact instant of clocking in to verify proximity to the gym premises. We do <strong>not</strong> track background location.
              </p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="font-bold text-xs text-slate-900 block mb-1">Automated Salary &amp; Payroll Computation</span>
              <p className="text-xs text-slate-500 leading-relaxed">
                Salary generation processes shift attendance and approved leaves to generate monthly payslips. Salary records are retained in compliance with local labour laws.
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-multitenant',
      number: '05',
      title: 'Multi-Tenant Architecture & Data Isolation',
      badge: 'Enterprise Isolation',
      icon: Server,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            VAHD employs a multi-tenant cloud database design with strict tenant-level isolation:
          </p>

          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside leading-relaxed">
            <li><strong>Row-Level &amp; Tenant ID Partitioning:</strong> Every member, staff, invoice, and attendance record is permanently keyed to a unique <code className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-800 font-mono">tenant_id</code> (or gym ID). Cross-tenant queries are blocked at the database engine and API middleware levels.</li>
            <li><strong>Role-Based Access Control (RBAC):</strong> Four distinct access roles (SuperAdmin, Owner, Employees/Trainers, Students/Members) ensure that users only have visibility into data strictly necessary for their authorized role.</li>
            <li><strong>Encrypted Database Storage:</strong> PostgreSQL database volumes are encrypted at rest using AES-256 encryption. Automated point-in-time recovery (PITR) backups are stored in geo-redundant encrypted storage.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-iot',
      number: '06',
      title: 'IoT Hardware, Middleware & Device Integration',
      badge: 'Hardware Sync',
      icon: Cpu,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            VAHD connects to local physical gym devices via secure middleware bridges (e.g., eSSL Biometric Middleware, turnstile access controllers, USB thermal POS receipt printers):
          </p>

          <div className="space-y-2.5">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">Biometric Turnstile Controllers</strong>
              <p className="text-slate-600">Syncs authorized active membership status over local network sockets (TCP/IP). When a membership expires, the turnstile automatically blocks entry without transmitting member financial data to the local terminal.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
              <strong className="text-slate-900 block mb-0.5">Thermal POS Receipt Printers</strong>
              <p className="text-slate-600">Prints formatted billing receipts locally via Web-USB or ESC/POS serial protocols. Print jobs are handled locally in memory and never cached as plaintext on disk.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-security',
      number: '07',
      title: 'Security Safeguards & Encryption Standards',
      badge: 'AES-256 & TLS 1.3',
      icon: Lock,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            We implement defense-in-depth technical, administrative, and physical security measures to safeguard your enterprise records:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
              <div className="text-blue-600 font-black text-xl mb-1">TLS 1.3</div>
              <span className="text-xs font-bold text-slate-800 block">In-Transit Encryption</span>
              <p className="text-[11px] text-slate-500 mt-1">All HTTPS API calls and WebSocket streams are encrypted using TLS 1.3 with modern cipher suites.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
              <div className="text-emerald-600 font-black text-xl mb-1">AES-256</div>
              <span className="text-xs font-bold text-slate-800 block">At-Rest Encryption</span>
              <p className="text-[11px] text-slate-500 mt-1">Database volumes, disk snapshots, and cloud object stores are protected with FIPS-validated AES-256.</p>
            </div>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-center shadow-xs">
              <div className="text-purple-600 font-black text-xl mb-1">JWT + Argon2</div>
              <span className="text-xs font-bold text-slate-800 block">Authentication &amp; Passwords</span>
              <p className="text-[11px] text-slate-500 mt-1">Passwords are salted and hashed using Argon2/Bcrypt. Sessions use time-limited signed JWT tokens.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-retention',
      number: '08',
      title: 'Data Retention & Automated Purge Schedules',
      badge: 'Data Lifecycle',
      icon: Clock,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            We do not retain personal data longer than necessary for the operational and legal purposes specified in this policy:
          </p>

          <div className="overflow-hidden border border-slate-200 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <th className="p-3">Data Classification</th>
                  <th className="p-3">Retention Period</th>
                  <th className="p-3">Purge Mechanism</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-600 bg-white">
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Biometric Vector Hashes</td>
                  <td className="p-3">30 days post membership cancellation / termination</td>
                  <td className="p-3 text-emerald-600 font-medium">Automatic hardware &amp; DB purge</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">HRMS Daily Attendance Logs</td>
                  <td className="p-3">3 years (statutory labour compliance)</td>
                  <td className="p-3">Automated database archiving</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">Invoices &amp; Financial Tax Logs</td>
                  <td className="p-3">7 years (statutory tax compliance)</td>
                  <td className="p-3">Permanent audit storage lock</td>
                </tr>
                <tr>
                  <td className="p-3 font-semibold text-slate-800">API Access &amp; Audit Logs</td>
                  <td className="p-3">90 days rolling window</td>
                  <td className="p-3">Automatic log rotation and deletion</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )
    },
    {
      id: 'sec-rights',
      number: '09',
      title: 'Your Privacy Rights & Data Subject Access Requests',
      badge: 'User Rights',
      icon: UserCheck,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            Regardless of your geographical jurisdiction, VAHD affords every user clear, actionable rights over their personal data:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900 block mb-1">1. Right to Access &amp; Portability</strong>
              <p className="text-slate-600">Request a full machine-readable JSON/CSV export of your profile, attendance history, and payment invoices.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900 block mb-1">2. Right to Rectification</strong>
              <p className="text-slate-600">Correct any inaccurate or incomplete personal information directly in your profile or via your gym administrator.</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900 block mb-1">3. Right to Erasure (&quot;Right to be Forgotten&quot;)</strong>
              <p className="text-slate-600">Request the permanent deletion of your profile and biometric vectors upon membership termination (subject to statutory tax retention).</p>
            </div>
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
              <strong className="text-slate-900 block mb-1">4. Right to Withdraw Consent</strong>
              <p className="text-slate-600">Opt-out of biometric check-ins at any time and choose alternate manual PIN or RFID card check-in methods without penalty.</p>
            </div>
          </div>
        </div>
      )
    },
    {
      id: 'sec-statutory',
      number: '10',
      title: 'Statutory Compliance & Legal Frameworks',
      badge: 'Global Compliance',
      icon: Scale,
      content: (
        <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
          <p>VAHD is architected in adherence with major international and domestic data protection statutes:</p>
          <div className="space-y-2">
            <p><strong>• India Digital Personal Data Protection Act, 2023 (DPDP Act):</strong> We process personal data exclusively for lawful purposes with clear consent mechanisms and grievance redressal channels.</p>
            <p><strong>• EU / UK General Data Protection Regulation (GDPR):</strong> Compliant with Article 6 (Lawfulness), Article 9 (Special Category Biometric Data), and Article 28 (Data Processor Contractual Terms).</p>
            <p><strong>• California Consumer Privacy Act (CCPA / CPRA):</strong> We do not sell, rent, or trade your personal information to third parties. We support consumer opt-out and deletion requests.</p>
            <p><strong>• Illinois Biometric Information Privacy Act (740 ILCS 14/ - BIPA):</strong> Clear written notice, express consent, secure mathematical vector extraction, and documented retention and disposal schedules.</p>
          </div>
        </div>
      )
    },
    {
      id: 'sec-breach',
      number: '11',
      title: 'Security Incident Response & 72-Hour Protocol',
      badge: 'Incident Protocol',
      icon: AlertTriangle,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            LazyMonkey AI maintains a comprehensive Security Incident Response Plan. In the unlikely event of a confirmed security incident affecting unencrypted personal data:
          </p>
          <ul className="space-y-2 text-xs text-slate-600 list-disc list-inside leading-relaxed">
            <li><strong>72-Hour Notification:</strong> Affected Facility Operators and relevant statutory supervisory authorities will be formally notified within 72 hours of incident confirmation.</li>
            <li><strong>Containment &amp; Forensics:</strong> Dedicated security engineering personnel immediately isolate affected nodes, revoke compromised tokens, and execute forensic analysis.</li>
            <li><strong>Remediation Transparency:</strong> Comprehensive incident logs and remediation guidelines will be provided to all affected account administrators.</li>
          </ul>
        </div>
      )
    },
    {
      id: 'sec-contact',
      number: '12',
      title: 'Contact, Grievance Redressal & Data Protection Officer',
      badge: 'Support & Inquiries',
      icon: Mail,
      content: (
        <div className="space-y-4">
          <p className="text-slate-600 leading-relaxed text-sm">
            For questions regarding this Privacy Policy, biometric data inquiries, or to exercise your statutory privacy rights, please contact our Data Governance Office:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Data Protection Officer</span>
              <h5 className="font-bold text-slate-900 text-sm">Yashwanth Polepalli</h5>
              <p className="text-xs text-blue-600 mt-1">
                <a href="mailto:roufbaig123@gmail.com" className="hover:underline">roufbaig123@gmail.com</a>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Grievance &amp; Legal Desk</span>
              <h5 className="font-bold text-slate-900 text-sm">LazyMonkey AI Legal</h5>
              <p className="text-xs text-blue-600 mt-1">
                <a href="mailto:support@lazymonkey.ai" className="hover:underline">support@lazymonkey.ai</a>
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">Corporate Headquarters</span>
              <h5 className="font-bold text-slate-900 text-sm">LazyMonkey AI Inc.</h5>
              <p className="text-xs text-slate-500 mt-1">VAHD Cloud Operations, Hyderabad, Telangana, India</p>
            </div>
          </div>
        </div>
      )
    }
  ], []);

  // Filter sections based on search query
  const filteredSections = useMemo(() => {
    if (!searchQuery.trim()) return sections;
    const q = searchQuery.toLowerCase();
    return sections.filter(
      s => s.title.toLowerCase().includes(q) || s.badge?.toLowerCase().includes(q)
    );
  }, [sections, searchQuery]);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      const yOffset = -90;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
            title="Go Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <Logo size="sm" />
            <div className="hidden sm:block h-5 w-[1px] bg-slate-200" />
            <div>
              <h1 className="text-sm sm:text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                Privacy &amp; Data Governance Policy
              </h1>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                VAHD Enterprise Architecture &amp; Biometric Security Standard
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <span className="hidden md:inline-flex text-[11px] font-bold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Updated: {effectiveDate}
          </span>
          <button
            type="button"
            onClick={() => window.print()}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs transition shadow-2xs cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Print Policy</span>
          </button>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 text-white py-12 px-4 sm:px-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-6xl mx-auto relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-400/20 text-xs font-bold text-blue-400">
            <Shield className="w-3.5 h-3.5" />
            <span>Enterprise Compliance &amp; Biometric Governance</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white max-w-2xl leading-tight">
            Protecting Your Enterprise Data, Member Privacy &amp; Biometrics
          </h2>

          <p className="text-slate-300 text-sm sm:text-base max-w-3xl leading-relaxed">
            Detailed disclosure of personal information processing, irreversible biometric vector hashing,
            multi-tenant database security, HRMS telemetry, and data subject privacy rights across VAHD platforms.
          </p>

          {/* Quick Search Bar */}
          <div className="pt-2 max-w-xl">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search topics (e.g., biometrics, retention, HRMS, encryption, deletion)..."
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/10 border border-white/15 text-white placeholder-slate-400 text-xs font-medium focus:outline-hidden focus:ring-2 focus:ring-blue-500 transition"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

          {/* LEFT SIDEBAR: Table of Contents */}
          <aside className="lg:col-span-4 sticky top-24 hidden lg:block bg-white border border-slate-200 rounded-3xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Table of Contents</span>
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">
                {sections.length} Sections
              </span>
            </div>

            <nav className="space-y-1 max-h-[calc(100vh-180px)] overflow-y-auto pr-1">
              {sections.map((sec) => {
                const isSelected = activeSection === sec.id;
                return (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition ${isSelected
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-2xs'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-[10px] font-black text-slate-400 font-mono w-4">{sec.number}</span>
                      <span className="truncate">{sec.title}</span>
                    </div>
                    <ChevronRight className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-blue-600' : 'text-slate-400'}`} />
                  </button>
                );
              })}
            </nav>
          </aside>

          {/* RIGHT COLUMN: Comprehensive Sections Content */}
          <main className="lg:col-span-8 space-y-6">
            {filteredSections.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center space-y-3">
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <h3 className="font-bold text-slate-900">No matching sections found</h3>
                <p className="text-xs text-slate-500">Try searching for different keywords like &quot;biometric&quot;, &quot;HRMS&quot;, or &quot;encryption&quot;.</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-xs font-bold text-blue-600 hover:underline"
                >
                  Clear search query
                </button>
              </div>
            ) : (
              filteredSections.map((sec) => {
                const IconComponent = sec.icon;
                return (
                  <section
                    key={sec.id}
                    id={sec.id}
                    className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xs space-y-4 scroll-mt-24 transition-all hover:border-slate-300"
                  >
                    {/* Section Header */}
                    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-sm border border-blue-100 shrink-0">
                          <IconComponent className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="text-[10px] font-black tracking-widest text-slate-400 uppercase font-mono">
                            Section {sec.number}
                          </div>
                          <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                            {sec.title}
                          </h3>
                        </div>
                      </div>

                      {sec.badge && (
                        <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase tracking-wide bg-slate-100 text-slate-700 border border-slate-200">
                          {sec.badge}
                        </span>
                      )}
                    </div>

                    {/* Section Body */}
                    <div className="pt-1">
                      {sec.content}
                    </div>
                  </section>
                );
              })
            )}

            {/* Bottom Contact / Legal Verification Box */}
            <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 space-y-4">
              <div className="flex items-center gap-3">
                <FileCheck className="w-6 h-6 text-emerald-400" />
                <h4 className="text-base font-black">Statutory Acknowledgement &amp; Acceptance</h4>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                By logging in, creating accounts, or enrolling biometric hardware in VAHD, facility operators, employees,
                and members acknowledge and agree to this Privacy Policy. This document is updated periodically.
              </p>
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs border-t border-white/10 text-slate-400">
                <span>© 2026 LazyMonkey AI Inc. • VAHD Platform</span>
                <button
                  type="button"
                  onClick={() => navigate('/login')}
                  className="font-bold text-blue-400 hover:text-blue-300 cursor-pointer"
                >
                  Return to Login Portal →
                </button>
              </div>
            </div>

          </main>
        </div>
      </div>
    </div>
  );
}
