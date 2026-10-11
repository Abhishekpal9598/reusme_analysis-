import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  Sliders,
  AlertCircle,
  Loader2,
  Brain,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  ArrowRight,
  LogIn,
  UserPlus,
} from 'lucide-react';
import { Card } from '../components/common/Card';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { useAuth } from '../hooks/useAuth';
import { careerIntelligenceService } from '../services/careerIntelligenceService';
import { ReadinessGauge } from '../components/career-intelligence/ReadinessGauge';
import { WeeklyMomentumReport } from '../components/career-intelligence/WeeklyMomentumReport';
import { SkillGapMatrix } from '../components/career-intelligence/SkillGapMatrix';
import { RoleRecommendationsCard } from '../components/career-intelligence/RoleRecommendationsCard';
import { LearningRoadmapTimeline } from '../components/career-intelligence/LearningRoadmapTimeline';
import { NextActionsList } from '../components/career-intelligence/NextActionsList';
import { PreferencesModal } from '../components/career-intelligence/PreferencesModal';
import { SparseDataPrompt } from '../components/career-intelligence/SparseDataPrompt';

export const CareerIntelligencePage = () => {
  const { isAuthenticated, user } = useAuth();

  // Primary Data States
  const [profile, setProfile] = useState(null);
  const [isColdStart, setIsColdStart] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  // Action States
  const [isGenerating, setIsGenerating] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isSavingPreferences, setIsSavingPreferences] = useState(false);
  const [togglingMilestoneId, setTogglingMilestoneId] = useState(null);

  // Cooldown countdown timer effect
  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  // Load career profile
  const fetchProfile = useCallback(async () => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setErrorMessage('');
    try {
      const res = await careerIntelligenceService.getCareerIntelligence();
      setProfile(res);
      setIsColdStart(Boolean(res.isColdStart));
    } catch (err) {
      console.warn('Failed to fetch career profile:', err);
      setErrorMessage(err.message || 'Unable to load Career Intelligence profile.');
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Trigger AI Profile Generation / Regeneration
  const handleGenerate = async (forceRegenerate = false) => {
    if (cooldownSeconds > 0) return;
    setIsGenerating(true);
    setErrorMessage('');
    try {
      let res;
      if (forceRegenerate || !isColdStart) {
        res = await careerIntelligenceService.regenerateCareerIntelligence();
      } else {
        res = await careerIntelligenceService.generateCareerIntelligence();
      }
      setProfile(res);
      setIsColdStart(false);
    } catch (err) {
      console.warn('Generation failed:', err);
      if (err.code === 'COOLDOWN_ACTIVE') {
        const remaining = err.details?.remainingSeconds || 30;
        setCooldownSeconds(remaining);
        setErrorMessage(`Please wait ${remaining}s before regenerating.`);
      } else {
        setErrorMessage(err.message || 'Failed to generate career intelligence.');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // Toggle milestone completion
  const handleToggleMilestone = async (milestoneId, newCompleted) => {
    if (!profile) return;
    setTogglingMilestoneId(milestoneId);
    try {
      const updatedMilestone = await careerIntelligenceService.toggleRoadmapMilestone(milestoneId, newCompleted);
      setProfile((prev) => {
        if (!prev) return prev;
        const currentMilestones = prev.learningRoadmap || [];
        return {
          ...prev,
          learningRoadmap: currentMilestones.map((m) =>
            (m._id === milestoneId || m.id === milestoneId)
              ? { ...m, ...updatedMilestone }
              : m
          ),
        };
      });
    } catch (err) {
      console.warn('Failed to toggle milestone:', err);
      setErrorMessage(err.message || 'Failed to update milestone status.');
    } finally {
      setTogglingMilestoneId(null);
    }
  };

  // Save Preferences
  const handleSavePreferences = async (newPrefs) => {
    setIsSavingPreferences(true);
    try {
      const updatedPreferences = await careerIntelligenceService.updateCareerPreferences(newPrefs);
      setProfile((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          targetPreferences: {
            ...prev.targetPreferences,
            ...updatedPreferences,
          },
        };
      });
    } finally {
      setIsSavingPreferences(false);
    }
  };

  // Guest view
  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 space-y-8 text-center">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
          <Sparkles className="w-8 h-8" />
        </div>
        <div className="space-y-3">
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AI Career Intelligence & Recommendations
          </h1>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Get personalized career readiness scores, automated skill gap analyses, and dynamic learning roadmaps strictly grounded in your verified career data.
          </p>
        </div>
        <div className="flex items-center justify-center gap-4">
          <Link to="/login">
            <Button variant="outline" size="md">
              <LogIn className="w-4 h-4 mr-2" />
              Sign In
            </Button>
          </Link>
          <Link to="/register">
            <Button variant="primary" size="md">
              <UserPlus className="w-4 h-4 mr-2" />
              Get Started Free
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Initial loading state
  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
        <p className="text-sm text-slate-400">Synthesizing Career Intelligence profile...</p>
      </div>
    );
  }

  const generationSource = profile?.generationSource || 'heuristic_fallback';
  const isAIGenerated = generationSource === 'gemini_ai';
  const lastGenerated = profile?.lastGeneratedAt
    ? new Date(profile.lastGeneratedAt).toLocaleString()
    : null;

  return (
    <div className="space-y-8 pb-16">
      {/* Top Header Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6 border-b border-slate-800">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-emerald-400" />
              Career Intelligence & Recommendations
            </h1>
            <Badge variant="teal" size="sm">Phase 9 Active</Badge>
            <Badge variant={isAIGenerated ? 'purple' : 'default'} size="sm">
              <Brain className="w-3 h-3 mr-1" />
              {isAIGenerated ? 'Gemini AI Synthesis' : 'Deterministic Heuristic'}
            </Badge>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            Unified career readiness scoring, grounded skill gap diagnosis, and milestone learning roadmaps.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-auto">
          {lastGenerated && (
            <span className="hidden sm:inline text-[11px] text-slate-500 font-mono">
              Updated: {lastGenerated}
            </span>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setIsPreferencesOpen(true)}
          >
            <Sliders className="w-3.5 h-3.5 mr-1.5 text-slate-400" />
            Preferences
          </Button>

          <Button
            variant="primary"
            size="sm"
            disabled={isGenerating || cooldownSeconds > 0}
            onClick={() => handleGenerate(true)}
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Synthesizing...
              </>
            ) : cooldownSeconds > 0 ? (
              <>
                <Clock className="w-3.5 h-3.5 mr-1.5 text-amber-300" />
                Wait {cooldownSeconds}s
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                {isColdStart ? 'Generate Profile' : 'Regenerate Analysis'}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage('')}
            className="text-slate-400 hover:text-slate-200 text-xs ml-4"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sparse Data Prompt if cold-start or pending dimensions */}
      {(isColdStart || !profile?.careerReadiness?.overallScore) && (
        <SparseDataPrompt
          dataPointsUsed={profile?.careerReadiness?.dataPointsUsed}
          availableDimensions={profile?.careerReadiness?.availableDimensions || []}
          isColdStart={isColdStart}
        />
      )}

      {/* Section 1: Readiness Index (CRI) & Weekly Momentum */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-5">
          <ReadinessGauge careerReadiness={profile?.careerReadiness} />
        </div>
        <div className="lg:col-span-7">
          <WeeklyMomentumReport weeklyMomentum={profile?.weeklyMomentum} />
        </div>
      </div>

      {/* Section 2: AI Role Recommendations */}
      <div>
        <RoleRecommendationsCard
          roleRecommendations={profile?.roleRecommendations}
        />
      </div>

      {/* Section 3: Skill Gap Matrix */}
      <div>
        <SkillGapMatrix skillAnalysis={profile?.skillAnalysis} />
      </div>

      {/* Section 4: Learning Roadmap & Immediate Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7">
          <LearningRoadmapTimeline
            milestones={profile?.learningRoadmap || []}
            onToggleMilestone={handleToggleMilestone}
            togglingId={togglingMilestoneId}
          />
        </div>
        <div className="lg:col-span-5">
          <NextActionsList nextActions={profile?.nextActions || []} />
        </div>
      </div>

      {/* Preferences Modal Dialog */}
      <PreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        initialPreferences={profile?.targetPreferences || {}}
        onSave={handleSavePreferences}
        isSaving={isSavingPreferences}
      />
    </div>
  );
};

export default CareerIntelligencePage;
