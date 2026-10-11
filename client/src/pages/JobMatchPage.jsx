import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Target,
  FileText,
  Building2,
  Briefcase,
  Sparkles,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  History,
  Trash2,
  ArrowRight,
  HelpCircle,
  Layers,
  ChevronRight,
  LogIn,
  Check,
  AlertTriangle,
  Lightbulb,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../services/resumeService';
import { jobMatchService } from '../services/jobMatchService';

function getScoreTier(score) {
  if (score >= 80) {
    return {
      label: 'High Match',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/30',
      progressClass: 'bg-emerald-500',
    };
  }
  if (score >= 60) {
    return {
      label: 'Moderate Alignment',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30',
      progressClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Low Alignment',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    progressClass: 'bg-rose-500',
  };
}

export const JobMatchPage = () => {
  const { isAuthenticated } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [loadingResumes, setLoadingResumes] = useState(true);

  // Form inputs
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [jobDescription, setJobDescription] = useState('');

  // Processing & result states
  const [matching, setMatching] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [currentMatch, setCurrentMatch] = useState(null);

  // Report active tab
  const [activeReportTab, setActiveReportTab] = useState('overview'); // overview, skills, tailoring

  // History state
  const [historyList, setHistoryList] = useState([]);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Load user resumes
  const fetchResumes = useCallback(async () => {
    if (!isAuthenticated) {
      setLoadingResumes(false);
      return;
    }

    try {
      setLoadingResumes(true);
      const data = await resumeService.listResumes();
      const list = data.resumes || [];
      setResumes(list);
      if (list.length > 0) {
        setSelectedResumeId(list[0].id);
      }
    } catch (err) {
      setErrorMessage('Failed to load user resumes. Please refresh.');
    } finally {
      setLoadingResumes(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  // Load History
  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const data = await jobMatchService.listJobMatches();
      setHistoryList(data.jobMatches || data.analyses || []);
    } catch (err) {
      setErrorMessage('Failed to load job match history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenHistory = () => {
    fetchHistory();
    setShowHistoryModal(true);
  };

  const handleDeleteHistoryItem = async (e, id) => {
    e.stopPropagation();
    try {
      await jobMatchService.deleteJobMatch(id);
      setHistoryList((prev) => prev.filter((item) => item.id !== id));
      if (currentMatch?.id === id) {
        setCurrentMatch(null);
      }
    } catch (err) {
      setErrorMessage('Failed to delete match record.');
    }
  };

  // Submit Job Match
  const handleAnalyzeMatch = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!selectedResumeId) {
      setErrorMessage('Please select an uploaded resume to evaluate.');
      return;
    }

    if (!jobDescription || jobDescription.trim().length < 20) {
      setErrorMessage('Please provide a job description with at least 20 characters.');
      return;
    }

    if (jobDescription.length > 20000) {
      setErrorMessage('Job description exceeds the 20,000 character limit.');
      return;
    }

    try {
      setMatching(true);
      const response = await jobMatchService.createJobMatch({
        resumeId: selectedResumeId,
        jobTitle: jobTitle.trim(),
        companyName: companyName.trim(),
        jobDescription: jobDescription.trim(),
      });

      const matchData = response.jobAnalysis || response.data?.jobAnalysis;
      setCurrentMatch(matchData);
      setActiveReportTab('overview');
      setSuccessMessage('Job description match analysis completed successfully!');
      // Scroll to report on mobile
      window.scrollTo({ top: 400, behavior: 'smooth' });
    } catch (err) {
      setErrorMessage(err.message || 'AI job matching failed. Please try again.');
    } finally {
      setMatching(false);
    }
  };

  const handleSampleFill = () => {
    setJobTitle('Senior Full Stack Engineer');
    setCompanyName('TechCorp Cloud');
    setJobDescription(
      'We are seeking a Senior Full Stack Engineer to join our core product engineering team.\n\n' +
      'Requirements:\n' +
      '- 4+ years of professional experience building web applications with React, TypeScript, and Node.js.\n' +
      '- Strong knowledge of MongoDB, PostgreSQL, and RESTful API architecture.\n' +
      '- Experience with CI/CD deployment pipelines (GitHub Actions, Docker, AWS).\n' +
      '- Familiarity with GraphQL, automated testing (Jest, Vitest), and web performance optimization.\n' +
      '- Bachelor degree in Computer Science or equivalent practical experience.'
    );
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-slate-900 border border-slate-800 text-teal-400">
          <Target className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Authentication Required</h1>
          <p className="text-sm text-slate-400">
            Please sign in to compare your uploaded resumes against target job descriptions and view skill gaps.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/login">
            <Button variant="primary" size="md">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="secondary" size="md">
              Create Account
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const selectedResumeObj = resumes.find((r) => r.id === selectedResumeId);
  const scoreTier = currentMatch ? getScoreTier(currentMatch.matchScore || currentMatch.overallMatchScore || 0) : null;

  return (
    <div className="space-y-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Job Description Matcher
            </h1>
            <Badge variant="teal" size="sm">Phase 6 Active</Badge>
          </div>
          <p className="text-sm text-slate-400">
            Evaluate alignment between your resume and target job postings to uncover matched competencies and critical gaps.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" size="sm" onClick={handleOpenHistory}>
            <History className="w-4 h-4 mr-1.5" />
            Match History
          </Button>
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-start justify-between gap-3 text-xs text-rose-200 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <div className="space-y-1.5">
              <span className="block font-medium">{errorMessage}</span>
              <button
                type="button"
                onClick={handleAnalyzeMatch}
                disabled={matching || !selectedResumeId || !jobDescription}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-200 text-xs font-semibold transition-colors disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Retry Analysis
              </button>
            </div>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-rose-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMessage && (
        <div className="p-4 rounded-lg bg-emerald-950/60 border border-emerald-800/80 flex items-start justify-between gap-3 text-xs text-emerald-200 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
            <span>{successMessage}</span>
          </div>
          <button onClick={() => setSuccessMessage('')} className="text-emerald-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Grid: Form + Results */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input Form (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="p-6 space-y-5 bg-slate-900/60 border-slate-800">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-teal-400" />
                Matching Parameters
              </h2>
              <button
                type="button"
                onClick={handleSampleFill}
                className="text-xs text-teal-400 hover:text-teal-300 font-medium"
              >
                Fill Sample JD
              </button>
            </div>

            <form onSubmit={handleAnalyzeMatch} className="space-y-4">
              {/* Resume Selector */}
              <div className="space-y-1.5">
                <label htmlFor="resume-select" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Select Resume *</span>
                  <Link to="/resumes" className="text-[11px] text-teal-400 hover:underline">
                    Manage Resumes &rarr;
                  </Link>
                </label>
                {loadingResumes ? (
                  <div className="p-3 bg-slate-950 border border-slate-800 rounded-lg text-xs text-slate-400 flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading resumes...
                  </div>
                ) : resumes.length === 0 ? (
                  <div className="p-4 bg-slate-950 border border-amber-900/40 rounded-lg text-xs text-amber-300 space-y-2">
                    <p>No resumes uploaded yet. Please upload a resume first.</p>
                    <Link to="/resumes">
                      <Button variant="primary" size="sm" className="w-full">
                        Upload Resume
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <select
                    id="resume-select"
                    value={selectedResumeId}
                    onChange={(e) => setSelectedResumeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={matching}
                  >
                    {resumes.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.originalFileName} ({r.fileFormat?.toUpperCase()}) &bull; {r.wordCount || 0} words
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Job Title & Company */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label htmlFor="job-title-input" className="text-xs font-medium text-slate-300">
                    Job Title (Optional)
                  </label>
                  <input
                    id="job-title-input"
                    type="text"
                    value={jobTitle}
                    onChange={(e) => setJobTitle(e.target.value)}
                    placeholder="e.g. Senior Frontend Dev"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={matching}
                    maxLength={150}
                  />
                </div>
                <div className="space-y-1">
                  <label htmlFor="company-name-input" className="text-xs font-medium text-slate-300">
                    Company (Optional)
                  </label>
                  <input
                    id="company-name-input"
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Stripe, Google"
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    disabled={matching}
                    maxLength={150}
                  />
                </div>
              </div>

              {/* Job Description Textarea */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <label htmlFor="jd-textarea" className="font-semibold text-slate-300">
                    Job Description *
                  </label>
                  <span className={`text-[11px] ${jobDescription.length > 18000 ? 'text-amber-400' : 'text-slate-500'}`}>
                    {jobDescription.length.toLocaleString()} / 20,000 chars
                  </span>
                </div>
                <textarea
                  id="jd-textarea"
                  value={jobDescription}
                  onChange={(e) => setJobDescription(e.target.value)}
                  placeholder="Paste the full job posting, responsibilities, and required qualifications here..."
                  rows={8}
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-lg p-3 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500 leading-relaxed font-sans resize-y"
                  disabled={matching}
                  maxLength={20000}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full justify-center bg-teal-600 hover:bg-teal-500 text-white font-semibold py-2.5"
                disabled={matching || resumes.length === 0}
              >
                {matching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing Alignment with Gemini AI...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 text-teal-200" />
                    Analyze Job Match
                  </>
                )}
              </Button>
            </form>
          </Card>
        </div>

        {/* Right Column: Report Display (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {!currentMatch ? (
            <Card className="p-12 text-center space-y-4 bg-slate-900/30 border-slate-800/80 flex flex-col items-center justify-center min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-500">
                <Target className="w-8 h-8" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-bold text-slate-200">No Job Match Report Generated Yet</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Select an uploaded resume, paste a target job description on the left, and click &ldquo;Analyze Job Match&rdquo; to generate a comprehensive skill gap and alignment audit.
                </p>
              </div>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300">
              {/* Mandatory Hiring Disclaimer Banner */}
              <div className="p-3.5 bg-teal-950/40 border border-teal-800/50 rounded-xl flex items-start gap-2.5 text-xs text-teal-200">
                <HelpCircle className="w-4 h-4 text-teal-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Advisory Notice:</strong> {currentMatch.disclaimer || 'Match score indicates semantic keyword and experience alignment. It does not represent guaranteed interview or hiring probability.'}
                </span>
              </div>

              {/* Match Header & Overall Score Card */}
              <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {currentMatch.jobTitle || 'Target Position'}
                    </h2>
                    <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                      {currentMatch.companyName && <span>{currentMatch.companyName} &bull;</span>}
                      <span>Evaluated with {currentMatch.providerMetadata?.model || 'Gemini AI'}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="flex items-baseline space-x-1">
                        <span className={`text-4xl font-black ${scoreTier.textClass}`}>
                          {currentMatch.matchScore || currentMatch.overallMatchScore || 0}%
                        </span>
                      </div>
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${scoreTier.bgClass} ${scoreTier.textClass} ${scoreTier.borderClass}`}
                      >
                        {scoreTier.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Summary Assessment */}
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Executive Match Summary
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {currentMatch.summaryAssessment}
                  </p>
                </div>

                {/* 4 Dimension Progress Bars */}
                {currentMatch.dimensionScores && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {[
                      { key: 'skillsAlignment', label: 'Skills Alignment (40%)', data: currentMatch.dimensionScores.skillsAlignment },
                      { key: 'experienceAlignment', label: 'Experience Alignment (30%)', data: currentMatch.dimensionScores.experienceAlignment },
                      { key: 'educationAlignment', label: 'Education Alignment (15%)', data: currentMatch.dimensionScores.educationAlignment },
                      { key: 'responsibilityAlignment', label: 'Responsibility Scope (15%)', data: currentMatch.dimensionScores.responsibilityAlignment },
                    ].map((dim) => {
                      const tier = getScoreTier(dim.data?.score ?? 0);
                      return (
                        <div key={dim.key} className="p-3 bg-slate-950/60 rounded-lg border border-slate-800 space-y-1.5">
                          <div className="flex justify-between text-xs font-medium">
                            <span className="text-slate-300">{dim.label}</span>
                            <span className={`font-bold ${tier.textClass}`}>{dim.data?.score ?? 0}%</span>
                          </div>
                          <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${tier.progressClass} transition-all duration-500`}
                              style={{ width: `${dim.data?.score ?? 0}%` }}
                            />
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">{dim.data?.explanation}</p>
                        </div>
                      );
                    })}
                  </div>
                )}
              </Card>

              {/* Tab Navigation */}
              <div className="flex border-b border-slate-800 bg-slate-900/50 rounded-t-xl px-2 sm:px-4 overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setActiveReportTab('overview')}
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeReportTab === 'overview'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Skills ({currentMatch.skillsAnalysis?.matchedSkills?.length || 0} Matched)
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('gaps')}
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeReportTab === 'gaps'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Skill Gap Analysis ({currentMatch.skillsAnalysis?.skillGaps?.length || (currentMatch.skillsAnalysis?.missingOrUnverifiedSkills?.length || 0) + (currentMatch.skillsAnalysis?.partiallyMatchedSkills?.length || 0)})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('experience')}
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeReportTab === 'experience'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Experience & Education
                </button>
                <button
                  type="button"
                  onClick={() => setActiveReportTab('tailoring')}
                  className={`py-2.5 px-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                    activeReportTab === 'tailoring'
                      ? 'border-teal-500 text-teal-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Tailoring & Projects
                </button>
              </div>

              {/* Tab Content */}
              <div className="space-y-4">
                {activeReportTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Matched Skills */}
                    <div className="p-4 rounded-xl bg-emerald-950/10 border border-emerald-900/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                        <Check className="w-4 h-4" />
                        <span>Matched Required Skills ({currentMatch.skillsAnalysis?.matchedSkills?.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {currentMatch.skillsAnalysis?.matchedSkills?.map((ms, i) => (
                          <div key={i} className="p-2.5 bg-slate-900/70 border border-emerald-900/30 rounded-lg text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-emerald-300">{ms.skill}</span>
                              {ms.category && (
                                <Badge variant="neutral" size="sm">
                                  {ms.category}
                                </Badge>
                              )}
                            </div>
                            {ms.evidenceFromResume && (
                              <p className="text-[11px] text-slate-300 mt-1 italic">&ldquo;{ms.evidenceFromResume}&rdquo;</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Missing / Unverified Skills */}
                    <div className="p-4 rounded-xl bg-rose-950/10 border border-rose-900/30 space-y-2.5">
                      <div className="flex items-center gap-2 text-rose-400 text-xs font-bold uppercase tracking-wider">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Missing or Unverified Requirements ({currentMatch.skillsAnalysis?.missingOrUnverifiedSkills?.length || 0})</span>
                      </div>
                      <div className="space-y-2">
                        {currentMatch.skillsAnalysis?.missingOrUnverifiedSkills?.map((ms, i) => (
                          <div key={i} className="p-2.5 bg-slate-900/70 border border-rose-900/30 rounded-lg text-xs flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-rose-300">{ms.skill}</span>
                              <p className="text-[11px] text-slate-400 mt-0.5">{ms.rationale}</p>
                            </div>
                            <Badge variant="danger" size="sm">
                              {ms.criticality || 'Critical'}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Partial Matches */}
                    {currentMatch.skillsAnalysis?.partiallyMatchedSkills?.length > 0 && (
                      <div className="p-4 rounded-xl bg-amber-950/10 border border-amber-900/30 space-y-2.5">
                        <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                          <AlertCircle className="w-4 h-4" />
                          <span>Partially Matched Skills ({currentMatch.skillsAnalysis.partiallyMatchedSkills.length})</span>
                        </div>
                        <div className="space-y-2">
                          {currentMatch.skillsAnalysis.partiallyMatchedSkills.map((ps, i) => (
                            <div key={i} className="p-2.5 bg-slate-900/70 border border-amber-900/30 rounded-lg text-xs space-y-1">
                              <span className="font-bold text-amber-300">{ps.skill}</span>
                              <div className="text-[11px] text-slate-400">
                                <strong>Job Requirement:</strong> {ps.jobRequirement}
                              </div>
                              <div className="text-[11px] text-slate-300">
                                <strong>Resume Context:</strong> {ps.resumeContext}
                              </div>
                              <div className="text-[11px] text-amber-200 pt-0.5">
                                <strong>Gap Analysis:</strong> {ps.gapExplanation}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeReportTab === 'gaps' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-teal-400" />
                          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                            Skill Gap & Requirement Alignment
                          </h4>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Evidence-based comparison against resume text
                        </span>
                      </div>

                      <div className="space-y-3 pt-1">
                        {((currentMatch.skillsAnalysis?.skillGaps && currentMatch.skillsAnalysis.skillGaps.length > 0)
                          ? currentMatch.skillsAnalysis.skillGaps
                          : [
                              ...(currentMatch.skillsAnalysis?.missingOrUnverifiedSkills || []).map((m) => ({
                                skill: m.skill,
                                resumeEvidence: 'Not explicitly documented in resume',
                                jobRequirement: m.rationale || 'Required by job posting',
                                matchStatus: m.criticality === 'critical' ? 'Missing' : 'Unverified',
                                importance: m.criticality === 'critical' ? 'High' : 'Medium',
                              })),
                              ...(currentMatch.skillsAnalysis?.partiallyMatchedSkills || []).map((p) => ({
                                skill: p.skill,
                                resumeEvidence: p.resumeContext || 'Adjacent experience noted',
                                jobRequirement: p.jobRequirement || 'Required by job posting',
                                matchStatus: 'Partial Match',
                                importance: 'Medium',
                              })),
                            ]
                        ).map((gap, idx) => (
                          <div
                            key={idx}
                            className="p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition-colors"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-white text-sm">{gap.skill}</span>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    gap.matchStatus === 'Matched'
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                      : gap.matchStatus === 'Partial Match'
                                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                  }`}
                                >
                                  {gap.matchStatus || 'Missing'}
                                </span>
                                <Badge
                                  variant={
                                    gap.importance?.toLowerCase() === 'high'
                                      ? 'danger'
                                      : gap.importance?.toLowerCase() === 'medium'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                  size="sm"
                                >
                                  {gap.importance ? `${gap.importance} Priority` : 'General'}
                                </Badge>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                                <span className="font-semibold text-slate-400 block mb-0.5">Job Requirement:</span>
                                <span className="text-slate-200">{gap.jobRequirement || 'Required by job description'}</span>
                              </div>
                              <div className="p-2 rounded bg-slate-900/80 border border-slate-800/80">
                                <span className="font-semibold text-slate-400 block mb-0.5">Resume Evidence:</span>
                                <span
                                  className={
                                    gap.resumeEvidence?.toLowerCase().includes('not') ||
                                    gap.resumeEvidence?.toLowerCase().includes('none')
                                      ? 'text-rose-300 italic'
                                      : 'text-slate-200'
                                  }
                                >
                                  {gap.resumeEvidence || 'No direct evidence found in resume'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeReportTab === 'experience' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-teal-400 tracking-wider">
                        Relevant Demonstrated Experience
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {currentMatch.experienceAnalysis?.relevantExperience?.map((exp, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-teal-400 font-bold">&bull;</span>
                            <span>{exp}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider">
                        Experience & Seniority Gaps
                      </h4>
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {currentMatch.experienceAnalysis?.experienceGaps?.map((gap, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold">&bull;</span>
                            <span>{gap}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Education Alignment */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                        Education & Certification Fit
                      </h4>
                      <div className="space-y-2 text-xs">
                        {currentMatch.educationAnalysis?.relevantMatches?.map((ed, idx) => (
                          <div key={idx} className="text-emerald-300 flex items-center gap-1.5">
                            <Check className="w-3.5 h-3.5" /> {ed}
                          </div>
                        ))}
                        {currentMatch.educationAnalysis?.unmetOrUnverifiedRequirements?.map((ed, idx) => (
                          <div key={idx} className="text-rose-300 flex items-center gap-1.5">
                            <X className="w-3.5 h-3.5" /> {ed}
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Responsibility Scope */}
                    {currentMatch.dimensionScores?.responsibilityAlignment && (
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                        <h4 className="text-xs font-bold uppercase text-purple-400 tracking-wider">
                          Responsibility Scope & Leadership Fit
                        </h4>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          {currentMatch.dimensionScores.responsibilityAlignment.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {activeReportTab === 'tailoring' && (
                  <div className="space-y-4">
                    {/* Priority Improvements */}
                    {currentMatch.recommendations?.priorityImprovements?.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                          <AlertCircle className="w-4 h-4" />
                          High-Impact Skill Improvements
                        </h4>
                        <ul className="space-y-2 text-xs text-slate-300">
                          {currentMatch.recommendations.priorityImprovements.map((imp, i) => (
                            <li key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                              <span className="text-amber-400 font-bold mt-0.5">&bull;</span>
                              <span>{imp}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Priority Tailoring */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-teal-400 tracking-wider flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" />
                        Resume Tailoring Suggestions
                      </h4>
                      <ul className="space-y-2 text-xs text-slate-300">
                        {currentMatch.recommendations?.resumeTailoringSuggestions?.map((rec, i) => (
                          <li key={i} className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-start gap-2">
                            <span className="text-teal-400 font-bold mt-0.5">&rarr;</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Suggested Projects */}
                    {currentMatch.recommendations?.suggestedProjects?.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                        <h4 className="text-xs font-bold uppercase text-teal-400 tracking-wider flex items-center gap-2">
                          <Sparkles className="w-4 h-4" />
                          Suggested Projects to Bridge Skill Gaps
                        </h4>
                        <div className="space-y-2">
                          {currentMatch.recommendations.suggestedProjects.map((proj, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-slate-950 rounded-lg border border-teal-900/30 text-xs text-slate-200 flex items-start gap-2.5"
                            >
                              <span className="px-1.5 py-0.5 rounded bg-teal-500/10 text-teal-400 font-bold text-[10px] shrink-0 mt-0.5">
                                #{idx + 1}
                              </span>
                              <p className="leading-relaxed">{proj}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Relevant Keywords to Include */}
                    <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
                      <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                        Recommended Keywords to Integrate (Truthfully)
                      </h4>
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {currentMatch.recommendations?.relevantKeywordsToConsider?.map((kw, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2.5 py-1 rounded-md"
                          >
                            + {kw}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-teal-500/10 text-teal-400">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Job Match History</h3>
                  <p className="text-xs text-slate-400">Previous evaluations and match scores</p>
                </div>
              </div>
              <button
                onClick={() => setShowHistoryModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-teal-500" />
                  <span className="text-xs">Loading history...</span>
                </div>
              ) : historyList.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No previous job matches found. Run an analysis above to generate a record.
                </div>
              ) : (
                historyList.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => {
                      setCurrentMatch(item);
                      setShowHistoryModal(false);
                    }}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-teal-500/50 hover:bg-slate-800/80 cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base font-bold text-white">{item.jobTitle || 'Target Position'}</span>
                        <span className="text-xs font-bold text-teal-400">&bull; {item.matchScore || item.overallMatchScore || 0}%</span>
                      </div>
                      <p className="text-[11px] text-slate-400">
                        {item.companyName || item.company || 'Company unspecified'} &bull; {new Date(item.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteHistoryItem(e, item.id)}
                      className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg hover:bg-rose-950/40"
                      title="Delete match record"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setShowHistoryModal(false)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default JobMatchPage;
