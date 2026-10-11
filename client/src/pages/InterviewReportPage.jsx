import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Award,
  ArrowLeft,
  RotateCcw,
  Printer,
  CheckCircle2,
  AlertTriangle,
  BookOpen,
  ChevronDown,
  ChevronUp,
  Brain,
  ShieldAlert,
  Loader2,
  Briefcase,
  FileText,
  Sparkles,
  TrendingUp,
  Target,
  Layers,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { interviewService } from '../services/interviewService';

function getVerdictTheme(verdict) {
  switch (verdict) {
    case 'Strong Hire':
      return {
        badgeVariant: 'success',
        textClass: 'text-emerald-400',
        bgClass: 'bg-emerald-500/10',
        borderClass: 'border-emerald-500/30',
      };
    case 'Hire':
      return {
        badgeVariant: 'teal',
        textClass: 'text-teal-400',
        bgClass: 'bg-teal-500/10',
        borderClass: 'border-teal-500/30',
      };
    case 'Leaning Hire':
      return {
        badgeVariant: 'amber',
        textClass: 'text-amber-400',
        bgClass: 'bg-amber-500/10',
        borderClass: 'border-amber-500/30',
      };
    default:
      return {
        badgeVariant: 'danger',
        textClass: 'text-rose-400',
        bgClass: 'bg-rose-500/10',
        borderClass: 'border-rose-500/30',
      };
  }
}

