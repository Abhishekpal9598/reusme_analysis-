import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../common/Card';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import {
  ArrowRight,
  Zap,
  Clock,
  Calendar,
  FileText,
  Target,
  MessageSquareCode,
  Kanban,
  BookOpen,
} from 'lucide-react';

export const NextActionsList = ({ nextActions = [] }) => {
  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'High':
        return {
          icon: Zap,
          variant: 'danger',
          label: 'High Priority',
        };
      case 'Medium':
        return {
          icon: Clock,
          variant: 'warning',
          label: 'Medium Priority',
        };
      case 'Low':
        return {
          icon: Calendar,
          variant: 'default',
          label: 'Low Priority',
        };
      default:
        return {
          icon: Clock,
          variant: 'default',
          label: priority || 'Planned',
        };
    }
  };

  const getActionTypeConfig = (type) => {
    switch (type) {
      case 'RESUME_UPDATE':
        return { label: 'Resume Optimization', icon: FileText };
      case 'SKILL_STUDY':
        return { label: 'Skill Acquisition', icon: BookOpen };
      case 'INTERVIEW_PRACTICE':
        return { label: 'Interview Preparation', icon: MessageSquareCode };
      case 'APPLICATION_FOLLOWUP':
        return { label: 'Application Pipeline', icon: Kanban };
      case 'JOB_MATCH':
        return { label: 'Job Description Match', icon: Target };
      default:
        return { label: type || 'General Action', icon: Zap };
    }
  };

  return (
    <Card className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-white tracking-tight">
            Actionable Next Steps
          </h3>
          <p className="text-xs text-slate-400">
            High-leverage tasks recommended to systematically increase your Career Readiness Index
          </p>
        </div>
        <Badge variant="purple" size="sm">
          Priority-Ranked
        </Badge>
      </div>

      {nextActions.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-slate-950/40 border border-slate-800 text-slate-400 text-xs">
          No immediate actions queued. Generate your Career Profile to receive personalized priority tasks.
        </div>
      ) : (
        <div className="space-y-3">
          {nextActions.map((actionItem, idx) => {
            const priorityConfig = getPriorityBadge(actionItem.priority || actionItem.urgency);
            const PriorityIcon = priorityConfig.icon;
            const typeConfig = getActionTypeConfig(actionItem.actionType);
            const TypeIcon = typeConfig.icon;
            const actionTitle = actionItem.title || actionItem.action || 'Recommended Action';
            const actionDesc = actionItem.description || actionItem.rationale || '';

            return (
              <div
                key={idx}
                className="p-4 rounded-xl bg-slate-950/40 border border-slate-800 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={priorityConfig.variant} size="sm">
                      <PriorityIcon className="w-3 h-3 mr-1" />
                      {priorityConfig.label}
                    </Badge>
                    <Badge variant="default" size="sm">
                      <TypeIcon className="w-3 h-3 mr-1 text-slate-400" />
                      {typeConfig.label}
                    </Badge>
                  </div>

                  <h4 className="text-sm font-bold text-slate-100">
                    {actionTitle}
                  </h4>
                  {actionDesc && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      {actionDesc}
                    </p>
                  )}
                </div>

                {/* Deep Link to the corresponding feature */}
                {actionItem.deepLink && (
                  <div className="shrink-0 self-start sm:self-center">
                    <Link to={actionItem.deepLink}>
                      <Button variant="secondary" size="sm" className="whitespace-nowrap">
                        <span>Execute Now</span>
                        <ArrowRight className="w-3.5 h-3.5 ml-1 text-emerald-400" />
                      </Button>
                    </Link>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

export default NextActionsList;
