import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { ResumeAnalysis } from '../models/ResumeAnalysis.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { InterviewSession } from '../models/InterviewSession.js';
import { Application } from '../models/Application.js';
import { CareerProfile } from '../models/CareerProfile.js';
import { calculateCareerReadinessIndex } from '../validators/careerIntelligenceValidators.js';

/**
 * 1. Collect Authenticated User Career Data from Existing Collections
 *
 * Requirements:
 * - Scoped strictly to authenticated user's userId.
 * - Parallel execution using Promise.all.
 * - Avoid loading raw text or binary payloads.
 * - Handle empty collections safely without inventing records.
 */
export async function collectUserCareerContext(userId) {
  if (!userId) {
    throw new Error('User ID is required to collect career context.');
  }

  const userObjectId =
    typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const [
    resumes,
    latestAnalyses,
    jobAnalyses,
    interviewSessions,
    applications,
    existingProfile,
  ] = await Promise.all([
    Resume.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('originalFileName fileFormat fileSize createdAt')
      .lean(),

    ResumeAnalysis.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(1)
      .select(
        'overallScore dimensionScores identifiedSkills strengths improvementAreas weaknesses createdAt'
      )
      .lean(),

    JobAnalysis.find({ userId: userObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select('jobTitle companyName matchScore overallMatchScore skillsAnalysis createdAt')
      .lean(),

    InterviewSession.find({ userId: userObjectId, status: 'completed' })
      .sort({ createdAt: -1 })
      .limit(10)
      .select(
        'roleTitle jobRole jobTitle experienceLevel interviewDifficulty overallScore overallReport finalReport questions createdAt'
      )
      .lean(),

    Application.find({ userId: userObjectId })
      .sort({ updatedAt: -1 })
      .limit(50)
      .select('companyName positionTitle status interviews reminders updatedAt createdAt')
      .lean(),

    CareerProfile.findOne({ userId: userObjectId })
      .select('targetPreferences learningRoadmap')
      .lean(),
  ]);

  // Normalize Resume Context
  const latestAnalysis = latestAnalyses[0] || null;
  const verifiedSkillsSet = new Set();

  if (latestAnalysis?.identifiedSkills) {
    const { technical = [], toolsAndFrameworks = [] } = latestAnalysis.identifiedSkills;
    technical.forEach((s) => s && verifiedSkillsSet.add(s.trim()));
    toolsAndFrameworks.forEach((s) => s && verifiedSkillsSet.add(s.trim()));
  }

  const resumeContext = {
    totalResumes: resumes.length,
    latestAnalysis: latestAnalysis
      ? {
          overallScore: latestAnalysis.overallScore,
          dimensionScores: latestAnalysis.dimensionScores || {},
          strengths: (latestAnalysis.strengths || []).map((s) =>
            typeof s === 'string' ? s : s.title || ''
          ).filter(Boolean),
          weaknesses: latestAnalysis.weaknesses || [],
          createdAt: latestAnalysis.createdAt,
        }
      : null,
    verifiedSkills: Array.from(verifiedSkillsSet),
  };

  // Normalize Job Match Context
  let sumJobMatchScore = 0;
  let jobMatchScoreCount = 0;

  const recentJobs = jobAnalyses.map((job) => {
    const effectiveScore =
      typeof job.overallMatchScore === 'number'
        ? job.overallMatchScore
        : typeof job.matchScore === 'number'
        ? job.matchScore
        : null;

    if (effectiveScore !== null) {
      sumJobMatchScore += effectiveScore;
      jobMatchScoreCount += 1;
    }

    return {
      id: job._id.toString(),
      jobTitle: job.jobTitle || 'Target Role',
      companyName: job.companyName || '',
      matchScore: effectiveScore,
      skillsAnalysis: job.skillsAnalysis || {},
      createdAt: job.createdAt,
    };
  });

  const jobMatchContext = {
    totalAnalyzedJobs: jobAnalyses.length,
    recentJobs,
    averageMatchScore:
      jobMatchScoreCount > 0
        ? Math.round(sumJobMatchScore / jobMatchScoreCount)
        : null,
  };

  // Normalize Interview Context
  let sumInterviewScore = 0;
  let interviewScoreCount = 0;

  const recentSessions = interviewSessions.map((session) => {
    const score =
      typeof session.overallScore === 'number'
        ? session.overallScore
        : (session.overallReport?.overallScore ?? session.finalReport?.overallScore ?? null);

    if (score !== null) {
      sumInterviewScore += score;
      interviewScoreCount += 1;
    }

    const weakRubrics = [];
    if (Array.isArray(session.questions)) {
      session.questions.forEach((q) => {
        const rubric = q.evaluation?.rubricScores;
        if (rubric) {
          Object.entries(rubric).forEach(([dim, val]) => {
            if (typeof val === 'number' && val < 60) {
              weakRubrics.push(`${q.category || 'General'}: ${dim} (${val}%)`);
            }
          });
        }
      });
    }

    return {
      id: session._id.toString(),
      roleTitle: session.jobRole || session.jobTitle || session.roleTitle || 'Mock Role',
      overallScore: score,
      experienceLevel: session.experienceLevel || 'Mid',
      weakRubrics: Array.from(new Set(weakRubrics)),
      improvements: session.overallReport?.studyRecommendations || session.finalReport?.priorityImprovements || [],
      createdAt: session.createdAt,
    };
  });

  const interviewContext = {
    totalCompletedSessions: interviewSessions.length,
    recentSessions,
    averageInterviewScore:
      interviewScoreCount > 0
        ? Math.round(sumInterviewScore / interviewScoreCount)
        : null,
  };

  // Normalize Application Context & Health Score
  let activePipelineCount = 0;
  let interviewsScheduledCount = 0;

  applications.forEach((app) => {
    if (['Applied', 'Assessment', 'Interview', 'Offer'].includes(app.status)) {
      activePipelineCount += 1;
    }
    if (Array.isArray(app.interviews)) {
      app.interviews.forEach((inv) => {
        if (!inv.completed) {
          interviewsScheduledCount += 1;
        }
      });
    }
  });

  let pipelineHealthScore = null;
  if (applications.length > 0) {
    // Health score: 40 base + (active applications * 10) + (scheduled interviews * 15)
    // Clamped between 20 and 100
    const rawHealth =
      40 + activePipelineCount * 10 + interviewsScheduledCount * 15;
    pipelineHealthScore = Math.min(100, Math.max(20, Math.round(rawHealth)));
  }

  const applicationContext = {
    totalApplications: applications.length,
    activePipelineCount,
    interviewsScheduledCount,
    pipelineHealthScore,
  };

  // Target Preferences
  const targetPreferences = {
    desiredRole:
      existingProfile?.targetPreferences?.desiredRole ||
      recentJobs[0]?.jobTitle ||
      '',
    targetLevel: existingProfile?.targetPreferences?.targetLevel || 'Mid',
    preferredIndustry:
      existingProfile?.targetPreferences?.preferredIndustry || '',
  };

  return {
    userId: userObjectId.toString(),
    resumeContext,
    jobMatchContext,
    interviewContext,
    applicationContext,
    targetPreferences,
    existingRoadmap: existingProfile?.learningRoadmap || [],
  };
}

/**
 * 2. Deterministic Skill Gap Aggregation
 *
 * Requirements:
 * - Case-insensitive & whitespace normalization.
 * - Avoid duplicate skills.
 * - Count demand frequency across actual job analysis records.
 * - Classify proficiency: Mastered, Critical Gap, Partial Gap.
 * - Distinguish verified user evidence from job demands.
 */
export function aggregateSkillGaps(resumeContext = {}, jobMatchContext = {}) {
  const verifiedMap = new Map(); // lowercase -> canonical name
  const demandedMap = new Map(); // lowercase -> { canonicalName, demandFrequency, missingFreq, partialFreq, matchedFreq, category }

  // 1. Ingest verified skills from Resume
  if (Array.isArray(resumeContext.verifiedSkills)) {
    resumeContext.verifiedSkills.forEach((raw) => {
      if (raw && typeof raw === 'string') {
        const trimmed = raw.trim();
        const key = trimmed.toLowerCase();
        if (key) {
          verifiedMap.set(key, trimmed);
        }
      }
    });
  }

  // 2. Ingest demanded skills from JobAnalyses
  const recentJobs = jobMatchContext.recentJobs || [];
  recentJobs.forEach((job) => {
    const skillsAnalysis = job.skillsAnalysis || {};
    const processedJobKeys = new Set(); // Prevent counting same skill twice in one job

    // Helper to register skill demand from job
    const registerDemand = (rawSkill, status, category = 'Technical') => {
      if (!rawSkill || typeof rawSkill !== 'string') return;
      const trimmed = rawSkill.trim();
      const key = trimmed.toLowerCase();
      if (!key) return;

      if (!demandedMap.has(key)) {
        demandedMap.set(key, {
          canonicalName: trimmed,
          demandFrequency: 0,
          missingFreq: 0,
          partialFreq: 0,
          matchedFreq: 0,
          category,
        });
      }

      const item = demandedMap.get(key);

      // Increment demand frequency once per job description
      if (!processedJobKeys.has(key)) {
        item.demandFrequency += 1;
        processedJobKeys.add(key);
      }

      if (status === 'matched') {
        item.matchedFreq += 1;
        verifiedMap.set(key, trimmed); // Matched skill confirmed by resume evidence in job match
      } else if (status === 'missing') {
        item.missingFreq += 1;
      } else if (status === 'partial') {
        item.partialFreq += 1;
      }
    };

    // Matched skills in job
    if (Array.isArray(skillsAnalysis.matchedSkills)) {
      skillsAnalysis.matchedSkills.forEach((m) => {
        const name = typeof m === 'string' ? m : m.skill;
        registerDemand(name, 'matched', m.category || 'Technical');
      });
    }

    // Missing skills in job
    if (Array.isArray(skillsAnalysis.missingOrUnverifiedSkills)) {
      skillsAnalysis.missingOrUnverifiedSkills.forEach((m) => {
        const name = typeof m === 'string' ? m : m.skill;
        registerDemand(name, 'missing', 'Technical');
      });
    }

    // Partial skills in job
    if (Array.isArray(skillsAnalysis.partiallyMatchedSkills)) {
      skillsAnalysis.partiallyMatchedSkills.forEach((m) => {
        const name = typeof m === 'string' ? m : m.skill;
        registerDemand(name, 'partial', 'Technical');
      });
    }

    // Skill gaps in job
    if (Array.isArray(skillsAnalysis.skillGaps)) {
      skillsAnalysis.skillGaps.forEach((m) => {
        const name = typeof m === 'string' ? m : m.skill;
        registerDemand(name, 'missing', 'Technical');
      });
    }
  });

  const masteredSkills = [];
  const criticalGaps = [];
  const partialGaps = [];

  // Categorize Demanded Skills
  demandedMap.forEach((info, key) => {
    const isVerifiedInResume = verifiedMap.has(key);

    if (isVerifiedInResume || (info.missingFreq === 0 && info.matchedFreq > 0)) {
      masteredSkills.push({
        skillName: info.canonicalName,
        demandFrequency: info.demandFrequency,
        proficiencyStatus: 'Mastered',
        priority: 'High',
        sourceAttribution: 'resume_identified',
      });
    } else if (info.missingFreq >= 2 || info.demandFrequency >= 2) {
      criticalGaps.push({
        skillName: info.canonicalName,
        demandFrequency: info.demandFrequency,
        proficiencyStatus: 'Critical Gap',
        priority: 'High',
        sourceAttribution: 'job_requirement',
      });
    } else {
      partialGaps.push({
        skillName: info.canonicalName,
        demandFrequency: info.demandFrequency,
        proficiencyStatus: 'Partial Gap',
        priority: 'Medium',
        sourceAttribution: 'job_requirement',
      });
    }
  });

  // Include remaining verified resume skills not demanded by analyzed jobs
  verifiedMap.forEach((canonicalName, key) => {
    if (!demandedMap.has(key)) {
      masteredSkills.push({
        skillName: canonicalName,
        demandFrequency: 1,
        proficiencyStatus: 'Mastered',
        priority: 'Medium',
        sourceAttribution: 'resume_identified',
      });
    }
  });

  // Sort descending by demand frequency
  masteredSkills.sort((a, b) => b.demandFrequency - a.demandFrequency);
  criticalGaps.sort((a, b) => b.demandFrequency - a.demandFrequency);
  partialGaps.sort((a, b) => b.demandFrequency - a.demandFrequency);

  return {
    masteredSkills: masteredSkills.slice(0, 30),
    criticalGaps: criticalGaps.slice(0, 30),
    partialGaps: partialGaps.slice(0, 30),
    totalAnalyzedJobs: recentJobs.length,
  };
}

/**
 * 3. Career Readiness Index (CRI) Integration
 *
 * Uses Stage 1 calculateCareerReadinessIndex() pure function.
 * Preserves dynamic weight normalization and cold-start rules.
 */
export function computeReadinessIndexFromContext(
  normalizedContext = {},
  options = {}
) {
  const scoresContext = {
    resumeQuality:
      normalizedContext.resumeContext?.latestAnalysis?.overallScore ?? null,
    jobFitAlignment:
      normalizedContext.jobMatchContext?.averageMatchScore ?? null,
    interviewMastery:
      normalizedContext.interviewContext?.averageInterviewScore ?? null,
    applicationPipeline:
      normalizedContext.applicationContext?.pipelineHealthScore ?? null,
  };

  const criResult = calculateCareerReadinessIndex(scoresContext, options);

  // Map to competitive tier
  let tier = 'Needs Preparation';
  if (criResult.overallScore !== null) {
    if (criResult.overallScore >= 85) {
      tier = 'Highly Qualified';
    } else if (criResult.overallScore >= 70) {
      tier = 'Competitive';
    } else if (criResult.overallScore >= 50) {
      tier = 'Emerging';
    } else {
      tier = 'Needs Preparation';
    }
  }

  // Catalog missing components for user guidance
  const missingComponents = [];
  if (scoresContext.resumeQuality === null) {
    missingComponents.push('Resume Analysis');
  }
  if (scoresContext.jobFitAlignment === null) {
    missingComponents.push('Job Description Matching');
  }
  if (scoresContext.interviewMastery === null) {
    missingComponents.push('Mock Interview Simulator');
  }
  if (scoresContext.applicationPipeline === null) {
    missingComponents.push('Job Application Tracker');
  }

  return {
    overallScore: criResult.overallScore,
    tier,
    resumeQuality: criResult.dimensionBreakdown.resumeQuality,
    jobFitAlignment: criResult.dimensionBreakdown.jobFitAlignment,
    interviewMastery: criResult.dimensionBreakdown.interviewMastery,
    applicationPipeline: criResult.dimensionBreakdown.applicationPipeline,
    availableDimensions: criResult.availableDimensions,
    weightsUsed: criResult.weightsUsed,
    missingComponents,
    calculatedAt: criResult.calculatedAt,
    disclaimer:
      'The Career Readiness Index is an assistive metric based on semantic profile alignment and does not constitute a guarantee of employment.',
  };
}

/**
 * 4. Weekly Momentum Activity Aggregation
 *
 * Requirements:
 * - Consistent 7-day UTC time window.
 * - Actual database timestamps only.
 * - Categorize status: Accelerating (>=4), Steady (1-3), Inactive (0).
 */
export async function computeWeeklyMomentum(
  userId,
  customNow = new Date()
) {
  if (!userId) {
    throw new Error('User ID is required to compute weekly momentum.');
  }

  const userObjectId =
    typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const endDate = new Date(customNow);
  const startDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    resumesAudited,
    jobsAnalyzed,
    interviewsCompleted,
    applicationsAdvanced,
    profileDoc,
  ] = await Promise.all([
    ResumeAnalysis.countDocuments({
      userId: userObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    JobAnalysis.countDocuments({
      userId: userObjectId,
      createdAt: { $gte: startDate, $lte: endDate },
    }),

    InterviewSession.countDocuments({
      userId: userObjectId,
      status: 'completed',
      updatedAt: { $gte: startDate, $lte: endDate },
    }),

    Application.countDocuments({
      userId: userObjectId,
      updatedAt: { $gte: startDate, $lte: endDate },
    }),

    CareerProfile.findOne({ userId: userObjectId })
      .select('learningRoadmap')
      .lean(),
  ]);

  let milestonesCompleted = 0;
  if (Array.isArray(profileDoc?.learningRoadmap)) {
    profileDoc.learningRoadmap.forEach((m) => {
      if (m.completed && m.completedAt) {
        const cDate = new Date(m.completedAt);
        if (cDate >= startDate && cDate <= endDate) {
          milestonesCompleted += 1;
        }
      }
    });
  }

  const totalActivity =
    resumesAudited +
    jobsAnalyzed +
    interviewsCompleted +
    applicationsAdvanced +
    milestonesCompleted;

  let momentumStatus = 'Inactive';
  if (totalActivity >= 4) {
    momentumStatus = 'Accelerating';
  } else if (totalActivity >= 1) {
    momentumStatus = 'Steady';
  }

  return {
    startDate,
    endDate,
    resumesAudited,
    jobsAnalyzed,
    interviewsCompleted,
    applicationsAdvanced,
    milestonesCompleted,
    momentumStatus,
  };
}
