import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Briefcase,
  Kanban,
  Table as TableIcon,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Loader2,
  AlertCircle,
  FileText,
  Target,
  ArrowRight,
} from 'lucide-react';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { Card } from '../components/common/Card';
import { useAuth } from '../hooks/useAuth';
import { applicationService } from '../services/applicationService';
import { resumeService } from '../services/resumeService';
import { jobMatchService } from '../services/jobMatchService';
import { AnalyticsSummary } from '../components/applications/AnalyticsSummary';
import { KanbanBoard, STATUS_COLUMNS } from '../components/applications/KanbanBoard';
import { ApplicationTable } from '../components/applications/ApplicationTable';
import { ApplicationModal } from '../components/applications/ApplicationModal';
import { ApplicationDrawer } from '../components/applications/ApplicationDrawer';

export const ApplicationTrackerPage = () => {
  const { isAuthenticated, user } = useAuth();

  // Primary Data States
  const [applications, setApplications] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [resumes, setResumes] = useState([]);
  const [jobMatches, setJobMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // View & Filter States
  const [viewMode, setViewMode] = useState('kanban'); // 'kanban' | 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');

  // Modal & Drawer States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState(null);
  const [isSavingApp, setIsSavingApp] = useState(false);

  const [activeApplicationId, setActiveApplicationId] = useState(null);
  const [activeApplication, setActiveApplication] = useState(null);

  // Fetch all applications
  const fetchApplications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await applicationService.listApplications({
        q: searchQuery,
        status: selectedStatus,
        sortBy,
        sortOrder,
        limit: 100,
      });
      setApplications(res.data || []);
    } catch (err) {
      console.warn('Failed to fetch applications:', err);
      setErrorMessage(err.message || 'Failed to load applications.');
    }
  }, [isAuthenticated, searchQuery, selectedStatus, sortBy, sortOrder]);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await applicationService.getAnalytics();
      setAnalytics(res || null);
    } catch (err) {
      console.warn('Failed to fetch analytics:', err);
    }
  }, [isAuthenticated]);

  // Fetch user resumes & job matches for dropdown linking
  const fetchAuxiliaryData = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const [resumesRes, matchesRes] = await Promise.all([
        resumeService.listResumes().catch(() => ({ resumes: [] })),
        jobMatchService.listJobMatches().catch(() => ({ jobMatches: [] })),
      ]);
      setResumes(resumesRes.resumes || []);
      const matches = matchesRes.jobMatches || matchesRes.analyses || [];
      setJobMatches(matches);
    } catch (err) {
      console.warn('Failed to fetch auxiliary data:', err);
    }
  }, [isAuthenticated]);

  // Initial Load
  useEffect(() => {
    let mounted = true;
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchApplications(), fetchAnalytics(), fetchAuxiliaryData()]);
      if (mounted) setLoading(false);
    };
    loadAll();
    return () => {
      mounted = false;
    };
  }, [fetchApplications, fetchAnalytics, fetchAuxiliaryData]);

  // Fetch active application when drawer is opened
  useEffect(() => {
    if (!activeApplicationId) {
      setActiveApplication(null);
      return;
    }
    const loadSingle = async () => {
      try {
        const app = await applicationService.getApplication(activeApplicationId);
        setActiveApplication(app);
      } catch (err) {
        console.warn('Failed to fetch application details:', err);
      }
    };
    loadSingle();
  }, [activeApplicationId]);

  // Handle Quick Status Change
  const handleStatusChange = async (id, newStatus) => {
    try {
      const updated = await applicationService.updateStatus(id, newStatus);
      // Optimistic state update
      setApplications((prev) =>
        prev.map((app) => ((app.id || app._id) === id ? { ...app, status: newStatus } : app))
      );
      if (activeApplication && (activeApplication.id || activeApplication._id) === id) {
        setActiveApplication(updated);
      }
      fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to update status.');
    }
  };

  // Handle Create / Edit Application Modal Submit
  const handleModalSubmit = async (payload) => {
    try {
      setIsSavingApp(true);
      if (editingApplication) {
        const appId = editingApplication.id || editingApplication._id;
        const updated = await applicationService.updateApplication(appId, payload);
        setApplications((prev) =>
          prev.map((app) => ((app.id || app._id) === appId ? updated : app))
        );
        if (activeApplication && (activeApplication.id || activeApplication._id) === appId) {
          setActiveApplication(updated);
        }
      } else {
        const created = await applicationService.createApplication(payload);
        setApplications((prev) => [created, ...prev]);
      }
      setIsModalOpen(false);
      setEditingApplication(null);
      fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to save application.');
    } finally {
      setIsSavingApp(false);
    }
  };

  // Handle Application Deletion
  const handleDeleteApplication = async (id) => {
    try {
      await applicationService.deleteApplication(id);
      setApplications((prev) => prev.filter((app) => (app.id || app._id) !== id));
      if (activeApplicationId === id) {
        setActiveApplicationId(null);
      }
      fetchAnalytics();
    } catch (err) {
      alert(err.message || 'Failed to delete application.');
    }
  };

  // Subdocument Handlers: Interview Rounds
  const handleAddInterview = async (id, interviewData) => {
    const interview = await applicationService.addInterview(id, interviewData);
    setActiveApplication((prev) => ({
      ...prev,
      interviews: [...(prev.interviews || []), interview],
    }));
    fetchApplications();
    fetchAnalytics();
  };

  const handleUpdateInterview = async (id, interviewId, data) => {
    const updated = await applicationService.updateInterview(id, interviewId, data);
    setActiveApplication((prev) => ({
      ...prev,
      interviews: prev.interviews.map((i) => ((i._id || i.id) === interviewId ? updated : i)),
    }));
    fetchApplications();
    fetchAnalytics();
  };

  const handleDeleteInterview = async (id, interviewId) => {
    await applicationService.deleteInterview(id, interviewId);
    setActiveApplication((prev) => ({
      ...prev,
      interviews: prev.interviews.filter((i) => (i._id || i.id) !== interviewId),
    }));
    fetchApplications();
    fetchAnalytics();
  };

  // Subdocument Handlers: Reminders
  const handleAddReminder = async (id, reminderData) => {
    const reminder = await applicationService.addReminder(id, reminderData);
    setActiveApplication((prev) => ({
      ...prev,
      reminders: [...(prev.reminders || []), reminder],
    }));
    fetchApplications();
    fetchAnalytics();
  };

  const handleToggleReminder = async (id, reminderId) => {
    const updated = await applicationService.toggleReminder(id, reminderId);
    setActiveApplication((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        reminders: (prev.reminders || []).map((r) => ((r._id || r.id) === reminderId ? updated : r)),
      };
    });
    fetchApplications();
    fetchAnalytics();
  };

  const handleDeleteReminder = async (id, reminderId) => {
    await applicationService.deleteReminder(id, reminderId);
    setActiveApplication((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => (r._id || r.id) !== reminderId),
    }));
    fetchApplications();
    fetchAnalytics();
  };

  // Subdocument Handlers: Timeline Notes
  const handleAddNote = async (id, content) => {
    const note = await applicationService.addNote(id, content);
    setActiveApplication((prev) => ({
      ...prev,
      timelineNotes: [...(prev.timelineNotes || []), note],
    }));
  };

  const handleDeleteNote = async (id, noteId) => {
    await applicationService.deleteNote(id, noteId);
    setActiveApplication((prev) => ({
      ...prev,
      timelineNotes: prev.timelineNotes.filter((n) => (n._id || n.id) !== noteId),
    }));
  };

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="py-16 text-center space-y-4">
        <div className="p-3.5 rounded-2xl bg-emerald-500/10 text-emerald-400 inline-block border border-emerald-500/30">
          <Briefcase className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-white">Job Application Tracker</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Please sign in to manage your end-to-end job search pipeline, interview rounds, and follow-up reminders.
        </p>
        <Link to="/login">
          <Button variant="primary">Sign In to Continue</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Application Tracker
            </h1>
            <Badge variant="teal" size="sm">Phase 8</Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Organize job applications, track scheduled interviews, and manage follow-up tasks.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingApplication(null);
              setIsModalOpen(true);
            }}
          >
            <Plus className="w-4 h-4 mr-1.5" />
            <span>Track Application</span>
          </Button>
        </div>
      </div>

      {/* Analytics Summary Cards & Upcoming Alerts */}
      <AnalyticsSummary
        analytics={analytics}
        onToggleReminder={handleToggleReminder}
        onSelectApplication={(id) => setActiveApplicationId(id)}
      />

      {/* Toolbar: Search, Status Filters, View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
        <div className="flex flex-wrap items-center gap-2.5 flex-1">
          {/* Search Input */}
          <div className="relative min-w-[200px] sm:min-w-[260px]">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search company or role..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          {/* Status Filter Chips */}
          <div className="flex items-center gap-1 overflow-x-auto max-w-full pb-1 sm:pb-0">
            <button
              type="button"
              onClick={() => setSelectedStatus('')}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                selectedStatus === ''
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              All ({applications.length})
            </button>
            {STATUS_COLUMNS.map((col) => {
              const count = applications.filter((a) => a.status === col.id).length;
              return (
                <button
                  key={col.id}
                  type="button"
                  onClick={() => setSelectedStatus(selectedStatus === col.id ? '' : col.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors shrink-0 ${
                    selectedStatus === col.id
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {col.label} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>
        </div>

        {/* View Switcher: Kanban vs Table */}
        <div className="flex items-center gap-1 self-end sm:self-auto bg-slate-900 border border-slate-800 p-1 rounded-xl shrink-0">
          <button
            type="button"
            onClick={() => setViewMode('kanban')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'kanban'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Kanban Board View"
          >
            <Kanban className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
              viewMode === 'table'
                ? 'bg-slate-800 text-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
            title="Table View"
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Table</span>
          </button>
        </div>
      </div>

      {/* Main View Area */}
      {loading ? (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
          <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          <span className="text-xs text-slate-400">Loading your applications...</span>
        </div>
      ) : viewMode === 'kanban' ? (
        <KanbanBoard
          applications={applications}
          onSelectApplication={(id) => setActiveApplicationId(id)}
          onStatusChange={handleStatusChange}
          onOpenAddModal={() => {
            setEditingApplication(null);
            setIsModalOpen(true);
          }}
        />
      ) : (
        <ApplicationTable
          applications={applications}
          onSelectApplication={(id) => setActiveApplicationId(id)}
          onStatusChange={handleStatusChange}
          onDeleteApplication={handleDeleteApplication}
          onSort={handleSort}
          sortBy={sortBy}
          sortOrder={sortOrder}
        />
      )}

      {/* Add / Edit Modal */}
      <ApplicationModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingApplication(null);
        }}
        onSubmit={handleModalSubmit}
        initialData={editingApplication}
        resumes={resumes}
        jobMatches={jobMatches}
        isSaving={isSavingApp}
      />

      {/* Detailed Application Inspection Drawer */}
      <ApplicationDrawer
        isOpen={!!activeApplicationId}
        onClose={() => setActiveApplicationId(null)}
        application={activeApplication}
        onStatusChange={handleStatusChange}
        onEdit={(app) => {
          setEditingApplication(app);
          setIsModalOpen(true);
        }}
        onDelete={handleDeleteApplication}
        onAddInterview={handleAddInterview}
        onUpdateInterview={handleUpdateInterview}
        onDeleteInterview={handleDeleteInterview}
        onAddReminder={handleAddReminder}
        onToggleReminder={handleToggleReminder}
        onDeleteReminder={handleDeleteReminder}
        onAddNote={handleAddNote}
        onDeleteNote={handleDeleteNote}
      />
    </div>
  );
};

export default ApplicationTrackerPage;
