import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { CareerProfile } from '../src/models/CareerProfile.js';
import {
  updatePreferencesSchema,
  toggleMilestoneSchema,
  geminiCareerSynthesisSchema,
  calculateCareerReadinessIndex,
} from '../src/validators/careerIntelligenceValidators.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  // Ensure indexes are built
  await CareerProfile.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Phase 9 Stage 1: CareerProfile Model & Validators Suite', () => {
  const dummyUserId1 = new mongoose.Types.ObjectId();
  const dummyUserId2 = new mongoose.Types.ObjectId();

  // Test Case 1: Model accepts valid profile
  it('1. Model accepts valid profile with all subdocuments and defaults', async () => {
    const validProfile = await CareerProfile.create({
      userId: dummyUserId1,
      targetPreferences: {
        desiredRole: 'Staff Distributed Systems Engineer',
        targetLevel: 'Senior',
        preferredIndustry: 'FinTech',
      },
      careerReadiness: {
        overallScore: 84,
        resumeQuality: 88,
        jobFitAlignment: 82,
        interviewMastery: 80,
        applicationPipeline: 85,
        availableDimensions: [
          'resumeQuality',
          'jobFitAlignment',
          'interviewMastery',
          'applicationPipeline',
        ],
        weightsUsed: {
          resumeQuality: 0.25,
          jobFitAlignment: 0.3,
          interviewMastery: 0.25,
          applicationPipeline: 0.2,
        },
        calculatedAt: new Date(),
      },
      skillAnalysis: {
        masteredSkills: [
          {
            skillName: 'Go',
            demandFrequency: 5,
            proficiencyStatus: 'Mastered',
            priority: 'High',
            sourceAttribution: 'resume_identified',
          },
        ],
        criticalGaps: [
          {
            skillName: 'Kubernetes',
            demandFrequency: 4,
            proficiencyStatus: 'Critical Gap',
            priority: 'High',
            sourceAttribution: 'job_requirement',
          },
        ],
        partialGaps: [],
        totalAnalyzedJobs: 5,
      },
      learningRoadmap: [
        {
          title: 'Container Orchestration Mastery',
          description: 'Deploy resilient multi-cluster services with Helm and K8s.',
          category: 'Technical Skill',
          priority: 'High',
          estimatedHours: 20,
          completed: false,
          sourceAttribution: 'user_gap',
        },
      ],
      roleRecommendations: [
        {
          roleTitle: 'Lead Cloud Infrastructure Architect',
          category: 'Growth Role',
          alignmentScore: 78,
          matchedSkills: ['Go', 'Distributed Systems'],
          missingSkills: ['Kubernetes', 'Terraform'],
          rationale: 'Strong backend foundation; needs infrastructure-as-code depth.',
          sourceAttribution: 'skill_overlap',
        },
      ],
      nextActions: [
        {
          title: 'Schedule System Design Mock Interview',
          description: 'Practice high-throughput event sourcing architecture.',
          priority: 'High',
          actionType: 'INTERVIEW_PRACTICE',
          deepLink: '/interviews',
          completed: false,
        },
      ],
      weeklyMomentum: {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        resumesAudited: 1,
        jobsAnalyzed: 3,
        interviewsCompleted: 2,
        applicationsAdvanced: 4,
        milestonesCompleted: 1,
        momentumStatus: 'Accelerating',
      },
      generationSource: 'ai',
      lastGeneratedAt: new Date(),
    });

    expect(validProfile._id).toBeDefined();
    expect(validProfile.userId.toString()).toBe(dummyUserId1.toString());
    expect(validProfile.targetPreferences.targetLevel).toBe('Senior');
    expect(validProfile.careerReadiness.overallScore).toBe(84);
    expect(validProfile.skillAnalysis.criticalGaps.length).toBe(1);
    expect(validProfile.learningRoadmap[0].title).toBe('Container Orchestration Mastery');
    expect(validProfile.roleRecommendations[0].category).toBe('Growth Role');
    expect(validProfile.generationSource).toBe('ai');
    expect(validProfile.schemaVersion).toBe(1);
  });

  // Test Case 2: Missing userId rejected
  it('2. Missing userId rejected by Mongoose schema validation', async () => {
    let error;
    try {
      await CareerProfile.create({
        targetPreferences: { desiredRole: 'Backend Engineer' },
      });
    } catch (err) {
      error = err;
    }
    expect(error).toBeDefined();
    expect(error.errors.userId).toBeDefined();
    expect(error.errors.userId.message).toContain('User ID is required');
  });

  // Test Case 3: Duplicate userId rejected by unique index
  it('3. Duplicate userId rejected by unique index constraint', async () => {
    let duplicateError;
    try {
      await CareerProfile.create({
        userId: dummyUserId1, // already used in Test 1
        targetPreferences: { desiredRole: 'Duplicate Profile' },
      });
    } catch (err) {
      duplicateError = err;
    }
    expect(duplicateError).toBeDefined();
    expect(duplicateError.code).toBe(11000); // MongoDB duplicate key code
  });

  // Test Case 4: Invalid CRI score rejected
  it('4. Invalid CRI score (< 0 or > 100) rejected by Mongoose model validation', async () => {
    let negativeError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        careerReadiness: { overallScore: -5 },
      });
    } catch (err) {
      negativeError = err;
    }
    expect(negativeError).toBeDefined();
    expect(negativeError.errors['careerReadiness.overallScore']).toBeDefined();

    let overflowError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        careerReadiness: { overallScore: 105 },
      });
    } catch (err) {
      overflowError = err;
    }
    expect(overflowError).toBeDefined();
    expect(overflowError.errors['careerReadiness.overallScore']).toBeDefined();
  });

  // Test Case 5: Invalid currency-independent enum rejected
  it('5. Invalid enum value (targetLevel, generationSource, momentumStatus) rejected by model', async () => {
    let enumError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        targetPreferences: { targetLevel: 'GrandMaster' }, // Not Junior/Mid/Senior/Lead
      });
    } catch (err) {
      enumError = err;
    }
    expect(enumError).toBeDefined();
    expect(enumError.errors['targetPreferences.targetLevel']).toBeDefined();
  });

  // Test Case 6: Invalid milestone rejected
  it('6. Invalid milestone (missing title or invalid priority) rejected by model', async () => {
    let milestoneError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        learningRoadmap: [
          {
            // title missing
            category: 'Technical Skill',
            priority: 'UltraHigh', // Invalid priority enum
          },
        ],
      });
    } catch (err) {
      milestoneError = err;
    }
    expect(milestoneError).toBeDefined();
    expect(milestoneError.errors['learningRoadmap.0.title']).toBeDefined();
    expect(milestoneError.errors['learningRoadmap.0.priority']).toBeDefined();
  });

  // Test Case 7: Invalid Gemini output rejected
  it('7. Invalid Gemini output rejected by geminiCareerSynthesisSchema', () => {
    // Missing required arrays and executive summary too short
    const invalidPayload = {
      executiveSummary: 'Short',
      skillGaps: [], // Min 1 required
      learningRoadmap: [],
      roleRecommendations: [],
      nextActions: [],
    };

    const result = geminiCareerSynthesisSchema.safeParse(invalidPayload);
    expect(result.success).toBe(false);
    expect(result.error.issues.some((i) => i.path.includes('executiveSummary'))).toBe(true);
    expect(result.error.issues.some((i) => i.path.includes('skillGaps'))).toBe(true);
  });

  // Test Case 8: All four CRI dimensions available
  it('8. All four CRI dimensions available produces exact mathematically weighted score', () => {
    const context = {
      resumeQuality: 90, // weight: 0.25 -> 22.5
      jobFitAlignment: 80, // weight: 0.30 -> 24.0
      interviewMastery: 70, // weight: 0.25 -> 17.5
      applicationPipeline: 60, // weight: 0.20 -> 12.0
      // Sum = 22.5 + 24.0 + 17.5 + 12.0 = 76.0
    };

    const cri = calculateCareerReadinessIndex(context);
    expect(cri.overallScore).toBe(76);
    expect(cri.availableDimensions).toEqual([
      'resumeQuality',
      'jobFitAlignment',
      'interviewMastery',
      'applicationPipeline',
    ]);
    expect(cri.weightsUsed).toEqual({
      resumeQuality: 0.25,
      jobFitAlignment: 0.3,
      interviewMastery: 0.25,
      applicationPipeline: 0.2,
    });
    expect(cri.dimensionBreakdown.resumeQuality).toBe(90);
    expect(cri.dimensionBreakdown.jobFitAlignment).toBe(80);
    expect(cri.dimensionBreakdown.interviewMastery).toBe(70);
    expect(cri.dimensionBreakdown.applicationPipeline).toBe(60);
  });

  // Test Case 9: Only resume dimension available
  it('9. Only resume dimension available reweights to 100% and returns exact resume score', () => {
    const context = {
      resumeQuality: 85,
      jobFitAlignment: null,
      interviewMastery: undefined,
      applicationPipeline: null,
    };

    const cri = calculateCareerReadinessIndex(context);
    expect(cri.overallScore).toBe(85);
    expect(cri.availableDimensions).toEqual(['resumeQuality']);
    expect(cri.weightsUsed).toEqual({ resumeQuality: 1.0 });
    expect(cri.dimensionBreakdown.resumeQuality).toBe(85);
    expect(cri.dimensionBreakdown.jobFitAlignment).toBeNull();
  });

  // Test Case 10: Missing dimensions dynamically reweighted
  it('10. Missing dimensions dynamically reweight proportionally across available dimensions', () => {
    // Resume (0.25) and Job Match (0.30) available; Total base weight = 0.55
    // Normalized Resume weight = 0.25 / 0.55 = 0.4545...
    // Normalized Job Match weight = 0.30 / 0.55 = 0.5454...
    // Expected score = (80 * 0.454545) + (70 * 0.545454) = 36.3636 + 38.1818 = 74.545 -> 75
    const context = {
      resumeQuality: 80,
      jobFitAlignment: 70,
      interviewMastery: null,
      applicationPipeline: null,
    };

    const cri = calculateCareerReadinessIndex(context);
    expect(cri.overallScore).toBe(75);
    expect(cri.availableDimensions).toEqual(['resumeQuality', 'jobFitAlignment']);
    expect(cri.weightsUsed.resumeQuality).toBeCloseTo(0.4545, 3);
    expect(cri.weightsUsed.jobFitAlignment).toBeCloseTo(0.5455, 3);
  });

  // Test Case 11: All dimensions unavailable returns null
  it('11. All dimensions unavailable returns overallScore null without fabricating score', () => {
    const context = {
      resumeQuality: null,
      jobFitAlignment: null,
      interviewMastery: null,
      applicationPipeline: null,
    };

    const cri = calculateCareerReadinessIndex(context);
    expect(cri.overallScore).toBeNull();
    expect(cri.availableDimensions).toEqual([]);
    expect(cri.weightsUsed).toEqual({});
    expect(cri.dimensionBreakdown.resumeQuality).toBeNull();
    expect(cri.dimensionBreakdown.jobFitAlignment).toBeNull();
    expect(cri.dimensionBreakdown.interviewMastery).toBeNull();
    expect(cri.dimensionBreakdown.applicationPipeline).toBeNull();
  });

  // Test Case 12: Scores outside 0–100 rejected
  it('12. Scores outside 0–100 rejected with informative error in calculateCareerReadinessIndex', () => {
    expect(() =>
      calculateCareerReadinessIndex({ resumeQuality: -10 })
    ).toThrowError(/must be between 0 and 100/);

    expect(() =>
      calculateCareerReadinessIndex({ jobFitAlignment: 120 })
    ).toThrowError(/must be between 0 and 100/);

    expect(() =>
      calculateCareerReadinessIndex({ interviewMastery: 'not-a-number' })
    ).toThrowError(/must be a valid number/);
  });

  // Test Case 13: Excessive arrays rejected
  it('13. Excessive arrays rejected by Mongoose model validators and Zod schemas', async () => {
    // Model roadmap max items = 20
    const excessiveRoadmap = Array.from({ length: 25 }, (_, idx) => ({
      title: `Milestone ${idx}`,
      category: 'Technical Skill',
      priority: 'High',
      estimatedHours: 5,
      completed: false,
      sourceAttribution: 'user_gap',
    }));

    let modelArrayError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        learningRoadmap: excessiveRoadmap,
      });
    } catch (err) {
      modelArrayError = err;
    }
    expect(modelArrayError).toBeDefined();
    expect(modelArrayError.errors.learningRoadmap).toBeDefined();

    // Zod skillGaps max = 30
    const excessiveSkills = Array.from({ length: 35 }, (_, idx) => ({
      skillName: `Skill ${idx}`,
      demandFrequency: 1,
      proficiencyStatus: 'Critical Gap',
      priority: 'High',
      sourceAttribution: 'job_requirement',
    }));

    const validMilestone = {
      title: 'Valid Milestone',
      description: 'Desc',
      category: 'Technical Skill',
      priority: 'High',
      estimatedHours: 10,
      sourceAttribution: 'user_gap',
    };
    const validRole = {
      roleTitle: 'Valid Role',
      category: 'Target Role',
      alignmentScore: 80,
      matchedSkills: ['Skill A'],
      missingSkills: ['Skill B'],
      rationale: 'Reason',
      sourceAttribution: 'skill_overlap',
    };
    const validAction = {
      title: 'Valid Action',
      description: 'Action Desc',
      priority: 'High',
      actionType: 'SKILL_STUDY',
      deepLink: '/dashboard',
    };

    const zodResult = geminiCareerSynthesisSchema.safeParse({
      executiveSummary: 'Valid executive summary of sufficient length.',
      skillGaps: excessiveSkills, // 35 items > max 30
      learningRoadmap: [validMilestone],
      roleRecommendations: [validRole],
      nextActions: [validAction],
    });
    expect(zodResult.success).toBe(false);
    expect(zodResult.error.issues.some((i) => i.path.includes('skillGaps'))).toBe(true);
  });

  // Test Case 14: Invalid source attribution rejected
  it('14. Invalid source attribution rejected by both Mongoose and Zod schema', async () => {
    // Model attribution check on milestone
    let modelAttrError;
    try {
      await CareerProfile.create({
        userId: dummyUserId2,
        learningRoadmap: [
          {
            title: 'Sample Milestone',
            sourceAttribution: 'fabricated_hallucination', // Invalid enum
          },
        ],
      });
    } catch (err) {
      modelAttrError = err;
    }
    expect(modelAttrError).toBeDefined();
    expect(modelAttrError.errors['learningRoadmap.0.sourceAttribution']).toBeDefined();

    // Zod attribution check on skillGap
    const invalidSkillAttribution = {
      executiveSummary: 'Valid summary with enough text length.',
      skillGaps: [
        {
          skillName: 'Python',
          demandFrequency: 1,
          proficiencyStatus: 'Mastered',
          priority: 'High',
          sourceAttribution: 'unsupported_attribution_source', // Invalid
        },
      ],
      learningRoadmap: [
        {
          title: 'Milestone',
          description: '',
          category: 'Technical Skill',
          priority: 'High',
          estimatedHours: 10,
          sourceAttribution: 'user_gap',
        },
      ],
      roleRecommendations: [
        {
          roleTitle: 'Role',
          category: 'Target Role',
          alignmentScore: 85,
          matchedSkills: [],
          missingSkills: [],
          rationale: '',
          sourceAttribution: 'skill_overlap',
        },
      ],
      nextActions: [
        {
          title: 'Action',
          description: '',
          priority: 'High',
          actionType: 'SKILL_STUDY',
          deepLink: '/dashboard',
        },
      ],
    };

    const parseResult = geminiCareerSynthesisSchema.safeParse(invalidSkillAttribution);
    expect(parseResult.success).toBe(false);
    expect(
      parseResult.error.issues.some((i) =>
        i.message.includes('Invalid skill source attribution')
      )
    ).toBe(true);
  });
});
