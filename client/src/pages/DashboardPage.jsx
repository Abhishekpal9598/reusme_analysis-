import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Target,
  MessageSquareCode,
  Kanban,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowUpRight,
  LogIn,
  UserPlus,
  UploadCloud,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../services/resumeService';
import { analysisService } from '../services/analysisService';
import { jobMatchService } from '../services/jobMatchService';
import { interviewService } from '../services/interviewService';
import { applicationService } from '../services/applicationService';
import { careerIntelligenceService } from '../services/careerIntelligenceService';

export const DashboardPage = () => {
  const { user, isAuthenticated } = useAuth();
  const [resumeCount, setResumeCount] = useState(null);
  const [latestAnalysis, setLatestAnalysis] = useState(null);
  const [jobMatchCount, setJobMatchCount] = useState(null);
  const [interviewCount, setInterviewCount] = useState(null);
  const [applicationCount, setApplicationCount] = useState(null);
  const [careerProfile, setCareerProfile] = useState(null);

  useEffect(() => {
    if (isAuthenticated) {
      resumeService.listResumes(1, 1).then((data) => {
        setResumeCount(data.meta?.totalCount || 0);
      }).catch(() => {
        setResumeCount(0);
      });

      analysisService.listAllAnalyses().then((data) => {
        if (data.analyses && data.analyses.length > 0) {
          setLatestAnalysis(data.analyses[0]);
        }
      }).catch(() => {
        setLatestAnalysis(null);
      });

      jobMatchService.listJobMatches().then((data) => {
        const matches = data.jobMatches || data.analyses || [];
        setJobMatchCount(matches.length);
      }).catch(() => {
        setJobMatchCount(0);
      });

      interviewService.listSessions().then((data) => {
        setInterviewCount(Array.isArray(data) ? data.length : 0);
      }).catch(() => {
        setInterviewCount(0);
      });

      applicationService.getAnalytics().then((data) => {
        setApplicationCount(data?.totalApplications ?? 0);
      }).catch(() => {
        setApplicationCount(0);
      });

      careerIntelligenceService.getCareerIntelligence().then((data) => {
        setCareerProfile(data);
      }).catch(() => {
        setCareerProfile(null);
      });
    } else {
      setResumeCount(null);
      setLatestAnalysis(null);
      setJobMatchCount(null);
      setInterviewCount(null);
      setApplicationCount(null);
      setCareerProfile(null);
    }
  }, [isAuthenticated]);

  const metricCards = [
    {
      title: 'Resumes Ingested',
      status: isAuthenticated && resumeCount !== null ? `${resumeCount} Uploaded` : 'Not available yet',
      badge: 'Phase 4 Active',
      badgeVariant: 'success',
      icon: FileText,
      note: 'PDF, DOCX & TXT multi-format parsing',
      actionUrl: '/resumes',
    },
    {
      title: 'Resume Quality Score',
      status: isAuthenticated && latestAnalysis ? `${latestAnalysis.overallScore}/100 Latest` : (isAuthenticated ? 'Ready to Audit' : 'Sign in to audit'),
      badge: 'Phase 5 Active',
      badgeVariant: 'purple',
      icon: Sparkles,
      note: 'Calculated via Gemini 5-dimension rubric',
      actionUrl: '/resumes',
    },
    {
      title: 'Target Job Matches',
      status: isAuthenticated && jobMatchCount !== null ? `${jobMatchCount} Evaluated` : (isAuthenticated ? 'Ready to Match' : 'Sign in to match'),
      badge: 'Phase 6 Active',
      badgeVariant: 'teal',
      icon: Target,
      note: 'Semantic skill gap & alignment analysis',
      actionUrl: '/job-matches',
    },
    {
      title: 'Mock Interviews Practiced',
      status: isAuthenticated && interviewCount !== null ? `${interviewCount} Sessions` : (isAuthenticated ? 'Ready to Practice' : 'Sign in to practice'),
      badge: 'Phase 7 Active',
      badgeVariant: 'success',
      icon: MessageSquareCode,
      note: 'AI dynamic questions & STAR rubric evaluation',
      actionUrl: '/interviews',
    },
    {
      title: 'Applications Tracked',
      status: isAuthenticated && applicationCount !== null ? `${applicationCount} Tracked` : (isAuthenticated ? 'Ready to Track' : 'Sign in to track'),
      badge: 'Phase 8 Active',
      badgeVariant: 'teal',
      icon: Kanban,
      note: 'Pipeline stages, interview scheduling & reminders',
      actionUrl: '/applications',
    },
    {
      title: 'Career Readiness Index',
      status: isAuthenticated && careerProfile?.careerReadiness?.overallScore !== null && careerProfile?.careerReadiness?.overallScore !== undefined
        ? `${careerProfile.careerReadiness.overallScore}/100 (${careerProfile.careerReadiness.tier || 'Score'})`
        : (isAuthenticated ? 'Explore Insights' : 'Sign in to evaluate'),
      badge: 'Phase 9 Active',
      badgeVariant: 'purple',
      icon: Sparkles,
      note: 'Unified AI readiness rubric & learning roadmap',
      actionUrl: '/career-intelligence',
    },
  ];

  const modules = [
    {
      title: 'Resume Ingestion & Parser',
      description: 'Upload resumes in PDF, DOCX, and TXT formats (up to 5MB) to extract clean text and detect document sections.',
      icon: FileText,
      phase: 'Phase 4 Active',
      badgeVariant: 'success',
      actionText: 'Upload Resumes',
      actionUrl: '/resumes',
      enabled: true,
    },
    {
      title: 'AI Resume Quality Audit',
      description: 'Generate quantitative section scores (Impact, Brevity, Style, Skills, ATS Readability) with line-by-line bullet rewrites.',
      icon: Sparkles,
      phase: 'Phase 5 Active',
      badgeVariant: 'purple',
      actionText: 'Audit Resumes',
      actionUrl: '/resumes',
      enabled: true,
    },
    {
      title: 'Job Description Matcher',
      description: 'Evaluate your resume against target job postings to identify matched proficiencies, missing competencies, and tailoring recommendations.',
      icon: Target,
      phase: 'Phase 6 Active',
      badgeVariant: 'teal',
      actionText: 'Match Jobs',
      actionUrl: '/job-matches',
      enabled: true,
    },
    {
      title: 'AI Mock Interview Simulator',
      description: 'Practice dynamic technical and STAR behavioral questions customized to your background, with AI answer evaluation.',
      icon: MessageSquareCode,
      phase: 'Phase 7 Active',
      badgeVariant: 'success',
      actionText: 'Practice Interview',
      actionUrl: '/interviews',
      enabled: true,
    },
    {
      title: 'Job Application Tracker',
      description: 'Manage your job search lifecycle across 7 stages with Kanban and Table views, interview scheduling, and in-app follow-up reminders.',
      icon: Kanban,
      phase: 'Phase 8 Active',
      badgeVariant: 'teal',
      actionText: 'Track Applications',
      actionUrl: '/applications',
      enabled: true,
    },
    {
      title: 'AI Career Intelligence & Roadmap',
      description: 'Unified career readiness scoring (CRI), grounded skill gap diagnosis, tailored learning roadmaps, and next-best actions.',
      icon: Sparkles,
      phase: 'Phase 9 Active',
      badgeVariant: 'purple',
      actionText: 'View Insights',
      actionUrl: '/career-intelligence',
      enabled: true,
    },
  ];

  const roadmapMilestones = [
    { phase: 'Phase 3', title: 'Authentication & Database', desc: 'HttpOnly cookie JWT & MongoDB Atlas (Complete)', completed: true },
    { phase: 'Phase 4', title: 'Resume Ingestion & Parser', desc: 'In-memory multi-format extraction engine (Complete)', completed: true },
    { phase: 'Phase 5', title: 'AI Quality Audit', desc: 'Google Gemini structured JSON rubric (Complete)', completed: true },
    { phase: 'Phase 6', title: 'Job Matching', desc: 'Semantic keyword & skill gap engine (Complete)', completed: true },
    { phase: 'Phase 7', title: 'Interview Simulator', desc: 'Custom Q&A and AI rubric answer scoring (Complete)', completed: true },
    { phase: 'Phase 8', title: 'Application Tracker', desc: 'Full application pipeline management (Complete)', completed: true },
    { phase: 'Phase 9', title: 'AI Career Intelligence', desc: 'Unified readiness index, skill gaps & learning roadmap (Active)', completed: true },
  ];

  return (
    <div className="space-y-10">
      {/* Top Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              {isAuthenticated ? `Welcome back, ${user?.fullName}` : 'Career Dashboard'}
            </h1>
            {isAuthenticated && (
              <Badge variant="success" size="sm">Active Session</Badge>
            )}
          </div>
          <p className="text-sm text-slate-400">
            {isAuthenticated
              ? `Signed in as ${user?.email} • Database models, secure cookie session & resume parsing active.`
              : 'Overview of AI career acceleration modules, foundation status, and pipeline architecture.'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <Badge variant="success" size="lg">
            <CheckCircle2 className="w-4 h-4 mr-1.5 inline text-emerald-400" />
            Backend API & Parser Ready
          </Badge>
        </div>
      </div>

      {/* Guest Callout if not authenticated */}
      {!isAuthenticated ? (
        <Card className="bg-emerald-950/20 border-emerald-800/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-emerald-300">Experience Live Authentication & Resume Upload</h3>
              <p className="text-xs text-slate-300">
                Register a new account or sign in to upload, parse, and review PDF, DOCX, and TXT resumes.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Link to="/login">
                <Button variant="outline" size="sm">
                  <LogIn className="w-3.5 h-3.5 mr-1.5" />
                  Sign In
                </Button>
              </Link>
              <Link to="/register">
                <Button variant="primary" size="sm">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5" />
                  Register
                </Button>
              </Link>
            </div>
          </div>
        </Card>
      ) : (
        <Card className="bg-emerald-950/20 border-emerald-800/40 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-emerald-300">Resume Ingestion Active</h3>
              <p className="text-xs text-slate-300">
                You have {resumeCount || 0} resume document(s) stored. Upload new documents or view extracted text.
              </p>
            </div>
            <Link to="/resumes">
              <Button variant="primary" size="sm">
                <UploadCloud className="w-3.5 h-3.5 mr-1.5" />
                Manage Resumes
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricCards.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <Card key={idx} className="h-full flex flex-col justify-between space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                  {metric.title}
                </span>
                <div className="p-2 rounded-lg bg-slate-800 border border-slate-700/60 text-emerald-400">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-base font-semibold text-slate-200 tracking-tight">
                  {metric.status}
                </div>
                <div className="text-xs text-slate-400 leading-normal">
                  {metric.note}
                </div>
              </div>
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-mono">Status</span>
                <Badge variant={metric.badgeVariant} size="sm">{metric.badge}</Badge>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Pipeline Status & Empty State Banner */}
      <Card className="bg-slate-900/90 border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-start gap-4">
          <div className="p-3 rounded-xl bg-slate-800 border border-slate-700 text-emerald-400 shrink-0 self-start">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-2 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-white">
                Platform Pipeline Ready for AI Quality Audit (Phase 5)
              </h2>
              <Badge variant="success" size="sm">Phase 4 Complete</Badge>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed max-w-3xl">
              Deterministic text parsing for PDF, DOCX, and TXT is verified with zero disk exposure. Google Gemini AI structured quality scoring and line-by-line rewrite suggestions will be activated in Phase 5.
            </p>
          </div>
        </div>

        {/* Sequential Roadmap Progression */}
        <div className="pt-4 border-t border-slate-800">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-4">
            Roadmap & Architecture Progression
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {roadmapMilestones.map((milestone, idx) => (
              <div
                key={idx}
                className={`p-3 rounded-lg border flex items-start gap-3 ${
                  milestone.completed
                    ? 'bg-emerald-950/20 border-emerald-800/50'
                    : 'bg-slate-950/60 border-slate-800'
                }`}
              >
                <div className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold shrink-0 mt-0.5 ${
                  milestone.completed
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-800 text-emerald-400'
                }`}>
                  {milestone.completed ? '✓' : idx + 3}
                </div>
                <div className="space-y-0.5">
                  <div className={`text-xs font-semibold ${milestone.completed ? 'text-emerald-300' : 'text-slate-200'}`}>
                    {milestone.title}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {milestone.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Career Modules Grid */}
      <div className="space-y-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">
            Core Career Intelligence Modules
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Modular components designed according to the Phase 1 Technical Architecture.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {modules.map((mod, idx) => {
            const Icon = mod.icon;
            return (
              <Card key={idx} hoverEffect className="h-full flex flex-col justify-between space-y-5">
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-lg bg-slate-800 border border-slate-700/80 flex items-center justify-center text-emerald-400">
                      <Icon className="w-5 h-5" />
                    </div>
                    <Badge variant={mod.badgeVariant} size="sm">{mod.phase}</Badge>
                  </div>
                  <h3 className="text-base font-semibold text-white">{mod.title}</h3>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">{mod.description}</p>
                </div>
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-mono">
                    Status: {mod.enabled ? 'Ready' : 'Planned'}
                  </span>
                  {mod.enabled ? (
                    <Link to={mod.actionUrl}>
                      <Button variant="primary" size="sm">
                        {mod.actionText}
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  ) : (
                    <Button variant="outline" size="sm" disabled>
                      {mod.actionText}
                      <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                    </Button>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Architecture & Security Summary */}
      <Card className="bg-slate-900/60 border-slate-800">
        <div className="flex flex-col sm:flex-row items-start gap-4">
          <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div className="space-y-1 text-sm">
            <h4 className="font-semibold text-white">Security & Document Ingestion Verification</h4>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              In-memory parsing for PDF, DOCX, and TXT is verified with zero local disk persistence. Multi-tenant document isolation and strict IDOR protections are enforced across all queries.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
