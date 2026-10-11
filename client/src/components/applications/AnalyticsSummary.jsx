import React from 'react';
import {
  Briefcase,
  Layers,
  Award,
  TrendingUp,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
} from 'lucide-react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';

export const AnalyticsSummary = ({ analytics, onToggleReminder, onSelectApplication }) => {
  if (!analytics) return null;

  const {
    totalApplications = 0,
    activePipeline = 0,
    interviewConversionRate = 0,
    offerRate = 0,
    upcomingInterviews = [],
    upcomingReminders = [],
    overdueReminders = [],
  } = analytics;

  const hasAlerts =
    upcomingInterviews.length > 0 ||
    upcomingReminders.length > 0 ||
    overdueReminders.length > 0;

  return (
    <div className="space-y-4">
      {/* 4 Funnel Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="p-4 sm:p-5 bg-slate-900/70 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Applications</span>
            <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-white">{totalApplications}</span>
            <span className="text-xs text-slate-500">Tracked</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-slate-900/70 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Active Pipeline</span>
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400">{activePipeline}</span>
            <span className="text-xs text-slate-500">In Progress</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-slate-900/70 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Interview Rate</span>
            <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-cyan-400">{interviewConversionRate}%</span>
            <span className="text-xs text-slate-500">Conversion</span>
          </div>
        </Card>

        <Card className="p-4 sm:p-5 bg-slate-900/70 border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Offer Rate</span>
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold text-amber-400">{offerRate}%</span>
            <span className="text-xs text-slate-500">Outcome</span>
          </div>
        </Card>
      </div>

      {/* Actionable Alerts Banner (Interviews & Reminders) */}
      {hasAlerts && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Upcoming Interviews Alert */}
          {upcomingInterviews.length > 0 && (
            <Card className="p-4 bg-slate-900/80 border-cyan-500/30">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-cyan-400 font-semibold text-xs sm:text-sm">
                  <Calendar className="w-4 h-4" />
                  <span>Upcoming Interviews ({upcomingInterviews.length})</span>
                </div>
                <Badge variant="teal" size="sm">Next 7 Days</Badge>
              </div>
              <div className="mt-2.5 space-y-2 max-h-40 overflow-y-auto pr-1">
                {upcomingInterviews.map((inv) => (
                  <div
                    key={inv.roundId}
                    onClick={() => onSelectApplication && onSelectApplication(inv.applicationId)}
                    className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-200">
                        {inv.companyName} — <span className="font-normal text-slate-400">{inv.roundName}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        <span className="text-cyan-400 font-medium">
                          {new Date(inv.scheduledDate).toLocaleDateString([], {
                            weekday: 'short',
                            month: 'short',
                            day: 'numeric',
                          })}
                        </span>
                        <span>•</span>
                        <span>{new Date(inv.scheduledDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        <span>•</span>
                        <span>{inv.format}</span>
                      </div>
                    </div>
                    {inv.meetingLink && (
                      <a
                        href={inv.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="px-2 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 flex items-center gap-1 shrink-0"
                      >
                        <span>Join</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Follow-up Reminders Alert (Overdue & Upcoming) */}
          {(overdueReminders.length > 0 || upcomingReminders.length > 0) && (
            <Card className="p-4 bg-slate-900/80 border-amber-500/30">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs sm:text-sm">
                  <Clock className="w-4 h-4" />
                  <span>Pending Follow-ups ({overdueReminders.length + upcomingReminders.length})</span>
                </div>
                {overdueReminders.length > 0 && (
                  <Badge variant="rose" size="sm">{overdueReminders.length} Overdue</Badge>
                )}
              </div>
              <div className="mt-2.5 space-y-2 max-h-40 overflow-y-auto pr-1">
                {[...overdueReminders, ...upcomingReminders].map((rem) => {
                  const isOverdue = overdueReminders.some((o) => o.reminderId === rem.reminderId);
                  return (
                    <div
                      key={rem.reminderId}
                      className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-start gap-2.5 min-w-0 pr-2">
                        <button
                          type="button"
                          onClick={() => onToggleReminder && onToggleReminder(rem.applicationId, rem.reminderId)}
                          className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                          title="Mark complete"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                        <div
                          onClick={() => onSelectApplication && onSelectApplication(rem.applicationId)}
                          className="cursor-pointer min-w-0"
                        >
                          <div className="font-semibold text-slate-200 truncate">{rem.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">
                            <span className={isOverdue ? 'text-rose-400 font-medium' : 'text-slate-400'}>
                              {isOverdue ? 'Overdue: ' : 'Due: '}
                              {new Date(rem.reminderDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                            </span>
                            <span className="mx-1">•</span>
                            <span>{rem.companyName}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};
