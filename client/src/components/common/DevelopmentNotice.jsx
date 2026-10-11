import React from 'react';
import { Construction, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const DevelopmentNotice = ({
  featureName = 'Feature',
  phaseNumber = 'Phase 3+',
  description = 'This module is scheduled for implementation in upcoming engineering phases according to the project roadmap.',
  actionLink = '/dashboard',
  actionText = 'Back to Dashboard',
}) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-6 text-center max-w-lg mx-auto my-8">
      <div className="inline-flex p-3 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-4">
        <Construction className="w-6 h-6" />
      </div>
      <h3 className="text-lg font-semibold text-slate-100 mb-2">{featureName} (In Development)</h3>
      <p className="text-sm text-slate-400 mb-4 leading-relaxed">
        {description}
      </p>
      <div className="inline-block px-3 py-1 rounded bg-slate-800 text-xs font-mono text-slate-300 mb-6">
        Status: Scheduled for {phaseNumber}
      </div>
      <div>
        <Link
          to={actionLink}
          className="inline-flex items-center gap-2 text-sm text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
        >
          {actionText} <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
};
