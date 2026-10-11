import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { CheckCircle2, AlertTriangle, HelpCircle, Search, Flame, ShieldCheck } from 'lucide-react';

export const SkillGapMatrix = ({ skillAnalysis }) => {
  const [filter, setFilter] = useState('');
  const [activeTab, setActiveTab] = useState('critical'); // 'critical' | 'mastered' | 'partial'

  const {
    masteredSkills = [],
    criticalGaps = [],
    partialGaps = [],
  } = skillAnalysis || {};

  const getSkillName = (item) => {
    if (!item) return '';
    if (typeof item === 'string') return item;
    return item.skillName || item.skill || '';
  };

  const matchesSearch = (item) => {
    if (!filter) return true;
    const q = filter.toLowerCase();
    const name = getSkillName(item).toLowerCase();
    const cat = (item.category || item.proficiencyStatus || '').toLowerCase();
    return name.includes(q) || cat.includes(q);
  };

  const filteredMastered = masteredSkills.filter(matchesSearch);
  const filteredCritical = criticalGaps.filter(matchesSearch);
  const filteredPartial = partialGaps.filter(matchesSearch);

  const getSourceLabel = (src) => {
    switch (src) {
      case 'resume_identified':
        return 'Verified on Resume';
      case 'job_requirement':
        return 'Required by Target Job';
      case 'interview_deficit':
        return 'Interview Deficit';
      case 'ai_inferred':
        return 'Context Inferred';
      default:
        return 'Analyzed Artifact';
    }
  };

  return (
    <Card className="space-y-6">
      {/* Header & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Skill Competency & Gap Matrix
          </h3>
          <p className="text-xs text-slate-400">
            Grounded comparison between your verified proficiencies and target job requirements
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search skills or category..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Segmented View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('critical')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'critical'
              ? 'bg-rose-950/80 text-rose-300 border border-rose-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Critical Gaps</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-rose-900/60 text-rose-200">
            {filteredCritical.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('mastered')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'mastered'
              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Mastered Skills</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-emerald-900/60 text-emerald-200">
            {filteredMastered.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('partial')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer ${
            activeTab === 'partial'
              ? 'bg-amber-950/80 text-amber-300 border border-amber-700/80 shadow-sm'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Partial / In-Progress</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-900/60 text-amber-200">
            {filteredPartial.length}
          </span>
        </button>
      </div>

      {/* Tab Panels */}
      <div>
        {activeTab === 'critical' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              High-priority competencies required by your matched job descriptions that are currently absent from your verified resume:
            </p>
            {filteredCritical.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No critical skill gaps identified. Either your skills align closely with analyzed roles, or additional job descriptions are needed.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredCritical.map((item, idx) => {
                  const skillName = getSkillName(item);
                  const source = getSourceLabel(item.sourceAttribution);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-rose-950/20 border border-rose-900/30 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-rose-200">
                          {skillName}
                        </span>
                        {item.demandFrequency > 1 && (
                          <span className="flex items-center gap-1 text-[10px] font-medium text-rose-400 shrink-0 bg-rose-900/40 px-1.5 py-0.5 rounded">
                            <Flame className="w-3 h-3 text-rose-400" />
                            {item.demandFrequency}x match
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-rose-900/20">
                        <span>{source}</span>
                        <span className="text-rose-400 font-medium">Critical</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'mastered' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Skills validated across your ingested resume and demonstrated in mock interviews:
            </p>
            {filteredMastered.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No mastered skills recorded yet. Upload a resume to automatically extract verified competencies.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredMastered.map((item, idx) => {
                  const skillName = getSkillName(item);
                  const source = getSourceLabel(item.sourceAttribution);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-emerald-200">
                          {skillName}
                        </span>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-emerald-900/20">
                        <span>{source}</span>
                        <span className="text-emerald-400 font-medium">Validated</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'partial' && (
          <div className="space-y-4">
            <p className="text-xs text-slate-400">
              Areas where partial experience was detected or foundational concepts were mentioned without full depth:
            </p>
            {filteredPartial.length === 0 ? (
              <div className="p-6 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
                No partial skill gaps recorded.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {filteredPartial.map((item, idx) => {
                  const skillName = getSkillName(item);
                  const source = getSourceLabel(item.sourceAttribution);

                  return (
                    <div
                      key={idx}
                      className="p-3 rounded-lg bg-amber-950/20 border border-amber-900/30 flex flex-col justify-between space-y-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-sm font-semibold text-amber-200">
                          {skillName}
                        </span>
                        <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-amber-900/20">
                        <span>{source}</span>
                        <span className="text-amber-400 font-medium">Deepen</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};

export default SkillGapMatrix;
