import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  MessageSquareCode,
  Sparkles,
  Briefcase,
  FileText,
  Layers,
  Award,
  ChevronRight,
  Clock,
  History,
  Trash2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  ArrowRight,
  Brain,
  ShieldAlert,
  Play,
  RotateCcw,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../services/resumeService';
import { interviewService } from '../services/interviewService';

const SUGGESTED_ROLES = [
  'Full Stack Developer',
  'Frontend Engineer',
  'Backend Engineer (Node/Python)',
  'Data Scientist / ML Engineer',
  'DevOps & Cloud Engineer',
  'Technical Product Manager',
];

const CATEGORIES = [
  { id: 'Technical', label: 'Technical Interview', desc: 'Architecture, core algorithms, edge cases, system design' },
  { id: 'Behavioral', label: 'Behavioral Interview', desc: 'STAR scenarios, leadership, conflict resolution, collaboration' },
  { id: 'HR', label: 'HR & Cultural Fit', desc: 'Career trajectory, work style, motivation, expectations' },
  { id: 'Role-Based', label: 'Role-Based Challenges', desc: 'Scenario triage, sprint trade-offs, incident response' },
  { id: 'General', label: 'General / Mixed', desc: 'Balanced assessment spanning technical depth and soft skills' },
];

const EXPERIENCE_LEVELS = [
  { id: 'Junior', label: 'Junior (0-2 yrs)' },
  { id: 'Mid', label: 'Mid-Level (2-5 yrs)' },
  { id: 'Senior', label: 'Senior (5-8 yrs)' },
  { id: 'Lead', label: 'Lead / Staff (8+ yrs)' },
];

const DIFFICULTIES = [
  { id: 'Easy', label: 'Easy' },
  { id: 'Medium', label: 'Medium' },
  { id: 'Hard', label: 'Hard' },
];

const QUESTION_COUNTS = [3, 5, 7, 10];

