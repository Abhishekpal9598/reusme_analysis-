import React from 'react';
import {
  Calendar,
  Clock,
  MapPin,
  ExternalLink,
  Trash2,
  ChevronRight,
  ArrowUpDown,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { STATUS_COLUMNS } from './KanbanBoard';

export const ApplicationTable = ({
  applications = [],
  onSelectApplication,
  onStatusChange,
  onDeleteApplication,
  onSort,
  sortBy,
  sortOrder,
}) => {
  const getBadgeVariant = (status) => {
    switch (status) {
      case 'Interview':
        return 'success';
      case 'Offer':
        return 'teal';
      case 'Applied':
        return 'blue';
      case 'Assessment':
        return 'purple';
      case 'Rejected':
        return 'rose';
      default:
        return 'slate';
    }
  };

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-sm">
      <table className="w-full text-left text-xs sm:text-sm">
        <thead className="bg-slate-950/80 text-slate-400 border-b border-slate-800 text-xs uppercase font-semibold tracking-wider">
          <tr>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => onSort('companyName')}>
              <div className="flex items-center gap-1.5">
                <span>Company</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => onSort('positionTitle')}>
              <div className="flex items-center gap-1.5">
                <span>Position</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => onSort('status')}>
              <div className="flex items-center gap-1.5">
                <span>Status</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4 cursor-pointer hover:text-white" onClick={() => onSort('appliedDate')}>
              <div className="flex items-center gap-1.5">
                <span>Applied Date</span>
                <ArrowUpDown className="w-3 h-3" />
              </div>
            </th>
            <th className="py-3.5 px-4">Interviews</th>
            <th className="py-3.5 px-4">Compensation</th>
            <th className="py-3.5 px-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/60 text-slate-300">
          {applications.length === 0 ? (
            <tr>
              <td colSpan="7" className="py-12 text-center text-slate-500 text-sm">
                No job applications match your current filters.
              </td>
            </tr>
          ) : (
            applications.map((app) => {
              const appId = app.id || app._id;
              const completedInv = app.interviews?.filter((i) => i.completed).length || 0;
              const totalInv = app.interviews?.length || 0;

              return (
                <tr
                  key={appId}
                  onClick={() => onSelectApplication(appId)}
                  className="hover:bg-slate-800/40 cursor-pointer transition-colors group"
                >
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100 group-hover:text-emerald-400 transition-colors">
                      {app.companyName}
                    </div>
                    {app.location && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-2.5 h-2.5" />
                        <span>{app.location}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-slate-200">{app.positionTitle}</div>
                    <div className="text-[11px] text-slate-500">{app.employmentType}</div>
                  </td>
                  <td className="py-3.5 px-4" onClick={(e) => e.stopPropagation()}>
                    <select
                      value={app.status}
                      onChange={(e) => onStatusChange(appId, e.target.value)}
                      className="text-xs bg-slate-950 text-slate-300 border border-slate-800 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      {STATUS_COLUMNS.map((sc) => (
                        <option key={sc.id} value={sc.id}>
                          {sc.label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 text-xs">
                    {app.appliedDate ? (
                      new Date(app.appliedDate).toLocaleDateString([], {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {totalInv > 0 ? (
                      <div className="flex items-center gap-1 text-xs text-cyan-400">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{completedInv}/{totalInv} Rounds</span>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">None</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs font-medium text-emerald-400">
                    {app.salary?.amount ? (
                      `${app.salary.amount.toLocaleString()} ${app.salary.currency || 'USD'}`
                    ) : app.salaryExpectation ? (
                      `${app.salaryExpectation.toLocaleString()} USD`
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      {app.jobUrl && (
                        <a
                          href={app.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                          title="View job post"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={() => onDeleteApplication(appId)}
                        className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete application"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};