export const InterviewReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedQuestions, setExpandedQuestions] = useState({});

  const loadReport = useCallback(async () => {
    try {
      setLoading(true);
      const data = await interviewService.getSession(id);

      // If not yet completed, complete it automatically if all questions are answered
      if (data.status !== 'completed' || !data.overallReport?.overallScore) {
        const completed = await interviewService.completeSession(id);
        setSession(completed);
      } else {
        setSession(data);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load interview report.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReport();
  }, [loadReport]);

  const toggleQuestion = (index) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Compiling Performance Report & Roadmap...</span>
      </div>
    );
  }

  if (!session || !session.overallReport) {
    return (
      <div className="min-h-screen bg-slate-950 py-16 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <AlertTriangle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Report Incomplete</h2>
          <p className="text-sm text-slate-400">
            {errorMessage || 'This interview session has not completed evaluation yet.'}
          </p>
          <div className="flex justify-center gap-3">
            <Link to={`/interviews/${id}`}>
              <Button variant="primary" size="md">
                Resume Interview Session
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const { overallReport } = session;
  const verdictTheme = getVerdictTheme(overallReport.verdict);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:text-black">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Navigation & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-3">
            <Link
              to="/interviews"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Interview Performance Report</h1>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{session.jobRole || session.jobTitle}</span>
                <span>•</span>
                <span>{session.experienceLevel} Level</span>
                <span>•</span>
                <span>{new Date(session.updatedAt || session.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <Printer className="w-4 h-4 mr-1.5" />
              <span>Print / Save PDF</span>
            </Button>
            <Link to="/interviews">
              <Button variant="primary" size="sm">
                <RotateCcw className="w-4 h-4 mr-1.5" />
                <span>Practice Another</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Practice Verdict Disclaimer Banner */}
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-3 text-xs text-slate-400">
          <ShieldAlert className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            {overallReport.disclaimer ||
              'This assessment is an AI-generated practice simulation for educational and preparation purposes only. Performance verdict indicators (Strong Hire, Hire, Leaning Hire, Needs Improvement) evaluate practice response quality and are not guarantees, predictions, or endorsements of actual hiring outcomes by any employer.'}
          </p>
        </div>

        {/* Hero Score & Verdict Card */}
        <Card className="p-6 sm:p-8 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30 border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Overall Practice Assessment
              </div>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-black text-white tracking-tight">
                  {overallReport.overallScore}
                  <span className="text-lg font-normal text-slate-500"> / 100</span>
                </div>
                <div className="space-y-1">
                  <div className={`inline-flex px-3 py-1 rounded-full text-sm font-bold border ${verdictTheme.bgClass} ${verdictTheme.borderClass} ${verdictTheme.textClass}`}>
                    {overallReport.verdict}
                  </div>
                  <div className="text-xs text-slate-400">
                    Deterministic Score across {session.questions?.length || 0} questions
                  </div>
                </div>
              </div>
            </div>

            {/* Rubrics Grid */}
            {overallReport.rubricAverages && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Technical</div>
                  <div className="text-base font-bold text-white">
                    {overallReport.rubricAverages.technicalAccuracy}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Completeness</div>
                  <div className="text-base font-bold text-white">
                    {overallReport.rubricAverages.completeness}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Clarity</div>
                  <div className="text-base font-bold text-white">
                    {overallReport.rubricAverages.clarity}%
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center">
                  <div className="text-[11px] text-slate-400">Problem Solving</div>
                  <div className="text-base font-bold text-white">
                    {overallReport.rubricAverages.problemSolving}%
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Executive Summary */}
          {overallReport.summary && (
            <div className="pt-4 border-t border-slate-800 text-sm text-slate-300 leading-relaxed space-y-2">
              <div className="font-semibold text-white flex items-center gap-2">
                <Brain className="w-4 h-4 text-emerald-400" />
                <span>Executive Summary</span>
              </div>
              <p className="text-slate-300 whitespace-pre-wrap">{overallReport.summary}</p>
            </div>
          )}
        </Card>

        {/* Strengths & Weaknesses 2-Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Key Strengths */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <CheckCircle2 className="w-4 h-4" />
              <span>Key Strengths Demonstrated</span>
            </div>
            {overallReport.strengthsSummary?.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                {overallReport.strengthsSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-emerald-400 font-bold shrink-0 mt-0.5">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">None recorded.</p>
            )}
          </Card>

          {/* Key Areas for Improvement */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
              <AlertTriangle className="w-4 h-4" />
              <span>Priority Areas for Growth</span>
            </div>
            {overallReport.weaknessesSummary?.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                {overallReport.weaknessesSummary.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-amber-400 font-bold shrink-0 mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">None recorded.</p>
            )}
          </Card>
        </div>

        {/* Study Recommendations & Learning Roadmap */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Study Topics */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-teal-400 text-xs font-bold uppercase tracking-wider">
              <BookOpen className="w-4 h-4" />
              <span>Recommended Study Topics</span>
            </div>
            {overallReport.studyRecommendations?.length > 0 ? (
              <ul className="space-y-2 text-xs sm:text-sm text-slate-300">
                {overallReport.studyRecommendations.map((topic, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="text-teal-400 font-bold shrink-0 mt-0.5">→</span>
                    <span>{topic}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-slate-500">No specific topics suggested.</p>
            )}
          </Card>

          {/* Personalized Preparation Roadmap */}
          <Card className="p-6 bg-slate-900/80 border-slate-800 space-y-3">
            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
              <TrendingUp className="w-4 h-4" />
              <span>Personalized Preparation Roadmap</span>
            </div>
            {overallReport.personalizedRoadmap?.length > 0 ? (
              <ol className="space-y-2.5 text-xs sm:text-sm text-slate-300">
                {overallReport.personalizedRoadmap.map((stage, idx) => (
                  <li key={idx} className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <span>{stage}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-slate-500">No roadmap stages available.</p>
            )}
          </Card>
        </div>

        {/* Question-by-Question Detailed Review Accordion */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-emerald-400" />
              <span>Question-by-Question Deep Dive</span>
            </h2>
            <span className="text-xs text-slate-500">
              {session.questions?.length || 0} questions reviewed
            </span>
          </div>

          <div className="space-y-3">
            {session.questions?.map((q, idx) => {
              const isOpen = expandedQuestions[idx] !== false; // open by default
              const evalScore = q.evaluation?.score;

              return (
                <Card key={q._id || idx} className="bg-slate-900/70 border-slate-800 overflow-hidden">
                  {/* Accordion Trigger */}
                  <div
                    onClick={() => toggleQuestion(idx)}
                    className="p-4 sm:p-5 flex items-center justify-between gap-4 cursor-pointer hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-7 h-7 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0">
                        {idx + 1}
                      </span>
                      <div className="space-y-0.5 min-w-0">
                        <div className="text-sm font-semibold text-slate-200 truncate">
                          {q.questionText}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <span>{q.category}</span>
                          <span>•</span>
                          <span>{q.difficulty}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {evalScore !== undefined && (
                        <span className="text-sm font-bold text-emerald-400">
                          {evalScore}/100
                        </span>
                      )}
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-slate-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-slate-500" />
                      )}
                    </div>
                  </div>

                  {/* Accordion Content */}
                  {isOpen && (
                    <div className="px-5 pb-5 pt-2 border-t border-slate-800/80 space-y-4 text-xs sm:text-sm">
                      {/* Candidate Answer */}
                      <div className="space-y-1">
                        <span className="font-semibold text-slate-400 text-xs">Submitted Answer:</span>
                        <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 whitespace-pre-wrap leading-relaxed">
                          {q.userAnswer || <em className="text-slate-500">No answer submitted</em>}
                        </div>
                      </div>

                      {/* Immediate Feedback Bullet Lists */}
                      {q.evaluation && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          {/* Strengths */}
                          <div className="p-3 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-1.5">
                            <span className="font-bold text-emerald-400 text-xs">Strengths:</span>
                            <ul className="space-y-1 text-slate-300">
                              {q.evaluation.strengths?.map((s, i) => (
                                <li key={i}>✓ {s}</li>
                              ))}
                            </ul>
                          </div>

                          {/* Missing / Tips */}
                          <div className="p-3 rounded-xl bg-slate-950 border border-amber-500/20 space-y-1.5">
                            <span className="font-bold text-amber-400 text-xs">Improvements & Missing:</span>
                            <ul className="space-y-1 text-slate-300">
                              {q.evaluation.missingPoints?.map((m, i) => (
                                <li key={`m-${i}`}>• {m}</li>
                              ))}
                              {q.evaluation.improvements?.map((im, i) => (
                                <li key={`im-${i}`}>→ {im}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      )}

                      {/* Exemplary Model Answer */}
                      {q.evaluation?.modelAnswer && (
                        <div className="space-y-1 pt-1">
                          <span className="font-semibold text-emerald-400 text-xs flex items-center gap-1.5">
                            <BookOpen className="w-3.5 h-3.5" />
                            <span>Exemplary Model Answer:</span>
                          </span>
                          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 text-slate-300 whitespace-pre-wrap leading-relaxed text-xs">
                            {q.evaluation.modelAnswer}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t border-slate-800 print:hidden">
          <Link to="/dashboard">
            <Button variant="secondary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span>Back to Dashboard</span>
            </Button>
          </Link>

          <Link to="/interviews">
            <Button variant="primary" size="md">
              <RotateCcw className="w-4 h-4 mr-2" />
              <span>Start New Mock Interview</span>
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default InterviewReportPage;
