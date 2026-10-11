import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  UploadCloud,
  FileText,
  Trash2,
  Eye,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Calendar,
  Layers,
  FileCode,
  X,
  Copy,
  Check,
  ArrowRight,
  LogIn,
  Sparkles,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { Badge } from '../components/common/Badge';
import { useAuth } from '../hooks/useAuth';
import { resumeService } from '../services/resumeService';
import { analysisService } from '../services/analysisService';
import AnalysisReportModal from '../components/AnalysisReportModal';

export const ResumesPage = () => {
  const { isAuthenticated } = useAuth();

  const [resumes, setResumes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Drag & drop state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Selected resume for viewing raw text
  const [viewingResume, setViewingResume] = useState(null);
  const [copied, setCopied] = useState(false);

  // Delete confirmation modal state
  const [deletingResume, setDeletingResume] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // AI Quality Audit states
  const [confirmAuditResume, setConfirmAuditResume] = useState(null);
  const [analyzingResumeId, setAnalyzingResumeId] = useState(null);
  const [currentAnalysis, setCurrentAnalysis] = useState(null);
  const [currentAnalysisResumeName, setCurrentAnalysisResumeName] = useState('');
  const [showAnalysisModal, setShowAnalysisModal] = useState(false);

  // Audit history state
  const [historyResume, setHistoryResume] = useState(null);
  const [resumeAnalyses, setResumeAnalyses] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchResumes = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');
      const data = await resumeService.listResumes();
      setResumes(data.resumes || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to load resumes.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleFileSelect = async (file) => {
    if (!file) return;

    setErrorMessage('');
    setSuccessMessage('');

    if (file.size > 5 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 5MB limit. Please upload a smaller file.');
      return;
    }

    const validExtensions = ['.pdf', '.docx', '.txt'];
    const fileName = file.name.toLowerCase();
    const isValidExt = validExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValidExt) {
      setErrorMessage('Unsupported file format. Please upload a .pdf, .docx, or .txt document.');
      return;
    }

    try {
      setUploading(true);
      const newResume = await resumeService.uploadResume(file);
      setSuccessMessage(`"${file.name}" uploaded and parsed successfully!`);
      setResumes((prev) => [newResume, ...prev]);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      setErrorMessage(err.message || 'Failed to upload and parse resume.');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleViewResume = async (resumeId) => {
    try {
      const detailed = await resumeService.getResume(resumeId);
      setViewingResume(detailed);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch resume details.');
    }
  };

  const handleDeleteResume = async () => {
    if (!deletingResume) return;

    try {
      setIsDeleting(true);
      await resumeService.deleteResume(deletingResume.id);
      setResumes((prev) => prev.filter((r) => r.id !== deletingResume.id));
      setSuccessMessage(`"${deletingResume.originalFileName}" deleted successfully.`);
      setDeletingResume(null);
      if (viewingResume?.id === deletingResume.id) {
        setViewingResume(null);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete resume.');
    } finally {
      setIsDeleting(false);
    }
  };

  // AI Quality Audit Trigger
  const handleTriggerAudit = async (resume) => {
    setConfirmAuditResume(null);
    setAnalyzingResumeId(resume.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const response = await analysisService.analyzeResume(resume.id);
      const analysisData = response.analysis;
      setCurrentAnalysis(analysisData);
      setCurrentAnalysisResumeName(resume.originalFileName);
      setShowAnalysisModal(true);
      setSuccessMessage(`Quality audit for "${resume.originalFileName}" completed!`);
    } catch (err) {
      setErrorMessage(err.message || 'AI resume audit failed. Please try again.');
    } finally {
      setAnalyzingResumeId(null);
    }
  };

  // View Audit History
  const handleViewHistory = async (resume) => {
    setHistoryResume(resume);
    setLoadingHistory(true);
    setErrorMessage('');

    try {
      const response = await analysisService.getResumeAnalyses(resume.id);
      setResumeAnalyses(response.analyses || []);
    } catch (err) {
      setErrorMessage(err.message || 'Failed to fetch audit history.');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleOpenReportFromHistory = (analysis) => {
    setCurrentAnalysis(analysis);
    setCurrentAnalysisResumeName(historyResume?.originalFileName || 'Resume');
    setHistoryResume(null);
    setShowAnalysisModal(true);
  };

  const copyToClipboard = () => {
    if (!viewingResume?.rawText) return;
    navigator.clipboard.writeText(viewingResume.rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-6">
        <div className="inline-flex p-4 rounded-2xl bg-slate-900 border border-slate-800 text-emerald-400">
          <FileText className="w-12 h-12" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Authentication Required</h1>
          <p className="text-sm text-slate-400">
            Please sign in or create an account to securely upload, parse, and analyze your resumes.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link to="/login">
            <Button variant="primary" size="md">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In to Continue
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

  return (
    <div className="space-y-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Resume Manager & Quality Audit
            </h1>
            <Badge variant="purple" size="sm">Phase 5 AI Active</Badge>
          </div>
          <p className="text-sm text-slate-400">
            Upload resumes, extract structured text, and run comprehensive Gemini AI quality audits.
          </p>
        </div>
        <div className="text-xs text-slate-400 font-medium">
          Uploaded: <span className="text-emerald-400 font-bold">{resumes.length}</span> documents
        </div>
      </div>

      {/* Notifications */}
      {errorMessage && (
        <div className="p-4 rounded-lg bg-rose-950/60 border border-rose-800/80 flex items-start justify-between gap-3 text-xs text-rose-200 animate-in fade-in duration-200">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-400 mt-0.5 shrink-0" />
            <span>{errorMessage}</span>
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

      {/* Upload Dropzone */}
      <Card
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`border-2 border-dashed transition-all duration-200 text-center p-8 sm:p-12 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-950/20 shadow-lg shadow-emerald-950/30'
            : 'border-slate-800 hover:border-slate-700 bg-slate-900/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={(e) => e.target.files && handleFileSelect(e.target.files[0])}
          className="hidden"
          id="resume-file-upload"
          disabled={uploading}
        />

        <div className="max-w-md mx-auto space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 flex items-center justify-center text-emerald-400 mx-auto">
            {uploading ? (
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            ) : (
              <UploadCloud className="w-8 h-8 text-emerald-400" />
            )}
          </div>

          <div className="space-y-1.5">
            <h3 className="text-base font-semibold text-white">
              {uploading ? 'Parsing and Ingesting Resume...' : 'Upload your resume document'}
            </h3>
            <p className="text-xs text-slate-400">
              Drag and drop your file here, or browse from your computer
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1 text-xs">
            <Badge variant="default" size="sm">PDF</Badge>
            <Badge variant="default" size="sm">DOCX</Badge>
            <Badge variant="default" size="sm">TXT</Badge>
            <span className="text-slate-500 text-[11px]">• Max 5 MB</span>
          </div>

          <div className="pt-2">
            <Button
              variant="primary"
              size="md"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Browse Files
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>

      {/* Resume Document List */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
          <FileText className="w-5 h-5 text-emerald-400" />
          Ingested Documents ({resumes.length})
        </h2>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-500 mx-auto mb-2" />
            <span className="text-xs">Loading resumes...</span>
          </div>
        ) : resumes.length === 0 ? (
          <Card className="text-center py-12 space-y-3 bg-slate-900/40">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-slate-500 flex items-center justify-center mx-auto">
              <FileCode className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No Resumes Uploaded Yet</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Upload your first resume in PDF, DOCX, or TXT format above to parse sections and run AI audits.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {resumes.map((item) => {
              const formatUpper = item.fileFormat?.toUpperCase() || 'TXT';
              const formatColor =
                item.fileFormat === 'pdf'
                  ? 'rose'
                  : item.fileFormat === 'docx'
                  ? 'info'
                  : 'default';

              const isAnalyzing = analyzingResumeId === item.id;

              return (
                <Card key={item.id} hoverEffect className="h-full flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="p-2.5 rounded-lg bg-slate-800 border border-slate-700/80 text-emerald-400 shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="text-sm font-semibold text-white truncate" title={item.originalFileName}>
                            {item.originalFileName}
                          </h4>
                          <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                            <span>{formatBytes(item.fileSize)}</span>
                            <span>•</span>
                            <span>{item.wordCount || 0} words</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant={formatColor} size="sm">{formatUpper}</Badge>
                    </div>

                    {/* Detected Sections Badges */}
                    {item.parsedSections && (
                      <div className="space-y-1.5 pt-1">
                        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                          Detected Sections:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {item.parsedSections.summary && <Badge variant="default" size="sm">Summary</Badge>}
                          {item.parsedSections.experience && <Badge variant="success" size="sm">Experience</Badge>}
                          {item.parsedSections.education && <Badge variant="info" size="sm">Education</Badge>}
                          {item.parsedSections.skills && <Badge variant="purple" size="sm">Skills</Badge>}
                          {item.parsedSections.projects && <Badge variant="warning" size="sm">Projects</Badge>}
                          {item.parsedSections.certifications && <Badge variant="default" size="sm">Certifications</Badge>}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Bar */}
                  <div className="pt-3 border-t border-slate-800/80 space-y-2.5">
                    {/* Primary AI Audit Action */}
                    <div className="flex items-center gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        className="flex-1 justify-center bg-indigo-600 hover:bg-indigo-500 text-white"
                        disabled={isAnalyzing}
                        onClick={() => setConfirmAuditResume(item)}
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                            Auditing with Gemini AI...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5 mr-1.5 text-indigo-200" />
                            Audit Resume with AI
                          </>
                        )}
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewHistory(item)}
                        title="View audit history for this resume"
                      >
                        <BarChart3 className="w-3.5 h-3.5 mr-1" />
                        Audits
                      </Button>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500 flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3.5 h-3.5" />
                        {formatDate(item.createdAt)}
                      </span>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewResume(item.id)}
                          aria-label={`View raw text of ${item.originalFileName}`}
                        >
                          <Eye className="w-3.5 h-3.5 mr-1" />
                          View Text
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-rose-400 hover:text-rose-300 hover:bg-rose-950/40"
                          onClick={() => setDeletingResume(item)}
                          aria-label={`Delete ${item.originalFileName}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Confirmation Modal before AI Audit */}
      {confirmAuditResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-indigo-950/60 border border-indigo-800 text-indigo-400 flex items-center justify-center mx-auto">
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Start AI Resume Quality Audit?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Google Gemini will analyze the text of <strong className="text-slate-200">"{confirmAuditResume.originalFileName}"</strong> across 5 dimensions: Impact & Metrics, Skills Coverage, Action Verbs, ATS Readability, and Brevity.
              </p>
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-400 text-left space-y-1">
                <span className="font-semibold text-slate-300 block">Evaluation Notice:</span>
                <p>Output provides optimization guidance and actionable bullet rewrites. Scores are advisory and do not guarantee hiring outcomes.</p>
              </div>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-center"
                onClick={() => setConfirmAuditResume(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="md"
                className="w-full justify-center bg-indigo-600 hover:bg-indigo-500"
                onClick={() => handleTriggerAudit(confirmAuditResume)}
              >
                <Sparkles className="w-4 h-4 mr-2 text-indigo-200" />
                Begin Audit
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Audit History Modal */}
      {historyResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full max-h-[80vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Audit History</h3>
                  <p className="text-xs text-slate-400 truncate max-w-xs">{historyResume.originalFileName}</p>
                </div>
              </div>
              <button
                onClick={() => setHistoryResume(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-3 flex-1">
              {loadingHistory ? (
                <div className="text-center py-8 text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <span className="text-xs">Loading audit history...</span>
                </div>
              ) : resumeAnalyses.length === 0 ? (
                <div className="text-center py-8 text-slate-500 text-xs">
                  No audits generated yet for this resume. Click "Audit Resume with AI" to generate the first evaluation report.
                </div>
              ) : (
                resumeAnalyses.map((an) => (
                  <div
                    key={an.id}
                    className="p-3.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-bold text-white">{an.overallScore}/100</span>
                        <span className="text-xs text-slate-400">• {an.providerMetadata?.model || 'Gemini'}</span>
                      </div>
                      <span className="text-[11px] text-slate-500">{formatDate(an.createdAt)}</span>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleOpenReportFromHistory(an)}
                    >
                      View Report &rarr;
                    </Button>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-slate-800 flex justify-end">
              <Button variant="secondary" size="sm" onClick={() => setHistoryResume(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Extracted Text Detail Modal */}
      {viewingResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-emerald-400">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white truncate max-w-md">
                    {viewingResume.originalFileName}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{viewingResume.wordCount} words</span>
                    <span>•</span>
                    <span>{viewingResume.characterCount} characters</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setViewingResume(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1 text-xs sm:text-sm font-mono leading-relaxed bg-slate-950 text-slate-200 select-text whitespace-pre-wrap rounded-b-none border-y border-slate-800">
              {viewingResume.rawText}
            </div>

            <div className="p-4 border-t border-slate-800 flex items-center justify-between bg-slate-900/90 rounded-b-2xl">
              <span className="text-xs text-slate-400">
                Extracted plain text
              </span>
              <div className="flex items-center gap-2">
                <Button variant="secondary" size="sm" onClick={copyToClipboard}>
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 mr-1 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 mr-1" />
                      Copy Raw Text
                    </>
                  )}
                </Button>
                <Button variant="primary" size="sm" onClick={() => setViewingResume(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingResume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="w-12 h-12 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-lg font-bold text-white">Delete Resume Document?</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Are you sure you want to permanently delete <strong className="text-slate-200">"{deletingResume.originalFileName}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                size="md"
                className="w-full justify-center"
                disabled={isDeleting}
                onClick={() => setDeletingResume(null)}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                size="md"
                className="w-full justify-center"
                disabled={isDeleting}
                onClick={handleDeleteResume}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Confirm Delete'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Detailed Analysis Report Modal */}
      <AnalysisReportModal
        isOpen={showAnalysisModal}
        analysis={currentAnalysis}
        resumeName={currentAnalysisResumeName}
        onClose={() => setShowAnalysisModal(false)}
      />
    </div>
  );
};

export default ResumesPage;
