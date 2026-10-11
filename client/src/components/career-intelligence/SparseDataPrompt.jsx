import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  Sparkles,
  FileText,
  Target,
  MessageSquareCode,
  Kanban,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

export const SparseDataPrompt = ({
  dataPointsUsed = {},
  availableDimensions = [],
  isColdStart = false,
}) => {
  const {
    resumesCount = 0,
    jobMatchesCount = 0,
    interviewSessionsCount = 0,
    applicationsCount = 0,
  } = dataPointsUsed || {};

  const hasResume = resumesCount > 0 || availableDimensions.includes('resumeQuality');
  const hasJobMatch = jobMatchesCount > 0 || availableDimensions.includes('jobFitAlignment');
  const hasInterview = interviewSessionsCount > 0 || availableDimensions.includes('interviewMastery');
  const hasPipeline = applicationsCount > 0 || availableDimensions.includes('applicationPipeline');

  const steps = [
    {
      title: 'Upload & Audit Resume',
      desc: 'Parses your background and establishes baseline technical proficiencies.',
      icon: FileText,
      count: resumesCount,
      targetUrl: '/resumes',
      actionText: hasResume ? 'Manage Resumes' : 'Upload Resume',
      completed: hasResume,
    },
    {
      title: 'Match Target Job Postings',
      desc: 'Extracts critical market skills and identifies concrete competency gaps.',
      icon: Target,
      count: jobMatchesCount,
      targetUrl: '/job-matches',
      actionText: hasJobMatch ? 'View Matches' : 'Analyze Jobs',
      completed: hasJobMatch,
    },
    {
      title: 'Practice AI Mock Interviews',
      desc: 'Demonstrates conversational communication and STAR behavioral competence.',
      icon: MessageSquareCode,
      count: interviewSessionsCount,
      targetUrl: '/interviews',
      actionText: hasInterview ? 'View Sessions' : 'Start Practice',
      completed: hasInterview,
    },
    {
      title: 'Track Job Applications',
      desc: 'Monitors recruitment momentum and pipeline interview conversion.',
      icon: Kanban,
      count: applicationsCount,
      targetUrl: '/applications',
      actionText: hasPipeline ? 'View Pipeline' : 'Track Applications',
      completed: hasPipeline,
    },
  ];

  return (
    <Card className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 border-emerald-900/30 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">
              {isColdStart
                ? 'Welcome to Career Intelligence — Fuel Your Profile'
                : 'Boost Precision with Additional Career Artifacts'}
            </h3>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            CareerAI builds high-accuracy career roadmaps and readiness scores strictly grounded in your verified data. Each completed module directly enhances your personalization depth without relying on synthetic assumptions.
          </p>
        </div>

        <Badge variant="teal" size="md">
          <ShieldCheck className="w-3.5 h-3.5 mr-1" />
          Grounded Synthesis
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
        {steps.map((step, idx) => {
          const Icon = step.icon;
          return (
            <div
              key={idx}
              className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 transition-all ${
                step.completed
                  ? 'bg-slate-900/90 border-emerald-900/40 text-slate-200'
                  : 'bg-slate-950/60 border-slate-800 text-slate-400'
              }`}
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div
                    className={`p-2 rounded-lg border ${
                      step.completed
                        ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400'
                        : 'bg-slate-800 border-slate-700 text-slate-400'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {step.completed ? (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Active
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase font-mono text-amber-400">
                      Pending
                    </span>
                  )}
                </div>

                <div>
                  <h4 className="text-xs font-bold text-white">
                    {step.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-snug mt-1">
                    {step.desc}
                  </p>
                </div>
              </div>

              <Link to={step.targetUrl} className="pt-2">
                <Button
                  variant={step.completed ? 'secondary' : 'primary'}
                  size="sm"
                  className="w-full text-xs justify-between"
                >
                  <span>{step.actionText}</span>
                  <ArrowRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default SparseDataPrompt;
