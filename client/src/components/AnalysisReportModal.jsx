import React, { useState } from 'react';

/**
 * Helper to get badge and progress bar colors based on 0-100 score
 */
function getScoreTier(score) {
  if (score >= 80) {
    return {
      label: 'Strong',
      textClass: 'text-emerald-400',
      bgClass: 'bg-emerald-500/10',
      borderClass: 'border-emerald-500/30',
      progressClass: 'bg-emerald-500',
    };
  }
  if (score >= 60) {
    return {
      label: 'Moderate',
      textClass: 'text-amber-400',
      bgClass: 'bg-amber-500/10',
      borderClass: 'border-amber-500/30',
      progressClass: 'bg-amber-500',
    };
  }
  return {
    label: 'Needs Improvement',
    textClass: 'text-rose-400',
    bgClass: 'bg-rose-500/10',
    borderClass: 'border-rose-500/30',
    progressClass: 'bg-rose-500',
  };
}

export default function AnalysisReportModal({ analysis, isOpen, onClose, resumeName }) {
  const [activeTab, setActiveTab] = useState('overview'); // overview, rewrites, skills

  if (!isOpen || !analysis) return null;

  const overallTier = getScoreTier(analysis.overallScore);

  const dimensions = [
    {
      key: 'impact',
      title: 'Impact & Metrics',
      data: analysis.dimensionScores?.impact || { score: analysis.categoryScores?.impactAndMetrics || 0, explanation: '' },
      weight: '25%',
    },
    {
      key: 'skillsCoverage',
      title: 'Skills & Competencies',
      data: analysis.dimensionScores?.skillsCoverage || { score: analysis.categoryScores?.skillsCoverage || 0, explanation: '' },
      weight: '25%',
    },
    {
      key: 'actionVerbs',
      title: 'Action Verbs & Style',
      data: analysis.dimensionScores?.actionVerbs || { score: analysis.categoryScores?.actionVerbsAndStyle || 0, explanation: '' },
      weight: '20%',
    },
    {
      key: 'atsReadability',
      title: 'ATS Readability',
      data: analysis.dimensionScores?.atsReadability || { score: analysis.categoryScores?.atsReadability || 0, explanation: '' },
      weight: '15%',
    },
    {
      key: 'brevity',
      title: 'Brevity & Structure',
      data: analysis.dimensionScores?.brevity || { score: analysis.categoryScores?.brevityAndFormatting || 0, explanation: '' },
      weight: '15%',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-report-title"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h2 id="audit-report-title" className="text-xl font-bold text-white">
                Resume Quality Audit Report
              </h2>
              <p className="text-xs text-slate-400 truncate max-w-md">
                {resumeName || 'Analyzed Resume'} &bull; Evaluated by {analysis.providerMetadata?.provider || 'Google Gemini'} ({analysis.providerMetadata?.model || 'gemini-2.5-flash'})
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
            aria-label="Close modal"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Advisory Disclaimer Banner */}
        <div className="px-6 py-2.5 bg-indigo-950/40 border-b border-indigo-900/50 flex items-start space-x-2.5 text-xs text-indigo-300">
          <svg className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0118 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <span>
            <strong>Advisory Notice:</strong> Scores and critiques evaluate structural density, semantic keywords, and accomplishment presentation. They represent optimization guidance and do not guarantee interview offers or hiring outcomes.
          </span>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Overview & Rubrics
          </button>
          <button
            onClick={() => setActiveTab('rewrites')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'rewrites'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Bullet Rewrites ({analysis.bulletRewrites?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`py-3 px-4 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'skills'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Extracted Skills
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-300">
          {activeTab === 'overview' && (
            <>
              {/* Overall Score & Summary Card */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-800/40 p-6 rounded-xl border border-slate-800">
                <div className="flex flex-col items-center justify-center text-center p-4 border-b md:border-b-0 md:border-r border-slate-800">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Overall Quality Score
                  </span>
                  <div className="mt-3 flex items-baseline space-x-1">
                    <span className={`text-6xl font-extrabold ${overallTier.textClass}`}>
                      {analysis.overallScore}
                    </span>
                    <span className="text-xl text-slate-500 font-medium">/ 100</span>
                  </div>
                  <span
                    className={`mt-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${overallTier.bgClass} ${overallTier.textClass} ${overallTier.borderClass}`}
                  >
                    {overallTier.label}
                  </span>
                </div>

                <div className="md:col-span-2 flex flex-col justify-center space-y-2">
                  <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400">
                    Executive Summary Feedback
                  </h3>
                  <p className="text-sm text-slate-300 leading-relaxed">
                    {analysis.summaryFeedback}
                  </p>
                </div>
              </div>

              {/* 5-Dimension Rubric Breakdown */}
              <div className="space-y-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                  Rubric Dimension Breakdown
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {dimensions.map((dim) => {
                    const tier = getScoreTier(dim.data?.score ?? 0);
                    return (
                      <div
                        key={dim.key}
                        className="bg-slate-800/30 p-4 rounded-xl border border-slate-800/80 hover:border-slate-700 transition-colors"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold text-slate-200">
                            {dim.title} <span className="text-xs text-slate-500">({dim.weight})</span>
                          </span>
                          <span className={`text-sm font-bold ${tier.textClass}`}>
                            {dim.data?.score ?? 0}/100
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-700/60 rounded-full overflow-hidden mb-2">
                          <div
                            className={`h-full ${tier.progressClass} transition-all duration-500`}
                            style={{ width: `${dim.data?.score ?? 0}%` }}
                          />
                        </div>

                        <p className="text-xs text-slate-400 leading-relaxed mb-2">
                          {dim.data?.explanation || 'Evaluation completed.'}
                        </p>

                        {dim.data?.evidence && dim.data.evidence.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-slate-800/60">
                            <span className="text-[10px] uppercase font-semibold text-slate-500 block mb-1">
                              Observed Evidence:
                            </span>
                            <div className="flex flex-wrap gap-1">
                              {dim.data.evidence.map((ev, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] bg-slate-900/80 text-slate-300 px-2 py-0.5 rounded border border-slate-700/50"
                                >
                                  {ev}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Strengths & Improvement Areas Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Strengths */}
                <div className="bg-emerald-950/10 border border-emerald-900/30 p-5 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <h4 className="font-bold text-sm uppercase tracking-wide">Key Strengths</h4>
                  </div>
                  <div className="space-y-2.5">
                    {analysis.strengths?.map((item, i) => (
                      <div key={i} className="text-xs">
                        {typeof item === 'string' ? (
                          <p className="text-slate-300">&bull; {item}</p>
                        ) : (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-emerald-900/20">
                            <span className="font-semibold text-emerald-300">{item.title}:</span>{' '}
                            <span className="text-slate-300">{item.description}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Improvement Areas */}
                <div className="bg-rose-950/10 border border-rose-900/30 p-5 rounded-xl space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <h4 className="font-bold text-sm uppercase tracking-wide">Improvement Areas</h4>
                  </div>
                  <div className="space-y-2.5">
                    {analysis.improvementAreas?.map((item, i) => (
                      <div key={i} className="text-xs">
                        {typeof item === 'string' ? (
                          <p className="text-slate-300">&bull; {item}</p>
                        ) : (
                          <div className="bg-slate-900/40 p-2.5 rounded-lg border border-rose-900/20">
                            <span className="font-semibold text-rose-300">{item.title}:</span>{' '}
                            <span className="text-slate-300">{item.description}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Actionable Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="bg-slate-800/30 border border-slate-800 p-5 rounded-xl space-y-2.5">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-slate-400">
                    Recommended Action Items
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-300">
                    {analysis.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start space-x-2">
                        <span className="text-indigo-400 font-bold">&rarr;</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          {activeTab === 'rewrites' && (
            <div className="space-y-4">
              <div className="text-xs text-slate-400">
                Line-by-line bullet rewrites structured using active verbs and the XYZ accomplishment formula.
              </div>
              {analysis.bulletRewrites && analysis.bulletRewrites.length > 0 ? (
                analysis.bulletRewrites.map((br, index) => (
                  <div
                    key={index}
                    className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3"
                  >
                    <div className="space-y-1">
                      <span className="text-[11px] uppercase font-bold text-rose-400 tracking-wider">
                        Original Bullet
                      </span>
                      <p className="text-xs text-slate-300 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 italic">
                        &ldquo;{br.originalBullet}&rdquo;
                      </p>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] uppercase font-bold text-emerald-400 tracking-wider">
                        Recommended Rewrite (XYZ Formula)
                      </span>
                      <p className="text-xs text-emerald-200 bg-emerald-950/30 p-2.5 rounded-lg border border-emerald-900/40 font-medium">
                        {br.suggestedBullet}
                      </p>
                    </div>

                    <div className="text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
                      <strong>Rationale:</strong> {br.rationale}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-sm">
                  No specific bullet rewrites required. Bullet structure meets good standards.
                </div>
              )}
            </div>
          )}

          {activeTab === 'skills' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Technical Skills */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-indigo-400 tracking-wider">
                    Technical Proficiencies
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.identifiedSkills?.technical?.length > 0 ? (
                      analysis.identifiedSkills.technical.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-indigo-500/10 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-md"
                        >
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None identified</span>
                    )}
                  </div>
                </div>

                {/* Soft Skills */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-teal-400 tracking-wider">
                    Domain & Soft Skills
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.identifiedSkills?.soft?.length > 0 ? (
                      analysis.identifiedSkills.soft.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-teal-500/10 text-teal-300 border border-teal-500/30 px-2 py-0.5 rounded-md"
                        >
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None identified</span>
                    )}
                  </div>
                </div>

                {/* Tools & Frameworks */}
                <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-bold uppercase text-purple-400 tracking-wider">
                    Tools & Platforms
                  </h4>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {analysis.identifiedSkills?.toolsAndFrameworks?.length > 0 ? (
                      analysis.identifiedSkills.toolsAndFrameworks.map((sk, idx) => (
                        <span
                          key={idx}
                          className="text-xs bg-purple-500/10 text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-md"
                        >
                          {sk}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-500">None identified</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-between items-center text-xs text-slate-500">
          <span>Audit ID: {analysis.id}</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
