import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { ShieldCheck, HelpCircle, AlertCircle } from 'lucide-react';

export const ReadinessGauge = ({ careerReadiness }) => {
  const {
    overallScore = null,
    resumeQuality = null,
    jobFitAlignment = null,
    interviewMastery = null,
    applicationPipeline = null,
    availableDimensions = [],
    weightsUsed = {},
    missingComponents = [],
    disclaimer,
  } = careerReadiness || {};

  // Derive transparent descriptive score band without comparative percentile claims
  const getDescriptiveBand = (score) => {
    if (score === null || score === undefined) {
      return { label: 'Unassessed / Pending Data', variant: 'default' };
    }
    if (score >= 85) {
      return { label: 'Advanced Readiness', variant: 'success' };
    }
    if (score >= 70) {
      return { label: 'Competitive Readiness', variant: 'info' };
    }
    if (score >= 50) {
      return { label: 'Developing Competence', variant: 'warning' };
    }
    return { label: 'Foundational Exploration', variant: 'default' };
  };

  const band = getDescriptiveBand(overallScore);

  const dimensions = [
    {
      key: 'resumeQuality',
      name: 'Resume Quality Audit',
      score: resumeQuality,
      baseWeight: 25,
      isAvailable: availableDimensions.includes('resumeQuality') && resumeQuality !== null,
    },
    {
      key: 'jobFitAlignment',
      name: 'Job Semantic Alignment',
      score: jobFitAlignment,
      baseWeight: 30,
      isAvailable: availableDimensions.includes('jobFitAlignment') && jobFitAlignment !== null,
    },
    {
      key: 'interviewMastery',
      name: 'Mock Interview Performance',
      score: interviewMastery,
      baseWeight: 25,
      isAvailable: availableDimensions.includes('interviewMastery') && interviewMastery !== null,
    },
    {
      key: 'applicationPipeline',
      name: 'Application Pipeline Activity',
      score: applicationPipeline,
      baseWeight: 20,
      isAvailable: availableDimensions.includes('applicationPipeline') && applicationPipeline !== null,
    },
  ];

  // SVG Gauge calculations
  const size = 180;
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset =
    overallScore !== null && overallScore !== undefined
      ? circumference - (overallScore / 100) * circumference
      : circumference;

  const getScoreColor = (score) => {
    if (score === null || score === undefined) return 'text-slate-500';
    if (score >= 85) return 'text-emerald-400';
    if (score >= 70) return 'text-sky-400';
    if (score >= 50) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getStrokeColor = (score) => {
    if (score === null || score === undefined) return '#475569';
    if (score >= 85) return '#10b981'; // emerald-500
    if (score >= 70) return '#38bdf8'; // sky-400
    if (score >= 50) return '#f59e0b'; // amber-500
    return '#f43f5e'; // rose-500
  };

  return (
    <Card className="h-full flex flex-col justify-between space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Career Readiness Index (CRI)
            </h3>
            <span
              className="text-slate-500 hover:text-slate-300 transition-colors cursor-help"
              title="Deterministic server-side composite score calculated solely from your authentic resumes, job audits, interview scores, and pipeline momentum."
            >
              <HelpCircle className="w-4 h-4" />
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Multi-dimensional capability and readiness rubric
          </p>
        </div>
        <Badge variant={band.variant} size="md">
          {band.label}
        </Badge>
      </div>

      {/* SVG Circular Gauge & Overall Score */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        <div className="relative flex items-center justify-center shrink-0">
          <svg width={size} height={size} className="transform -rotate-90">
            {/* Background Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#1e293b"
              strokeWidth={strokeWidth}
              fill="transparent"
            />
            {/* Value Circle */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke={getStrokeColor(overallScore)}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-1000 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            {overallScore !== null && overallScore !== undefined ? (
              <>
                <span className={`text-4xl font-extrabold tracking-tight ${getScoreColor(overallScore)}`}>
                  {overallScore}
                </span>
                <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                  Out of 100
                </span>
              </>
            ) : (
              <div className="px-4 text-center">
                <span className="text-xs font-semibold text-amber-400 block">
                  Pending Data
                </span>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Artifacts needed
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Missing Dimensions / Status Callout */}
        <div className="flex-1 space-y-2 text-xs">
          {overallScore === null || overallScore === undefined ? (
            <div className="p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-200 space-y-1.5">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Insufficient Activity for Index</span>
              </div>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                CareerAI does not fabricate placeholder scores. Upload a resume, match a target job, or practice an interview to unlock your verified score.
              </p>
            </div>
          ) : (
            <div className="space-y-1.5 text-slate-300">
              <div className="flex items-center gap-1.5 font-medium text-emerald-400">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>Verified Deterministic Score</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Calculated dynamically across active dimensions. Missing dimensions are proportionally excluded from the denominator to ensure fair assessment.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 4 Dimension Breakdown Bars */}
      <div className="space-y-3 pt-4 border-t border-slate-800/80">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
          Component Dimension Breakdown
        </h4>
        <div className="space-y-2.5">
          {dimensions.map(({ key, name, score, baseWeight, isAvailable }) => {
            const normalizedWeight = weightsUsed[key]
              ? Math.round(weightsUsed[key] * 100)
              : baseWeight;

            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-300 font-medium">{name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400">
                      {isAvailable ? `Weight: ${normalizedWeight}%` : 'Unassessed'}
                    </span>
                    <span className="font-semibold text-slate-200 min-w-[45px] text-right">
                      {isAvailable && score !== null ? `${score}/100` : '—'}
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 rounded-full ${
                      isAvailable ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    style={{ width: `${isAvailable && score !== null ? score : 0}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Advisory Legal Disclaimer */}
      <div className="pt-3 border-t border-slate-800 text-[10px] text-slate-400 leading-tight">
        * {disclaimer || 'The Career Readiness Index is an assistive metric based on verified profile alignment and does not constitute a guarantee of employment.'}
      </div>
    </Card>
  );
};

export default ReadinessGauge;
