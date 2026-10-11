import React, { useState } from 'react';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import {
  CheckCircle,
  Circle,
  Clock,
  ExternalLink,
  BookOpen,
  Code2,
  FolderGit2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export const LearningRoadmapTimeline = ({
  milestones = [],
  onToggleMilestone,
  togglingId = null,
}) => {
  const [expandedMilestoneId, setExpandedMilestoneId] = useState(null);

  const completedCount = milestones.filter((m) => m.completed).length;
  const totalCount = milestones.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const getPriorityBadgeVariant = (priority) => {
    switch (priority) {
      case 'High':
        return 'danger';
      case 'Medium':
        return 'warning';
      case 'Low':
        return 'default';
      default:
        return 'default';
    }
  };

  const toggleExpand = (id) => {
    setExpandedMilestoneId((prev) => (prev === id ? null : id));
  };

  return (
    <Card className="space-y-6">
      {/* Header and Progress Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Personalized Learning Roadmap
          </h3>
          <p className="text-xs text-slate-400">
            Action-oriented milestones designed to close critical capability gaps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-emerald-400">
            {completedCount} of {totalCount} Completed ({progressPercent}%)
          </span>
          <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
          No learning milestones generated yet. Generate your Career Intelligence profile to receive personalized study targets.
        </div>
      ) : (
        <div className="relative pl-6 sm:pl-8 space-y-6 before:content-[''] before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-800">
          {milestones.map((milestone, idx) => {
            const isCompleted = milestone.completed;
            const isToggling = togglingId === milestone._id;
            const isExpanded = expandedMilestoneId === milestone._id;

            return (
              <div key={milestone._id || idx} className="relative group">
                {/* Checkbox / Marker icon on the timeline track */}
                <button
                  type="button"
                  disabled={isToggling}
                  onClick={() => onToggleMilestone?.(milestone._id, !isCompleted)}
                  className={`absolute -left-6 sm:-left-8 top-1 p-1 rounded-full bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500 ${
                    isToggling ? 'opacity-50 cursor-wait' : 'cursor-pointer hover:scale-110'
                  }`}
                  aria-label={isCompleted ? 'Mark milestone incomplete' : 'Mark milestone complete'}
                >
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-emerald-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500 hover:text-slate-300" />
                  )}
                </button>

                {/* Milestone Card Body */}
                <div
                  className={`p-4 rounded-xl border transition-all ${
                    isCompleted
                      ? 'bg-slate-950/30 border-slate-800/60 opacity-80'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold text-slate-400">
                          Step {idx + 1}
                        </span>
                        <h4
                          className={`text-sm font-bold text-slate-100 ${
                            isCompleted ? 'line-through text-slate-400' : ''
                          }`}
                        >
                          {milestone.title}
                        </h4>
                        <Badge variant={getPriorityBadgeVariant(milestone.priority)} size="sm">
                          {milestone.priority} Priority
                        </Badge>
                        <Badge variant="default" size="sm">
                          {milestone.category}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        {milestone.description}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start">
                      {milestone.estimatedHours && (
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          <span>~{milestone.estimatedHours} hrs</span>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpand(milestone._id)}
                        className="p-1 rounded text-slate-400 hover:text-slate-200 transition-colors"
                        aria-label="Toggle details"
                      >
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Project Deliverable / Hands-on verification */}
                  {milestone.projectDeliverable && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 flex items-start gap-2 text-xs text-emerald-300 bg-emerald-950/20 p-2.5 rounded-lg border border-emerald-900/30">
                      <FolderGit2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-emerald-200">Portfolio Deliverable: </span>
                        <span>{milestone.projectDeliverable}</span>
                      </div>
                    </div>
                  )}

                  {/* Learning Resources (Visible if expanded or by default if present) */}
                  {isExpanded && milestone.resources && milestone.resources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/80 space-y-2">
                      <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                        Recommended Resources
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {milestone.resources.map((res, rIdx) => (
                          <a
                            key={rIdx}
                            href={res.url || '#'}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-between p-2 rounded-lg bg-slate-950/60 border border-slate-800 hover:border-slate-700 text-xs text-slate-200 hover:text-emerald-400 transition-colors"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <BookOpen className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{res.title}</span>
                            </div>
                            <ExternalLink className="w-3 h-3 text-slate-400 shrink-0 ml-2" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default LearningRoadmapTimeline;
