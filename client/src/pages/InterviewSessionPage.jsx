import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  MessageSquareCode,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Loader2,
  Send,
  RotateCcw,
  BookOpen,
  Award,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Check,
  Briefcase,
  FileText,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { interviewService } from '../services/interviewService';

function getScoreTier(score) {
  if (score >= 80) {
    return {
      label: 'Exemplary',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/30',
    };
  }
  if (score >= 65) {
    return {
      label: 'Proficient',
      textClass: 'text-teal-400',
      bgClass: 'bg-teal-500/10',
      borderClass: 'border-teal-500/30',
    };
  }
  if (score >= 50) {
    return {
      label: 'Developing',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30',
    };
  }
  return {
    label: 'Needs Work',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
  };
}

export const InterviewSessionPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  // Session state
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Current answer editor state
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [evaluating, setEvaluating] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [showKeyPoints, setShowKeyPoints] = useState(false);
  const [showModelAnswer, setShowModelAnswer] = useState(false);

  // Load session from backend
  const loadSession = useCallback(async () => {
    try {
      setLoading(true);
      const data = await interviewService.getSession(id);
      setSession(data);

      // If session is already completed, offer redirect to report
      if (data.status === 'completed' && data.overallReport?.overallScore !== undefined) {
        navigate(`/interviews/${id}/report`, { replace: true });
        return;
      }

      // Restore first unanswered question or question 0
      const firstUnanswered = data.questions?.findIndex(
        (q) => !q.evaluation || typeof q.evaluation.score !== 'number'
      );
      const activeIdx = firstUnanswered !== -1 ? firstUnanswered : 0;
      setCurrentIndex(activeIdx);

      if (data.questions && data.questions[activeIdx]) {
        setCurrentAnswer(data.questions[activeIdx].userAnswer || '');
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load interview session.');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  // Current question helper
  const currentQuestion = useMemo(() => {
    if (!session || !session.questions) return null;
    return session.questions[currentIndex] || null;
  }, [session, currentIndex]);

  // Sync editor when switching questions
  useEffect(() => {
    if (currentQuestion) {
      setCurrentAnswer(currentQuestion.userAnswer || '');
      setShowModelAnswer(false);
      setShowKeyPoints(false);
      setErrorMessage('');
    }
  }, [currentIndex, currentQuestion]);

  // Protection against accidental tab closure
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (currentAnswer && (!currentQuestion?.evaluation || currentAnswer !== currentQuestion.userAnswer)) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [currentAnswer, currentQuestion]);

  // Submit & Evaluate candidate's answer
  const handleEvaluate = async (e) => {
    e.preventDefault();
    if (evaluating) return;

    if (!currentAnswer.trim() || currentAnswer.trim().length < 5) {
      setErrorMessage('Please type at least 5 characters for your answer before submitting.');
      return;
    }

    setErrorMessage('');
    setEvaluating(true);

    try {
      const result = await interviewService.evaluateAnswer(id, {
        questionId: currentQuestion._id || currentQuestion.id,
        userAnswer: currentAnswer.trim(),
      });

      // Update session state locally
      setSession((prev) => {
        if (!prev) return prev;
        const updatedQuestions = [...prev.questions];
        updatedQuestions[currentIndex] = {
          ...updatedQuestions[currentIndex],
          userAnswer: currentAnswer.trim(),
          evaluation: result.evaluation,
        };
        return {
          ...prev,
          questions: updatedQuestions,
        };
      });
    } catch (err) {
      setErrorMessage(err.message || 'Evaluation request failed. Please try again.');
    } finally {
      setEvaluating(false);
    }
  };

  // Complete Interview & Compile Final Report
  const handleCompleteInterview = async () => {
    if (completing) return;

    // Check completion status across all questions
    const incomplete = (session?.questions || []).filter(
      (q) => !q.userAnswer || !q.evaluation || typeof q.evaluation.score !== 'number'
    );

    if (incomplete.length > 0) {
      setErrorMessage(
        `You have ${incomplete.length} unanswered or unevaluated question(s). Please answer all questions before generating your final performance report.`
      );
      return;
    }

    try {
      setCompleting(true);
      setErrorMessage('');
      const completed = await interviewService.completeSession(id);
      if (completed) {
        navigate(`/interviews/${id}/report`);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to complete interview session.');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <span className="text-sm font-medium">Restoring Interview Session...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-950 py-16 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold text-white">Interview Session Not Found</h2>
          <p className="text-sm text-slate-400">
            {errorMessage || 'The requested interview session could not be retrieved.'}
          </p>
          <Link to="/interviews">
            <Button variant="primary" size="md">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Interview Setup
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const totalQuestions = session.questions?.length || 0;
  const evaluatedCount = session.questions?.filter(
    (q) => q.evaluation && typeof q.evaluation.score === 'number'
  ).length || 0;
  const progressPct = totalQuestions > 0 ? Math.round((evaluatedCount / totalQuestions) * 100) : 0;
  const currentEvaluation = currentQuestion?.evaluation;
  const tier = currentEvaluation ? getScoreTier(currentEvaluation.score) : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Navigation & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <Link
              to="/interviews"
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              title="Back to Interview Hub"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-white">{session.jobRole || session.jobTitle}</h1>
                <Badge variant="teal" size="sm">{session.experienceLevel}</Badge>
              </div>
              <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                <span>{session.category}</span>
                <span>•</span>
                <span>{session.difficulty} Difficulty</span>
              </div>
            </div>
          </div>

          {/* Progress overview */}
          <div className="flex items-center gap-4 sm:justify-end">
            <div className="text-right">
              <div className="text-xs text-slate-400 font-medium">Session Progress</div>
              <div className="text-xs font-semibold text-emerald-400">
                {evaluatedCount} of {totalQuestions} evaluated ({progressPct}%)
              </div>
            </div>
            <div className="w-24 sm:w-32 bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        </div>

        {/* Question Selector Stepper Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {session.questions.map((q, idx) => {
            const isEvaluated = q.evaluation && typeof q.evaluation.score === 'number';
            const isCurrent = idx === currentIndex;
            return (
              <button
                key={q._id || idx}
                onClick={() => setCurrentIndex(idx)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                  isCurrent
                    ? 'bg-emerald-500/20 border-emerald-500/60 text-emerald-300 shadow-sm'
                    : isEvaluated
                    ? 'bg-slate-900 border-emerald-500/30 text-slate-300 hover:border-emerald-500/50'
                    : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
                }`}
              >
                <span>Q{idx + 1}</span>
                {isEvaluated ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <span className="w-2 h-2 rounded-full bg-slate-700" />
                )}
              </button>
            );
          })}
        </div>

        {/* Error notification banner */}
        {errorMessage && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400 mt-0.5" />
            <div className="flex-1">{errorMessage}</div>
          </div>
        )}

        {/* Main Question Card */}
        {currentQuestion && (
          <Card className="p-6 sm:p-8 bg-slate-900/80 border-slate-800 space-y-6">
            {/* Header: Question Meta */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-md bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                  Question {currentIndex + 1} of {totalQuestions}
                </span>
                <Badge variant="blue" size="sm">{currentQuestion.category || session.category}</Badge>
                <Badge variant="secondary" size="sm">{currentQuestion.difficulty || session.difficulty}</Badge>
              </div>

              {currentQuestion.sampleKeyPoints?.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowKeyPoints(!showKeyPoints)}
                  className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  <span>{showKeyPoints ? 'Hide Assessment Focus' : 'Show Assessment Focus'}</span>
                  {showKeyPoints ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                </button>
              )}
            </div>

            {/* Assessment Focus Hint Accordion */}
            {showKeyPoints && currentQuestion.sampleKeyPoints?.length > 0 && (
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300 space-y-2 animate-in fade-in">
                <div className="font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Lightbulb className="w-4 h-4" />
                  <span>Key Concepts & Benchmarks Evaluated:</span>
                </div>
                <ul className="list-disc list-inside space-y-1 text-slate-400 pl-1">
                  {currentQuestion.sampleKeyPoints.map((point, i) => (
                    <li key={i}>{point}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Question Text */}
            <div className="space-y-2">
              <h2 className="text-lg sm:text-xl font-bold text-white leading-relaxed">
                "{currentQuestion.questionText}"
              </h2>
            </div>

            {/* Answer Editor Area */}
            <div className="space-y-3 pt-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span className="font-semibold text-slate-300">Your Response:</span>
                <div className="flex items-center gap-3">
                  <span>{currentAnswer.trim() ? currentAnswer.trim().split(/\s+/).length : 0} words</span>
                  <span>{currentAnswer.length} chars</span>
                </div>
              </div>

              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your response thoroughly. Outline your technical reasoning, architectural decisions, or STAR scenario (Situation, Task, Action, Result)..."
                rows={7}
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm leading-relaxed"
              />

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
                <div className="text-xs text-slate-500">
                  {currentEvaluation ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" /> Evaluated and saved in MongoDB
                    </span>
                  ) : (
                    <span>Click evaluate to generate AI feedback for this answer.</span>
                  )}
                </div>

                <div className="flex items-center gap-2.5">
                  <Button
                    type="button"
                    variant="primary"
                    size="md"
                    onClick={handleEvaluate}
                    disabled={evaluating || currentAnswer.trim().length < 5}
                    className="min-w-[140px] justify-center"
                  >
                    {evaluating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                        <span>Evaluating...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4 mr-2" />
                        <span>{currentEvaluation ? 'Re-Evaluate Answer' : 'Submit & Evaluate'}</span>
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Immediate Evaluation Feedback Panel */}
            {currentEvaluation && (
              <div className="mt-6 pt-6 border-t border-slate-800 space-y-6 animate-in fade-in duration-300">
                {/* Score & Tier Header */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs text-slate-400 font-medium">Question Score</div>
                    <div className="flex items-center gap-3">
                      <span className="text-3xl font-extrabold text-white">
                        {currentEvaluation.score}
                        <span className="text-sm font-normal text-slate-500"> / 100</span>
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${tier?.bgClass} ${tier?.borderClass} ${tier?.textClass}`}>
                        {tier?.label}
                      </span>
                    </div>
                  </div>

                  {/* Rubric Breakdown Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <div className="text-slate-400 text-[10px]">Technical</div>
                      <div className="font-bold text-slate-200">
                        {currentEvaluation.rubricScores?.technicalAccuracy ?? '-'}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <div className="text-slate-400 text-[10px]">Completeness</div>
                      <div className="font-bold text-slate-200">
                        {currentEvaluation.rubricScores?.completeness ?? '-'}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <div className="text-slate-400 text-[10px]">Clarity</div>
                      <div className="font-bold text-slate-200">
                        {currentEvaluation.rubricScores?.clarity ?? '-'}%
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800/80 text-center">
                      <div className="text-slate-400 text-[10px]">Problem Solving</div>
                      <div className="font-bold text-slate-200">
                        {currentEvaluation.rubricScores?.problemSolving ?? '-'}%
                      </div>
                    </div>
                  </div>
                </div>

                {/* Behavioral STAR Breakdown (if applicable) */}
                {currentEvaluation.starAssessment?.isStarApplicable && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <Award className="w-4 h-4" />
                      <span>STAR Behavioral Framework Analysis</span>
                    </div>
                    <p className="text-xs text-slate-300">
                      {currentEvaluation.starAssessment.starFeedback}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="font-semibold text-emerald-400">Situation: </span>
                        <span className="text-slate-300">{currentEvaluation.starAssessment.situation || 'Not clearly established'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="font-semibold text-emerald-400">Task: </span>
                        <span className="text-slate-300">{currentEvaluation.starAssessment.task || 'Not clearly defined'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="font-semibold text-emerald-400">Action: </span>
                        <span className="text-slate-300">{currentEvaluation.starAssessment.action || 'Specific action details missing'}</span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                        <span className="font-semibold text-emerald-400">Result: </span>
                        <span className="text-slate-300">{currentEvaluation.starAssessment.result || 'Measurable outcome missing'}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Strengths & Missing Points Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Strengths */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-wider">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>What You Did Well</span>
                    </div>
                    {currentEvaluation.strengths?.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {currentEvaluation.strengths.map((str, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 font-bold shrink-0">✓</span>
                            <span>{str}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">No notable strengths identified.</p>
                    )}
                  </div>

                  {/* Missing Points & Improvements */}
                  <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/20 space-y-2">
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Missing Elements & Opportunities</span>
                    </div>
                    {currentEvaluation.missingPoints?.length > 0 || currentEvaluation.improvements?.length > 0 ? (
                      <ul className="space-y-1.5 text-xs text-slate-300">
                        {currentEvaluation.missingPoints?.map((mis, i) => (
                          <li key={`m-${i}`} className="flex items-start gap-2">
                            <span className="text-amber-400 font-bold shrink-0">•</span>
                            <span>{mis}</span>
                          </li>
                        ))}
                        {currentEvaluation.improvements?.map((imp, i) => (
                          <li key={`i-${i}`} className="flex items-start gap-2">
                            <span className="text-teal-400 font-bold shrink-0">→</span>
                            <span>{imp}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-slate-500">Comprehensive answer with no critical omissions.</p>
                    )}
                  </div>
                </div>

                {/* Model Answer Accordion */}
                {currentEvaluation.modelAnswer && (
                  <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
                    <button
                      type="button"
                      onClick={() => setShowModelAnswer(!showModelAnswer)}
                      className="w-full flex items-center justify-between text-left text-xs font-semibold text-slate-300 hover:text-emerald-400 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-emerald-400" />
                        <span>View Exemplary Model Answer</span>
                      </div>
                      {showModelAnswer ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>

                    {showModelAnswer && (
                      <div className="pt-2 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed animate-in fade-in border-t border-slate-800 mt-2">
                        {currentEvaluation.modelAnswer}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        )}

        {/* Stepper Footer Controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            disabled={currentIndex === 0}
            className="justify-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Previous Question</span>
          </Button>

          <div className="flex items-center gap-3 justify-end">
            {currentIndex < totalQuestions - 1 ? (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
                className="justify-center"
              >
                <span>Next Question</span>
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleCompleteInterview}
                disabled={completing}
                className="justify-center bg-emerald-600 hover:bg-emerald-500"
              >
                {completing ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />
                    <span>Compiling Report...</span>
                  </>
                ) : (
                  <>
                    <Award className="w-4 h-4 mr-2" />
                    <span>Finish Interview & View Report</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InterviewSessionPage;
