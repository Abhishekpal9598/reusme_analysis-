import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  ChevronRight,
  MoreVertical,
  Plus,
  ExternalLink,
  FileText,
  Target,
} from 'lucide-react';
import { Badge } from '../common/Badge';

export const STATUS_COLUMNS = [
  { id: 'Saved', label: 'Saved', color: 'border-slate-700 bg-slate-900/40 text-slate-400', badgeVar: 'slate' },
  { id: 'Applied', label: 'Applied', color: 'border-blue-500/40 bg-blue-500/5 text-blue-400', badgeVar: 'blue' },
  { id: 'Assessment', label: 'Assessment', color: 'border-purple-500/40 bg-purple-500/5 text-purple-400', badgeVar: 'purple' },
  { id: 'Interview', label: 'Interview', color: 'border-emerald-500/40 bg-emerald-500/5 text-emerald-400', badgeVar: 'success' },
  { id: 'Offer', label: 'Offer', color: 'border-amber-500/40 bg-amber-500/5 text-amber-400', badgeVar: 'teal' },
  { id: 'Rejected', label: 'Rejected', color: 'border-rose-500/40 bg-rose-500/5 text-rose-400', badgeVar: 'rose' },
  { id: 'Withdrawn', label: 'Withdrawn', color: 'border-slate-800 bg-slate-950/40 text-slate-500', badgeVar: 'slate' },
];

export const KanbanBoard = ({
  applications = [],
  onSelectApplication,
  onStatusChange,
  onOpenAddModal,
}) => {
  // Group applications by status
  const columns = STATUS_COLUMNS.map((col) => {
    const items = applications.filter((app) => app.status === col.id);
    return {
      ...col,
      items,
    };
  });

  return (
    <div className="flex gap-4 overflow-x-auto pb-6 pt-1 select-none min-h-[580px] custom-scrollbar">
      {columns.map((column) => (
        <div
          key={column.id}
          className="w-72 sm:w-80 shrink-0 flex flex-col rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-sm"
        >
          {/* Column Header */}
          <div className="p-3.5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${column.id === 'Interview' ? 'bg-emerald-400' : column.id === 'Offer' ? 'bg-amber-400' : column.id === 'Applied' ? 'bg-blue-400' : column.id === 'Assessment' ? 'bg-purple-400' : column.id === 'Rejected' ? 'bg-rose-400' : 'bg-slate-500'}`} />
              <span className="font-semibold text-xs text-slate-200 tracking-wide uppercase">
                {column.label}
              </span>
              <span className="px-1.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">
                {column.items.length}
              </span>
            </div>
            {column.id === 'Saved' && (
              <button
                type="button"
                onClick={onOpenAddModal}
                className="p-1 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-800 transition-colors"
                title="Add to Saved"
              >
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Cards Container */}
          <div className="p-2.5 space-y-2.5 flex-1 overflow-y-auto max-h-[640px]">
            {column.items.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-600 border border-dashed border-slate-800/60 rounded-xl">
                No applications
              </div>
            ) : (
              column.items.map((app) => {
                const upcomingInv = app.interviews?.find(
                  (i) => !i.completed && new Date(i.scheduledDate) >= new Date()
                );
                const pendingRem = app.reminders?.filter((r) => !r.isCompleted).length || 0;

                return (
                  <div
                    key={app.id || app._id}
                    onClick={() => onSelectApplication(app.id || app._id)}
                    className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 hover:border-slate-700/80 hover:shadow-lg hover:shadow-emerald-950/20 cursor-pointer transition-all group relative space-y-2.5"
                  >
                    {/* Top Row: Company & Position */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors truncate">
                          {app.companyName}
                        </div>
                        <div className="text-xs text-slate-400 truncate mt-0.5">
                          {app.positionTitle}
                        </div>
                      </div>

                      {/* Quick Move Status Dropdown */}
                      <select
                        value={app.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          onStatusChange(app.id || app._id, e.target.value);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="text-[11px] bg-slate-950 text-slate-400 border border-slate-800 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        title="Move to another status"
                      >
                        {STATUS_COLUMNS.map((sc) => (
                          <option key={sc.id} value={sc.id}>
                            Move: {sc.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Metadata chips: Salary & Location */}
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                      {app.salary?.amount ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <DollarSign className="w-3 h-3" />
                          <span>
                            {app.salary.amount >= 1000 ? `${(app.salary.amount / 1000).toFixed(0)}k` : app.salary.amount} {app.salary.currency || 'USD'}
                          </span>
                        </span>
                      ) : app.salaryExpectation ? (
                        <span className="flex items-center gap-1 text-emerald-400 font-medium">
                          <DollarSign className="w-3 h-3" />
                          <span>{app.salaryExpectation >= 1000 ? `${(app.salaryExpectation / 1000).toFixed(0)}k` : app.salaryExpectation}</span>
                        </span>
                      ) : null}

                      {app.location && (
                        <span className="flex items-center gap-1 text-slate-400 truncate max-w-[120px]">
                          <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                          <span className="truncate">{app.location}</span>
                        </span>
                      )}

                      {app.employmentType && app.employmentType !== 'Full-Time' && (
                        <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-400">
                          {app.employmentType}
                        </span>
                      )}
                    </div>

                    {/* Subdocument Status Badges: Upcoming Interview or Reminders */}
                    {(upcomingInv || pendingRem > 0 || app.jobAnalysisId) && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-800/60">
                        {upcomingInv && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[10px] text-cyan-300 font-medium">
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{new Date(upcomingInv.scheduledDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}</span>
                          </span>
                        )}

                        {pendingRem > 0 && (
                          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-[10px] text-amber-300 font-medium">
                            <Clock className="w-2.5 h-2.5" />
                            <span>{pendingRem} Follow-up{pendingRem > 1 ? 's' : ''}</span>
                          </span>
                        )}

                        {app.jobAnalysisId && (
                          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] text-emerald-300" title="Linked with Phase 6 Job Match">
                            <Target className="w-2.5 h-2.5" />
                            <span>Matched</span>
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
