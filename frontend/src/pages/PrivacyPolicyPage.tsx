import React from 'react';
import { ArrowLeft, Shield, Lock, FileText, ExternalLink, Printer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Top Header */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-orange-500/10 text-orange-600 border border-orange-500/20">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-black text-slate-950 tracking-tight">FIT CLUB AI Privacy Policy</h1>
              <p className="text-xs text-slate-500 font-medium">Biometric & Health Telemetry Data Governance</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-slate-600 bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200">
            Effective: Aug 28, 2026
          </span>
          <a
            href="/privacy.html"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white rounded-xl font-bold text-xs transition-all shadow-md shadow-orange-500/20"
          >
            <ExternalLink className="w-4 h-4" />
            Full HTML Document
          </a>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm mb-8">
          <div className="flex items-center gap-3 text-orange-600 mb-3">
            <Lock className="w-5 h-5" />
            <span className="text-xs font-black uppercase tracking-wider">Enterprise Compliance Standard</span>
          </div>
          <h2 className="text-3xl font-black text-slate-950 mb-4">Privacy & Biometric Data Governance Statement</h2>
          <p className="text-slate-600 leading-relaxed text-sm font-medium">
            This document sets forth the complete operational and legal framework governing the collection, biometric vector hashing,
            body composition telemetry processing, retention schedules, and data subject privacy rights across FIT CLUB AI / LazyMonkey AI platforms,
            integrated eSSL eBioserver middleware, and IoT health scanner devices.
          </p>
        </div>

        <div className="space-y-8 text-slate-600 text-sm leading-relaxed">
          {/* Quick Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-lg mb-3">
                01
              </div>
              <h3 className="font-bold text-slate-900 mb-1">Zero Raw Images</h3>
              <p className="text-xs text-slate-500 font-medium">Facial photos and fingerprint images are converted into non-reversible mathematical vector hashes at the hardware layer.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-lg mb-3">
                02
              </div>
              <h3 className="font-bold text-slate-900 mb-1">30-Day Auto Purge</h3>
              <p className="text-xs text-slate-500 font-medium">Biometric vector hashes are automatically purged from hardware & DB memory within 30 days of membership cancellation.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-lg mb-3">
                03
              </div>
              <h3 className="font-bold text-slate-900 mb-1">FIPS AES-256</h3>
              <p className="text-xs text-slate-500 font-medium">All health telemetry and InBody scan logs are encrypted at rest with AES-256 and transmitted over TLS 1.3 encrypted tunnels.</p>
            </div>
          </div>

          {/* Direct Privacy & Data Governance Contact Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm">
            <h4 className="font-black text-slate-950 text-base">FIT CLUB AI / LazyMonkey AI Privacy & Data Governance Office</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Data Protection Officer</span>
                <p className="font-bold text-slate-900"><a href="mailto:roufbaig123@gmail.com" className="hover:text-orange-600">roufbaig123@gmail.com</a></p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Legal Inquiries</span>
                <p className="font-bold text-slate-900"><a href="mailto:roufbaig123@gmail.com" className="hover:text-orange-600">roufbaig123@gmail.com</a></p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Global Support Line</span>
                <p className="font-bold text-slate-900"><a href="tel:+919849344919" className="hover:text-orange-600">+91 98493 44919</a></p>
              </div>
              <div className="space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Direct WhatsApp</span>
                <p className="font-extrabold text-emerald-600"><a href="https://wa.me/919849344919" target="_blank" rel="noopener noreferrer" className="hover:underline">+91 98493 44919</a></p>
              </div>
            </div>
          </div>

          {/* Embedded Full HTML Link Notification */}
          <div className="p-6 rounded-3xl bg-orange-50/50 border border-orange-200 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-black text-slate-950 text-base mb-1">View Complete 3,500+ Word Statutory Legal Policy</h4>
              <p className="text-xs text-slate-600 font-medium">Includes BIPA (Illinois 740 ILCS 14/), GDPR Art. 9, CCPA/CPRA, and HIPAA alignment statutory clauses.</p>
            </div>
            <a
              href="/privacy.html"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-black text-xs transition-colors shrink-0 flex items-center gap-2 shadow-md shadow-orange-600/20"
            >
              Open Full HTML Policy <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>
      </main>
    </div>
  );
}
