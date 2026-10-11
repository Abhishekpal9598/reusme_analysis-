import React from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  Activity,
  Flame,
  TrendingUp,
  FileText,
  Target,
  MessageSquareCode,
  Kanban,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

export const WeeklyMomentumReport = ({ weeklyMomentum }) => {
  const {
    resumesAudited = 0,
    jobsAnalyzed = 0,
    interviewsCompleted = 0,
    applicationsAdvanced = 0,
    milestonesCompleted = 0,
    momentumStatus = 'Inactive',
    startDate,
    endDate,
  } = weeklyMomentum || {};

  const totalActivity =
    resumesAudited +
    jobsAnalyzed +
    interviewsCompleted +
    applicationsAdvanced +
    milestonesCompleted;

  const getMomentumConfig = (status) => {
    switch (status) {
      case 'Accelerating':
        return {
          variant: 'success',
          label: 'Accelerating Momentum',
          icon: Flame,
          narrative: 'High progression velocity detected across multiple platform modules over the last 7 days.',
        };
      case 'Steady':
        return {
          variant: 'info',
          label: 'Steady Momentum',
          icon: TrendingUp,
          narrative: 'Consistent weekly progression maintained across your career preparation pipeline.',
        };
      case 'Inactive':
      default:
        return {
          variant: 'warning',
          label: 'Inactive Window',
          icon: Activity,
          narrative: 'No career preparation activity detected in the trailing 7-day rolling window.',
        };
    }
  };

  const momentumConfig = getMomentumConfig(momentumStatus);
  const MomentumIcon = momentumConfig.icon;

  const formattedDateRange =
    startDate && endDate
      ? `${new Date(startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – ${new Date(endDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : 'Trailing 7 Days';

  const statCounters = [
    {
      label: 'Resumes Audited',
      count: resumesAudited,
      icon: FileText,
      color: 'text-purple-400',
    },
    {
      label: 'Jobs Analyzed',
      count: jobsAnalyzed,
      icon: Target,
      color: 'text-sky-400',
    },
    {
      label: 'Interviews Completed',
      count: interviewsCompleted,
      icon: MessageSquareCode,
      color: 'text-emerald-400',
    },
    {
      label: 'Applications Advanced',
      count: applicationsAdvanced,
      icon: Kanban,
      color: 'text-amber-400',
    },
    {
      label: 'Milestones Completed',
      count: milestonesCompleted,
      icon: CheckCircle2,
      color: 'text-emerald-400',
    },
  ];

  return (
    <Card className="h-full flex flex-col justify-between space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white tracking-tight">
            Weekly Momentum Report
          </h3>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formattedDateRange} ({totalActivity} total actions)</span>
          </div>
        </div>
        <Badge variant={momentumConfig.variant} size="md">
          <MomentumIcon className="w-3.5 h-3.5 mr-1.5" />
          {momentumConfig.label}
        </Badge>
      </div>

      {/* Narrative Synthesis */}
      <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800 text-xs text-slate-300 leading-relaxed">
        {momentumConfig.narrative}
      </div>

      {/* 5 Metrics Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 pt-2">
        {statCounters.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="p-3 rounded-lg bg-slate-900 border border-slate-800/80 flex flex-col items-center justify-center text-center space-y-1"
            >
              <Icon className={`w-4 h-4 ${item.color}`} />
              <span className="text-xl font-extrabold text-white">
                {item.count}
              </span>
              <span className="text-[10px] text-slate-400 font-medium leading-tight">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="pt-2 border-t border-slate-800 text-[10px] text-slate-400">
        Computed strictly from actual user activity timestamps within UTC boundaries over the past 7 days.
      </div>
    </Card>
  );
};

export default WeeklyMomentumReport;
