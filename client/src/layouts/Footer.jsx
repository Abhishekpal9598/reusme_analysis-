import React from 'react';
import { Bot, ShieldCheck, FileCheck, ExternalLink } from 'lucide-react';
import { Badge } from '../components/common/Badge';

export const Footer = () => {
  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <div className="w-7 h-7 rounded-md bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot className="w-4 h-4" />
              </div>
              CareerAI
            </div>
            <p className="text-slate-400 text-sm max-w-sm leading-relaxed">
              Production-oriented, full-stack AI career platform engineered to deliver structured resume auditing, deterministic job matching, and interview simulations.
            </p>
            <div className="flex items-center gap-2">
              <Badge variant="success" size="sm">Phase 2: Foundation</Badge>
              <span className="text-xs text-slate-500">MERN + Gemini Architecture</span>
            </div>
          </div>

          {/* Quick Specifications */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Architecture Docs
            </h4>
            <ul className="space-y-2 text-xs">
              <li><span className="text-slate-400">PRD & Requirements</span></li>
              <li><span className="text-slate-400">Technical Architecture (TRD)</span></li>
              <li><span className="text-slate-400">REST API Specifications</span></li>
              <li><span className="text-slate-400">Database Schema (Mongoose)</span></li>
            </ul>
          </div>

          {/* Compliance & Security */}
          <div>
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-200 mb-3">
              Security & Privacy
            </h4>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-1.5 text-slate-400">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                HttpOnly Cookie JWT
              </li>
              <li className="flex items-center gap-1.5 text-slate-400">
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                Zod Schema Validation
              </li>
              <li className="text-slate-500 text-[11px] pt-1">
                Zero secret exposure in client bundles.
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer & Copyright */}
        <div className="pt-8 border-t border-slate-900 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>
            &copy; {new Date().getFullYear()} CareerAI. All rights reserved.
          </p>
          <p className="max-w-xl text-center md:text-right text-[11px] text-slate-500">
            <strong>Disclaimer:</strong> Matching scores and alignment metrics reflect semantic analysis and do not represent guaranteed hiring probability or employment offers.
          </p>
        </div>
      </div>
    </footer>
  );
};
