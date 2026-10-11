import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Target, TrendingUp, Compass, Check, X, ShieldCheck } from 'lucide-react';

export const RoleRecommendationsCard = ({ roleRecommendations = [] }) => {
  const getCategoryBadge = (category) => {
    switch (category) {
      case 'Target Role':
        return {
          icon: Target,
          variant: 'success',
          label: 'Direct Target Role',
        };
      case 'Growth Role':
        return {
          icon: TrendingUp,
          variant: 'purple',
          label: 'Upskill Growth Path',
        };
      case 'Lateral Role':
        return {
          icon: Compass,
          variant: 'info',
          label: 'Lateral / Adjacent Pivot',
        };
      default:
        return {
          icon: Target,
          variant: 'default',
          label: category || 'Recommended Role',
        };
    }
  };

  const getSourceAttributionLabel = (source) => {
    switch (source) {
      case 'skill_overlap':
        return 'Grounded: Skill Overlap';
      case 'market_trend':
        return 'Market Trend Analysis';
      case 'ai_synthesized':
        return 'AI Synthesized Alignment';
      default:
        return 'Synthesized Pathway';
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Job Role Recommendations
          </h3>
          <p className="text-xs text-slate-400">
            Target, growth, and lateral career paths synthesized from verified competency overlaps
          </p>
        </div>
        <Badge variant="teal" size="sm">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Evidence-Grounded
        </Badge>
      </div>

      {roleRecommendations.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
          No role recommendations generated yet. Ingest your resume or evaluate job postings to receive evidence-based role pathways.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {roleRecommendations.map((rec, idx) => {
            const roleName = rec.roleTitle || rec.role || 'Career Opportunity';
            const roleCategory = rec.category || rec.recommendationType || 'Target Role';
            const catConfig = getCategoryBadge(roleCategory);
            const CatIcon = catConfig.icon;
            const attribution = getSourceAttributionLabel(rec.sourceAttribution);

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 flex flex-col justify-between space-y-4 hover:border-slate-700 transition-all"
              >
                {/* Top Badge & Alignment Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant={catConfig.variant} size="sm">
                      <CatIcon className="w-3 h-3 mr-1" />
                      {catConfig.label}
                    </Badge>
                    {rec.alignmentScore !== undefined && rec.alignmentScore !== null && (
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded border border-emerald-800/40">
                        {rec.alignmentScore}% Match
                      </span>
                    )}
                  </div>

                  <h4 className="text-base font-bold text-white pt-1">
                    {roleName}
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {rec.rationale}
                  </p>
                </div>

                {/* Skill Overlap Breakdown */}
                <div className="space-y-2 pt-2 border-t border-slate-800/60 text-xs">
                  {rec.matchedSkills && rec.matchedSkills.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">
                        Matched Proficiencies ({rec.matchedSkills.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rec.matchedSkills.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-900/40 text-[11px] text-emerald-300 font-medium"
                          >
                            <Check className="w-2.5 h-2.5 text-emerald-400" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {rec.missingSkills && rec.missingSkills.length > 0 && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">
                        Competencies to Acquire ({rec.missingSkills.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {rec.missingSkills.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-950/40 border border-amber-900/40 text-[11px] text-amber-300 font-medium"
                          >
                            <X className="w-2.5 h-2.5 text-amber-400" />
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Grounding & Compensation Notice */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span className="text-slate-400 font-mono text-[10px]">
                    {attribution}
                  </span>
                  <span className="text-slate-500 italic text-[10px]">
                    Salary: Not available (Advisory)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Advisory Note */}
      <div className="text-[10px] text-slate-400 leading-tight">
        * Advisory Notice: Recommendations reflect candidate skill overlap and semantic match heuristics. We do not invent unsupported market statistics or unverified compensation ranges.
      </div>
    </Card>
  );
};

export default RoleRecommendationsCard;