export const InterviewSetupPage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Setup form states (default to first suggested role for instant readiness)
  const [jobRole, setJobRole] = useState(SUGGESTED_ROLES[0]);
  const [experienceLevel, setExperienceLevel] = useState('Mid');
  const [category, setCategory] = useState('Technical');
  const [difficulty, setDifficulty] = useState('Medium');
  const [questionCount, setQuestionCount] = useState(5);
  const [selectedResumeId, setSelectedResumeId] = useState('');

  // Resumes list & history list
  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);
  const [historyList, setHistoryList] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Submission state
  const [generating, setGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch resumes
  const fetchResumes = useCallback(async () => {
    if (!isAuthenticated) {
      setLoadingResumes(false);
      return;
    }
    try {
      setLoadingResumes(true);
      const data = await resumeService.listResumes();
      setResumes(data.resumes || []);
    } catch (err) {
      // Non-blocking resume error
      console.warn('Could not fetch resumes:', err);
    } finally {
      setLoadingResumes(false);
    }
  }, [isAuthenticated]);

  // Fetch interview history
  const fetchHistory = useCallback(async () => {
    if (!isAuthenticated) {
      setLoadingHistory(false);
      return;
    }
    try {
      setLoadingHistory(true);
      const data = await interviewService.listSessions();
      setHistoryList(data || []);
    } catch (err) {
      console.warn('Could not fetch interview history:', err);
    } finally {
      setLoadingHistory(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchResumes();
    fetchHistory();
  }, [fetchResumes, fetchHistory]);

  const handleStartInterview = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!jobRole.trim()) {
      setErrorMessage('Please specify target job role.');
      return;
    }

    try {
      setGenerating(true);
      const session = await interviewService.createSession({
        jobRole: jobRole.trim(),
        experienceLevel,
        category,
        difficulty,
        questionCount: Number(questionCount),
        resumeId: selectedResumeId ? selectedResumeId : null,
      });

      if (session && session.id) {
        navigate(`/interviews/${session.id}`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to start interview session. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this interview record?')) return;
    try {
      await interviewService.deleteSession(id);
      setHistoryList((prev) => prev.filter((s) => s.id !== id && s._id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete session');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/40 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Phase 7 AI Simulation</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                AI Mock Interview Simulator
              </h1>
              <p className="text-sm sm:text-base text-slate-400 max-w-2xl">
                Prepare for high-stakes interviews with realistic questions generated by Google Gemini.
                Receive granular rubric evaluations, STAR behavioral coaching, and a personalized preparation roadmap.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="p-3.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-emerald-400">
                <MessageSquareCode className="w-8 h-8" />
              </div>
            </div>
          </div>
        </div>

        {/* Error notification */}
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold">Setup Error:</span> {errorMessage}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Setup Form (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 backdrop-blur-sm">
              <form onSubmit={handleStartInterview} noValidate className="space-y-6">
                {/* 1. Job Role Input */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label htmlFor="jobRole" className="block text-sm font-semibold text-slate-200">
                      Target Job Role <span className="text-emerald-400">*</span>
                    </label>
                    {errorMessage && !jobRole.trim() && (
                      <span className="text-xs text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Please enter or choose a job role
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <Briefcase className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      id="jobRole"
                      type="text"
                      value={jobRole}
                      onChange={(e) => {
                        setJobRole(e.target.value);
                        if (errorMessage) setErrorMessage('');
                      }}
                      placeholder="e.g. Senior Full Stack Engineer, Cloud Architect..."
                      className={`w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border text-slate-100 placeholder:text-slate-500 focus:outline-none text-sm transition-all ${
                        errorMessage && !jobRole.trim()
                          ? 'border-rose-500/60 focus:ring-2 focus:ring-rose-500/40'
                          : 'border-slate-800 focus:ring-2 focus:ring-emerald-500'
                      }`}
                    />
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <span className="text-xs text-slate-500 self-center mr-1">Suggestions:</span>
                    {SUGGESTED_ROLES.map((role) => {
                      const isSelected = jobRole.trim().toLowerCase() === role.toLowerCase();
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => {
                            setJobRole(role);
                            if (errorMessage) setErrorMessage('');
                          }}
                          className={`px-2.5 py-1 rounded-lg text-xs transition-colors border ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/60 font-medium shadow-sm'
                              : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60'
                          }`}
                        >
                          {role}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Experience Level */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-200">Experience Seniority</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setExperienceLevel(lvl.id)}
                        className={`p-3 rounded-xl border text-center transition-all text-xs sm:text-sm font-medium ${
                          experienceLevel === lvl.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold shadow-sm'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Category */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-200">Interview Focus Category</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {CATEGORIES.map((cat) => (
                      <div
                        key={cat.id}
                        onClick={() => setCategory(cat.id)}
                        className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                          category === cat.id
                            ? 'bg-emerald-500/15 border-emerald-500/50 shadow-sm'
                            : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-sm font-semibold ${category === cat.id ? 'text-emerald-300' : 'text-slate-200'}`}>
                            {cat.label}
                          </span>
                          {category === cat.id && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                        </div>
                        <p className="text-xs text-slate-400">{cat.desc}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Difficulty & Question Count */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-200">Interview Difficulty</label>
                    <div className="grid grid-cols-3 gap-2">
                      {DIFFICULTIES.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          onClick={() => setDifficulty(d.id)}
                          className={`py-2 px-2 rounded-xl border text-center text-xs font-medium transition-all ${
                            difficulty === d.id
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {d.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-200">Question Count</label>
                    <div className="grid grid-cols-4 gap-2">
                      {QUESTION_COUNTS.map((count) => (
                        <button
                          key={count}
                          type="button"
                          onClick={() => setQuestionCount(count)}
                          className={`py-2 rounded-xl border text-center text-xs font-medium transition-all ${
                            questionCount === count
                              ? 'bg-emerald-500/15 border-emerald-500/50 text-emerald-300 font-semibold'
                              : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                          }`}
                        >
                          {count} Qs
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 5. Optional Resume Selection */}
                <div className="space-y-2 pt-2 border-t border-slate-800">
                  <div className="flex items-center justify-between">
                    <label htmlFor="resumeSelect" className="block text-sm font-semibold text-slate-200">
                      Contextualize with Resume <span className="text-xs text-slate-500 font-normal">(Optional)</span>
                    </label>
                    <Link to="/resumes" className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1">
                      <span>Manage Resumes</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                  <div className="relative">
                    <FileText className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <select
                      id="resumeSelect"
                      value={selectedResumeId}
                      onChange={(e) => setSelectedResumeId(e.target.value)}
                      disabled={loadingResumes}
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      <option value="">No Resume (General industry benchmarks)</option>
                      {resumes.map((r) => (
                        <option key={r.id || r._id} value={r.id || r._id}>
                          {r.originalFileName || 'Resume Document'} (Uploaded {new Date(r.createdAt).toLocaleDateString()})
                        </option>
                      ))}
                    </select>
                  </div>
                  <p className="text-xs text-slate-500">
                    Selecting a resume allows Gemini to probe your actual claimed projects, tech stacks, and metrics.
                  </p>
                </div>

                {/* Submit CTA */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    disabled={generating}
                    className="w-full justify-center py-3.5 text-base font-semibold"
                  >
                    {generating ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin text-white" />
                        <span>Generating Tailored Interview Questions...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 mr-2 fill-current" />
                        <span>Start Mock Interview</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </Card>
          </div>

          {/* Right Column: Information & History (1 col) */}
          <div className="space-y-6">
            {/* Practice Info Box */}
            <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                <Brain className="w-4 h-4" />
                <span>Simulated Evaluation Engine</span>
              </div>
              <ul className="text-xs text-slate-400 space-y-2">
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Granular Rubrics:</strong> Scored on Accuracy, Completeness, Clarity, and Problem Solving.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>STAR Analysis:</strong> Behavioral responses are audited for Situation, Task, Action, and Result.</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-emerald-400 font-bold">•</span>
                  <span><strong>Session Recovery:</strong> Refresh anytime; your submitted answers and evaluations persist in MongoDB.</span>
                </li>
              </ul>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 italic">
                Performance indicators (e.g. Strong Hire) reflect practice response quality and are not guarantees of actual hiring outcomes.
              </div>
            </Card>

            {/* Recent Sessions History */}
            <Card className="p-5 bg-slate-900/60 border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                  <History className="w-4 h-4 text-emerald-400" />
                  <span>Interview History</span>
                </div>
                <span className="text-xs text-slate-500">{historyList.length} total</span>
              </div>

              {loadingHistory ? (
                <div className="py-8 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Loading history...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  No interview sessions yet. Start your first practice session above!
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {historyList.map((s) => {
                    const sid = s.id || s._id;
                    const isCompleted = s.status === 'completed';
                    const score = s.overallReport?.overallScore;

                    return (
                      <div
                        key={sid}
                        onClick={() => navigate(isCompleted ? `/interviews/${sid}/report` : `/interviews/${sid}`)}
                        className="p-3 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all flex items-center justify-between group"
                      >
                        <div className="space-y-1 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-slate-200 truncate max-w-[140px]">
                              {s.jobRole || s.jobTitle}
                            </span>
                            <Badge
                              variant={isCompleted ? 'success' : 'amber'}
                              size="sm"
                              className="text-[10px] py-0 px-1.5"
                            >
                              {isCompleted ? 'Completed' : 'In Progress'}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500">
                            <span>{s.category}</span>
                            <span>•</span>
                            <span>{new Date(s.createdAt).toLocaleDateString()}</span>
                            {score !== undefined && (
                              <>
                                <span>•</span>
                                <span className="text-emerald-400 font-semibold">{score}/100</span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSession(sid, e)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete interview session"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSetupPage;
