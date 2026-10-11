import React, { useState } from 'react';
import {
  X,
  Building2,
  Briefcase,
  MapPin,
  DollarSign,
  ExternalLink,
  Calendar,
  Clock,
  CheckCircle2,
  Trash2,
  Plus,
  FileText,
  Target,
  Edit2,
  MessageSquare,
  AlertCircle,
  Loader2,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { STATUS_COLUMNS } from './KanbanBoard';

export const ApplicationDrawer = ({
  isOpen,
  onClose,
  application,
  onStatusChange,
  onEdit,
  onDelete,
  onAddInterview,
  onUpdateInterview,
  onDeleteInterview,
  onAddReminder,
  onToggleReminder,
  onDeleteReminder,
  onAddNote,
  onDeleteNote,
}) => {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'interviews' | 'reminders' | 'notes'

  // Subdocument form states
  const [showAddInterview, setShowAddInterview] = useState(false);
  const [roundName, setRoundName] = useState('');
  const [roundType, setRoundType] = useState('Technical');
  const [scheduledDate, setScheduledDate] = useState('');
  const [format, setFormat] = useState('Video Call');
  const [meetingLink, setMeetingLink] = useState('');
  const [interviewNotes, setInterviewNotes] = useState('');

  const [showAddReminder, setShowAddReminder] = useState(false);
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDate, setReminderDate] = useState('');
  const [reminderNote, setReminderNote] = useState('');

  const [noteContent, setNoteContent] = useState('');
  const [isSubmittingSub, setIsSubmittingSub] = useState(false);

  if (!isOpen || !application) return null;

  const appId = application.id || application._id;

  // Handle Interview Form Submit
  const handleCreateInterview = async (e) => {
    e.preventDefault();
    if (!roundName.trim() || !scheduledDate) return;
    try {
      setIsSubmittingSub(true);
      await onAddInterview(appId, {
        roundName: roundName.trim(),
        roundType,
        scheduledDate,
        format,
        meetingLink: meetingLink.trim(),
        notes: interviewNotes.trim(),
      });
      setRoundName('');
      setScheduledDate('');
      setMeetingLink('');
      setInterviewNotes('');
      setShowAddInterview(false);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Handle Reminder Form Submit
  const handleCreateReminder = async (e) => {
    e.preventDefault();
    if (!reminderTitle.trim() || !reminderDate) return;
    try {
      setIsSubmittingSub(true);
      await onAddReminder(appId, {
        title: reminderTitle.trim(),
        reminderDate,
        note: reminderNote.trim(),
      });
      setReminderTitle('');
      setReminderDate('');
      setReminderNote('');
      setShowAddReminder(false);
    } finally {
      setIsSubmittingSub(false);
    }
  };

  // Handle Note Form Submit
  const handleCreateNote = async (e) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      setIsSubmittingSub(true);
      await onAddNote(appId, noteContent.trim());
      setNoteContent('');
    } finally {
      setIsSubmittingSub(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-950/80 backdrop-blur-sm flex justify-end">
      <div className="w-full max-w-xl bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 sm:p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
          <div className="space-y-1.5 min-w-0 pr-3">
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-white truncate">{application.companyName}</h2>
              {application.jobUrl && (
                <a
                  href={application.jobUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-slate-400 hover:text-white"
                  title="Open job link"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
            <div className="text-sm font-medium text-slate-300 truncate">{application.positionTitle}</div>

            {/* Quick Status Dropdown */}
            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-slate-500">Status:</span>
              <select
                value={application.status}
                onChange={(e) => onStatusChange(appId, e.target.value)}
                className="text-xs font-semibold bg-slate-950 text-emerald-400 border border-slate-800 rounded-lg px-2.5 py-1 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
              >
                {STATUS_COLUMNS.map((sc) => (
                  <option key={sc.id} value={sc.id}>
                    {sc.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onEdit(application)}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Edit application"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Delete application for ${application.companyName}?`)) {
                  onDelete(appId);
                  onClose();
                }
              }}
              className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Delete application"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-6 gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`py-3.5 border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('interviews')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'interviews'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Interviews</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {application.interviews?.length || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('reminders')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'reminders'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Reminders</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {application.reminders?.filter((r) => !r.isCompleted).length || 0}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('notes')}
            className={`py-3.5 border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'notes'
                ? 'border-emerald-500 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Activity Log</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800 text-slate-300">
              {application.timelineNotes?.length || 0}
            </span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Attributes */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block">Target Compensation</span>
                  <span className="font-semibold text-emerald-400 text-sm">
                    {application.salary?.amount
                      ? `${application.salary.amount.toLocaleString()} ${application.salary.currency} (${application.salary.period})`
                      : application.salaryExpectation
                      ? `${application.salaryExpectation.toLocaleString()} USD`
                      : 'Not specified'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block">Location & Type</span>
                  <span className="font-semibold text-slate-200 text-sm">
                    {application.location || 'Remote'} • {application.employmentType}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block">Applied Date</span>
                  <span className="font-semibold text-slate-200 text-xs">
                    {application.appliedDate
                      ? new Date(application.appliedDate).toLocaleDateString()
                      : 'Not submitted yet'}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1">
                  <span className="text-slate-500 block">Last Updated</span>
                  <span className="font-semibold text-slate-200 text-xs">
                    {new Date(application.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Linked Resume */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-emerald-400" />
                    <span>Linked Resume (Phase 4)</span>
                  </span>
                </div>
                {application.resumeId ? (
                  <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <span className="text-slate-200 font-medium">
                      {application.resumeId.originalFileName || 'Attached Resume'}
                    </span>
                    <Badge variant="teal" size="sm">Ingested</Badge>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No uploaded resume linked to this application.</p>
                )}
              </div>

              {/* Linked Job Match */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                  <span className="flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <span>Linked Job Match Analysis (Phase 6)</span>
                  </span>
                </div>
                {application.jobAnalysisId ? (
                  <div className="flex items-center justify-between text-xs bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                    <div>
                      <div className="text-slate-200 font-medium">
                        {application.jobAnalysisId.jobTitle || 'Evaluated Job Description'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        Matched Skills: {application.jobAnalysisId.matchedSkills?.length || 0} • Missing: {application.jobAnalysisId.missingSkills?.length || 0}
                      </div>
                    </div>
                    <Badge variant="success" size="sm">
                      {application.jobAnalysisId.overallMatchScore}% Match
                    </Badge>
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">No Job Match analysis linked to this application.</p>
                )}
              </div>

              {/* Contact Information */}
              {application.contactPerson && (application.contactPerson.name || application.contactPerson.email) && (
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5 text-xs">
                  <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Recruiter / Contact Person</span>
                  </span>
                  <div className="space-y-1.5 text-slate-400 pl-5">
                    {application.contactPerson.name && (
                      <div className="text-slate-200 font-medium">{application.contactPerson.name} ({application.contactPerson.role || 'Contact'})</div>
                    )}
                    {application.contactPerson.email && (
                      <div className="flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-slate-500" />
                        <a href={`mailto:${application.contactPerson.email}`} className="text-emerald-400 hover:underline">
                          {application.contactPerson.email}
                        </a>
                      </div>
                    )}
                    {application.contactPerson.phone && (
                      <div className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span>{application.contactPerson.phone}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERVIEWS */}
          {activeTab === 'interviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Scheduled Interview Rounds</span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddInterview(!showAddInterview)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{showAddInterview ? 'Cancel' : 'Schedule Round'}</span>
                </Button>
              </div>

              {/* Inline Schedule Form */}
              {showAddInterview && (
                <form onSubmit={handleCreateInterview} className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3 text-xs">
                  <div className="font-semibold text-emerald-400">Schedule Interview Round</div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Round Name (e.g. Technical Screen)"
                      value={roundName}
                      onChange={(e) => setRoundName(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                    <select
                      value={roundType}
                      onChange={(e) => setRoundType(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Recruiter Screen">Recruiter Screen</option>
                      <option value="Technical">Technical</option>
                      <option value="Behavioral">Behavioral</option>
                      <option value="System Design">System Design</option>
                      <option value="Hiring Manager">Hiring Manager</option>
                      <option value="Take-Home">Take-Home</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="datetime-local"
                      value={scheduledDate}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                      required
                    />
                    <select
                      value={format}
                      onChange={(e) => setFormat(e.target.value)}
                      className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    >
                      <option value="Video Call">Video Call</option>
                      <option value="Phone">Phone</option>
                      <option value="In-Person">In-Person</option>
                      <option value="Online Assessment">Online Assessment</option>
                    </select>
                  </div>
                  <input
                    type="url"
                    placeholder="Video Meeting Link (e.g. Google Meet, Zoom)"
                    value={meetingLink}
                    onChange={(e) => setMeetingLink(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <textarea
                    placeholder="Preparation notes or focus areas..."
                    value={interviewNotes}
                    onChange={(e) => setInterviewNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="submit" variant="primary" size="sm" disabled={isSubmittingSub}>
                      {isSubmittingSub ? 'Saving...' : 'Save Round'}
                    </Button>
                  </div>
                </form>
              )}

              {/* List of rounds */}
              {(!application.interviews || application.interviews.length === 0) ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No interview rounds scheduled yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {application.interviews.map((inv) => (
                    <div
                      key={inv._id || inv.id}
                      className={`p-3.5 rounded-xl border text-xs space-y-2 transition-all ${
                        inv.completed
                          ? 'bg-slate-950/40 border-slate-800/60 opacity-75'
                          : 'bg-slate-950 border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{inv.roundName}</span>
                            <span className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-cyan-400">
                              {inv.roundType}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                            <span>{new Date(inv.scheduledDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</span>
                            <span>•</span>
                            <span>{inv.format}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateInterview(appId, inv._id || inv.id, { completed: !inv.completed })}
                            className={`px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                              inv.completed
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                            }`}
                          >
                            {inv.completed ? 'Completed' : 'Mark Done'}
                          </button>
                          <button
                            type="button"
                            onClick={() => onDeleteInterview(appId, inv._id || inv.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400"
                            title="Delete round"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {inv.meetingLink && (
                        <div className="pt-1">
                          <a
                            href={inv.meetingLink}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-cyan-400 hover:underline"
                          >
                            <span>Join Meeting</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}

                      {inv.notes && <p className="text-[11px] text-slate-400 pt-1 italic">{inv.notes}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REMINDERS (IN-APP) */}
          {activeTab === 'reminders' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-300">Follow-up Tasks & Reminders</span>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setShowAddReminder(!showAddReminder)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  <span>{showAddReminder ? 'Cancel' : 'Add Reminder'}</span>
                </Button>
              </div>

              {/* Inline Add Reminder */}
              {showAddReminder && (
                <form onSubmit={handleCreateReminder} className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-3 text-xs">
                  <div className="font-semibold text-amber-400">New Follow-up Task</div>
                  <input
                    type="text"
                    placeholder="Reminder title (e.g. Email recruiter for update)"
                    value={reminderTitle}
                    onChange={(e) => setReminderTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                  <input
                    type="date"
                    value={reminderDate}
                    onChange={(e) => setReminderDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                    required
                  />
                  <textarea
                    placeholder="Optional note / reminder details..."
                    value={reminderNote}
                    onChange={(e) => setReminderNote(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs focus:ring-1 focus:ring-amber-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2 pt-1">
                    <Button type="submit" variant="primary" size="sm" disabled={isSubmittingSub}>
                      {isSubmittingSub ? 'Saving...' : 'Save Reminder'}
                    </Button>
                  </div>
                </form>
              )}

              {/* List of Reminders */}
              {(!application.reminders || application.reminders.length === 0) ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No reminders scheduled for this application.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {application.reminders.map((rem) => {
                    const isOverdue = !rem.isCompleted && new Date(rem.reminderDate) < new Date();
                    return (
                      <div
                        key={rem._id || rem.id}
                        className={`p-3 rounded-xl border text-xs flex items-center justify-between transition-all ${
                          rem.isCompleted
                            ? 'bg-slate-950/40 border-slate-800/60 opacity-60'
                            : isOverdue
                            ? 'bg-rose-500/5 border-rose-500/30'
                            : 'bg-slate-950 border-slate-800'
                        }`}
                      >
                        <div className="flex items-start gap-3 min-w-0 pr-2">
                          <button
                            type="button"
                            onClick={() => onToggleReminder(appId, rem._id || rem.id)}
                            className="mt-0.5 text-slate-500 hover:text-emerald-400 transition-colors shrink-0"
                            title="Toggle status"
                          >
                            <CheckCircle2
                              className={`w-4 h-4 ${rem.isCompleted ? 'text-emerald-400' : 'text-slate-600'}`}
                            />
                          </button>
                          <div className="min-w-0">
                            <div className={`font-semibold ${rem.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                              {rem.title}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              <span className={isOverdue ? 'text-rose-400 font-medium' : ''}>
                                {isOverdue ? 'Overdue: ' : 'Due: '}
                                {new Date(rem.reminderDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                              </span>
                              {rem.note && <span> • {rem.note}</span>}
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onDeleteReminder(appId, rem._id || rem.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 shrink-0"
                          title="Delete reminder"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ACTIVITY LOG & NOTES */}
          {activeTab === 'notes' && (
            <div className="space-y-4">
              <span className="text-xs font-semibold text-slate-300 block">Activity Log & Journal</span>

              {/* Add Note Form */}
              <form onSubmit={handleCreateNote} className="space-y-2">
                <textarea
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Record call notes, interview feedback, follow-up thoughts..."
                  rows={2}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                  required
                />
                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm" disabled={isSubmittingSub || !noteContent.trim()}>
                    {isSubmittingSub ? 'Saving...' : 'Add Note'}
                  </Button>
                </div>
              </form>

              {/* Notes list */}
              {(!application.timelineNotes || application.timelineNotes.length === 0) ? (
                <div className="py-12 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-xl">
                  No activity recorded yet.
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  {[...application.timelineNotes].reverse().map((note) => (
                    <div
                      key={note._id || note.id}
                      className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-semibold text-slate-300">{note.author}</span>
                        <div className="flex items-center gap-2">
                          <span>{new Date(note.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</span>
                          <button
                            type="button"
                            onClick={() => onDeleteNote(appId, note._id || note.id)}
                            className="text-slate-600 hover:text-rose-400"
                            title="Delete note"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
