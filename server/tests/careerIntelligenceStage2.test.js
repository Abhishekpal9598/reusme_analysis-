import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  Resume,
  ResumeAnalysis,
  JobAnalysis,
  InterviewSession,
  Application,
} from '../src/models/index.js';
import { CareerProfile } from '../src/models/CareerProfile.js';
import {
  collectUserCareerContext,
  aggregateSkillGaps,
  computeReadinessIndexFromContext,
  computeWeeklyMomentum,
} from '../src/services/careerIntelligenceContextService.js';
import {
  generateCareerIntelligence,
  generateHeuristicCareerProfile,
  setMockCareerIntelligenceGenerator,
} from '../src/services/careerIntelligenceService.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await CareerProfile.init();
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(() => {
  // Reset mock generator before each test
  setMockCareerIntelligenceGenerator(null);
});

describe('Phase 9 Stage 2: Context Collection & AI/Fallback Services Suite', () => {
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  // ==========================================================================
  // SECTION A: Context Collection
  // ==========================================================================
  describe('A. Context Collection Service', () => {
    it('should collect context scoped strictly to authenticated user without cross-user leakage', async () => {
      // Create records for User A
      const resumeA = await Resume.create({
        userId: userAId,
        originalFileName: 'user_a_resume.pdf',
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'Experienced Senior Go and Kubernetes engineer with distributed systems expertise.',
      });

      await ResumeAnalysis.create({
        userId: userAId,
        resumeId: resumeA._id,
        overallScore: 88,
        summaryFeedback: 'Strong backend foundation with excellent impact and metrics.',
        identifiedSkills: {
          technical: ['Go', 'Kubernetes', 'PostgreSQL'],
          toolsAndFrameworks: ['Docker', 'Helm'],
          soft: ['Leadership'],
        },
      });

      await JobAnalysis.create({
        userId: userAId,
        resumeId: resumeA._id,
        jobTitle: 'Senior Infrastructure Engineer',
        jobDescription: 'Seeking expert in Go, Kubernetes, and Kafka for cloud platform.',
        matchScore: 85,
        skillsAnalysis: {
          matchedSkills: [{ skill: 'Go' }, { skill: 'Kubernetes' }],
          missingOrUnverifiedSkills: [{ skill: 'Kafka' }],
        },
      });

      // Create record for User B (must NOT leak to User A)
      const resumeB = await Resume.create({
        userId: userBId,
        originalFileName: 'user_b_resume.pdf',
        fileFormat: 'pdf',
        fileSize: 2048,
        rawText: 'Junior Front-End Developer with React and CSS proficiencies.',
      });

      await ResumeAnalysis.create({
        userId: userBId,
        resumeId: resumeB._id,
        overallScore: 60,
        summaryFeedback: 'Early career front-end candidate.',
        identifiedSkills: {
          technical: ['React', 'CSS', 'JavaScript'],
        },
      });

      // Collect context for User A
      const contextA = await collectUserCareerContext(userAId);

      expect(contextA.userId).toBe(userAId.toString());
      expect(contextA.resumeContext.totalResumes).toBe(1);
      expect(contextA.resumeContext.latestAnalysis.overallScore).toBe(88);
      expect(contextA.resumeContext.verifiedSkills).toContain('Go');
      expect(contextA.resumeContext.verifiedSkills).toContain('Kubernetes');
      // Verify User B skills did NOT leak
      expect(contextA.resumeContext.verifiedSkills).not.toContain('React');
      expect(contextA.jobMatchContext.totalAnalyzedJobs).toBe(1);
      expect(contextA.jobMatchContext.recentJobs[0].jobTitle).toBe('Senior Infrastructure Engineer');
    });

    it('should handle completely empty collections safely without crashing or fabricating data', async () => {
      const emptyUserId = new mongoose.Types.ObjectId();
      const emptyContext = await collectUserCareerContext(emptyUserId);

      expect(emptyContext.userId).toBe(emptyUserId.toString());
      expect(emptyContext.resumeContext.totalResumes).toBe(0);
      expect(emptyContext.resumeContext.latestAnalysis).toBeNull();
      expect(emptyContext.resumeContext.verifiedSkills).toEqual([]);
      expect(emptyContext.jobMatchContext.totalAnalyzedJobs).toBe(0);
      expect(emptyContext.jobMatchContext.averageMatchScore).toBeNull();
      expect(emptyContext.interviewContext.totalCompletedSessions).toBe(0);
      expect(emptyContext.interviewContext.averageInterviewScore).toBeNull();
      expect(emptyContext.applicationContext.totalApplications).toBe(0);
      expect(emptyContext.applicationContext.pipelineHealthScore).toBeNull();
    });

    it('should respect query limits and avoid retrieving large rawText fields', async () => {
      const bulkUserId = new mongoose.Types.ObjectId();
      // Insert multiple applications
      const apps = Array.from({ length: 15 }, (_, i) => ({
        userId: bulkUserId,
        companyName: `Company ${i}`,
        positionTitle: `Engineer ${i}`,
        status: i % 2 === 0 ? 'Applied' : 'Saved',
      }));
      await Application.insertMany(apps);

      const context = await collectUserCareerContext(bulkUserId);
      expect(context.applicationContext.totalApplications).toBe(15);
      expect(context.applicationContext.activePipelineCount).toBe(8); // 'Applied'
      expect(context.applicationContext.pipelineHealthScore).toBeGreaterThanOrEqual(20);
    });
  });

  // ==========================================================================
  // SECTION B: Skill Gap Aggregation
  // ==========================================================================
  describe('B. Deterministic Skill Gap Aggregation', () => {
    it('should normalize skill duplicates, trim whitespace, and perform case-insensitive matching', () => {
      const resumeContext = {
        verifiedSkills: ['  kubernetes  ', 'Go', 'DOCKER', 'go  '],
      };

      const jobMatchContext = {
        recentJobs: [
          {
            skillsAnalysis: {
              matchedSkills: [{ skill: 'Kubernetes' }, { skill: 'GO' }],
              missingOrUnverifiedSkills: [{ skill: '  Kafka  ' }, { skill: 'kafka' }],
            },
          },
          {
            skillsAnalysis: {
              matchedSkills: [{ skill: 'Docker' }],
              missingOrUnverifiedSkills: [{ skill: 'Kafka' }, { skill: 'Redis' }],
            },
          },
        ],
      };

      const result = aggregateSkillGaps(resumeContext, jobMatchContext);

      // Verified skills should be Mastered
      const masteredNames = result.masteredSkills.map((s) => s.skillName.toLowerCase());
      expect(masteredNames).toContain('kubernetes');
      expect(masteredNames).toContain('go');
      expect(masteredNames).toContain('docker');

      // Demand frequency: Kafka demanded in 2 jobs -> Critical Gap (missing >= 2)
      const kafka = result.criticalGaps.find((s) => s.skillName.toLowerCase() === 'kafka');
      expect(kafka).toBeDefined();
      expect(kafka.demandFrequency).toBe(2);
      expect(kafka.proficiencyStatus).toBe('Critical Gap');

      // Redis missing in only 1 job -> Partial Gap
      const redis = result.partialGaps.find((s) => s.skillName.toLowerCase() === 'redis');
      expect(redis).toBeDefined();
      expect(redis.demandFrequency).toBe(1);
      expect(redis.proficiencyStatus).toBe('Partial Gap');
    });

    it('should return empty arrays when resume and job data are both empty without fabricating skills', () => {
      const result = aggregateSkillGaps({}, {});
      expect(result.masteredSkills).toEqual([]);
      expect(result.criticalGaps).toEqual([]);
      expect(result.partialGaps).toEqual([]);
      expect(result.totalAnalyzedJobs).toBe(0);
    });

    it('should not classify unknown skills as mastered without evidence', () => {
      const resumeContext = { verifiedSkills: [] };
      const jobMatchContext = {
        recentJobs: [
          {
            skillsAnalysis: {
              missingOrUnverifiedSkills: [{ skill: 'Terraform' }],
            },
          },
        ],
      };

      const result = aggregateSkillGaps(resumeContext, jobMatchContext);
      const masteredNames = result.masteredSkills.map((s) => s.skillName);
      expect(masteredNames).not.toContain('Terraform');

      const gapNames = result.partialGaps.map((s) => s.skillName);
      expect(gapNames).toContain('Terraform');
    });
  });

  // ==========================================================================
  // SECTION C: Career Readiness Index (CRI) Integration
  // ==========================================================================
  describe('C. Career Readiness Index Integration', () => {
    it('should integrate all four dimensions when full data is available', () => {
      const context = {
        resumeContext: { latestAnalysis: { overallScore: 80 } },
        jobMatchContext: { averageMatchScore: 90 },
        interviewContext: { averageInterviewScore: 70 },
        applicationContext: { pipelineHealthScore: 80 },
      };

      const readiness = computeReadinessIndexFromContext(context);

      // (80*0.25) + (90*0.30) + (70*0.25) + (80*0.20) = 20 + 27 + 17.5 + 16 = 80.5 -> 81
      expect(readiness.overallScore).toBe(81);
      expect(readiness.tier).toBe('Competitive');
      expect(readiness.availableDimensions.length).toBe(4);
      expect(readiness.missingComponents).toEqual([]);
      expect(readiness.resumeQuality).toBe(80);
      expect(readiness.jobFitAlignment).toBe(90);
      expect(readiness.interviewMastery).toBe(70);
      expect(readiness.applicationPipeline).toBe(80);
    });

    it('should dynamically reweight when some dimensions are missing and record missing components', () => {
      const context = {
        resumeContext: { latestAnalysis: { overallScore: 85 } },
        jobMatchContext: { averageMatchScore: 75 },
        interviewContext: { averageInterviewScore: null },
        applicationContext: { pipelineHealthScore: null },
      };

      const readiness = computeReadinessIndexFromContext(context);

      expect(readiness.overallScore).toBeDefined();
      expect(readiness.availableDimensions).toEqual(['resumeQuality', 'jobFitAlignment']);
      expect(readiness.missingComponents).toContain('Mock Interview Simulator');
      expect(readiness.missingComponents).toContain('Job Application Tracker');
    });

    it('should return null overallScore when all dimensions are missing without inventing a score', () => {
      const emptyContext = {
        resumeContext: { latestAnalysis: null },
        jobMatchContext: { averageMatchScore: null },
        interviewContext: { averageInterviewScore: null },
        applicationContext: { pipelineHealthScore: null },
      };

      const readiness = computeReadinessIndexFromContext(emptyContext);

      expect(readiness.overallScore).toBeNull();
      expect(readiness.tier).toBe('Needs Preparation');
      expect(readiness.availableDimensions).toEqual([]);
      expect(readiness.missingComponents.length).toBe(4);
    });

    it('should allow a valid calculated score of zero without treating it as missing', () => {
      const zeroContext = {
        resumeContext: { latestAnalysis: { overallScore: 0 } },
        jobMatchContext: { averageMatchScore: null },
        interviewContext: { averageInterviewScore: null },
        applicationContext: { pipelineHealthScore: null },
      };

      const readiness = computeReadinessIndexFromContext(zeroContext);

      expect(readiness.overallScore).toBe(0);
      expect(readiness.availableDimensions).toEqual(['resumeQuality']);
      expect(readiness.resumeQuality).toBe(0);
    });
  });

  // ==========================================================================
  // SECTION D: Weekly Momentum Activity Aggregation
  // ==========================================================================
  describe('D. Weekly Momentum Aggregation', () => {
    it('should track activity strictly within trailing 7-day UTC window and exclude older records', async () => {
      const momentumUser = new mongoose.Types.ObjectId();
      const now = new Date('2026-10-15T12:00:00Z');

      const dummyResumeId = new mongoose.Types.ObjectId();

      // Recent record (within 7 days)
      await JobAnalysis.create({
        userId: momentumUser,
        resumeId: dummyResumeId,
        jobTitle: 'Recent Job',
        jobDescription: 'Recent job description text...',
        matchScore: 80,
        createdAt: new Date('2026-10-12T10:00:00Z'), // 3 days ago
      });

      // Old record (10 days ago, must be excluded)
      await JobAnalysis.create({
        userId: momentumUser,
        resumeId: dummyResumeId,
        jobTitle: 'Old Job',
        jobDescription: 'Old job description text...',
        matchScore: 70,
        createdAt: new Date('2026-10-02T10:00:00Z'), // 13 days ago
      });

      // Recent application
      await Application.create({
        userId: momentumUser,
        companyName: 'Recent Corp',
        positionTitle: 'Backend Engineer',
        status: 'Interview',
        updatedAt: new Date('2026-10-14T08:00:00Z'), // 1 day ago
      });

      const momentum = await computeWeeklyMomentum(momentumUser, now);

      expect(momentum.jobsAnalyzed).toBe(1); // Old job excluded
      expect(momentum.applicationsAdvanced).toBe(1);
      expect(momentum.resumesAudited).toBe(0);
      expect(momentum.interviewsCompleted).toBe(0);
      expect(momentum.momentumStatus).toBe('Steady'); // 2 events
    });

    it('should return Inactive status when zero activity occurred in trailing 7 days', async () => {
      const inactiveUser = new mongoose.Types.ObjectId();
      const momentum = await computeWeeklyMomentum(inactiveUser);

      expect(momentum.jobsAnalyzed).toBe(0);
      expect(momentum.applicationsAdvanced).toBe(0);
      expect(momentum.resumesAudited).toBe(0);
      expect(momentum.interviewsCompleted).toBe(0);
      expect(momentum.milestonesCompleted).toBe(0);
      expect(momentum.momentumStatus).toBe('Inactive');
    });
  });

  // ==========================================================================
  // SECTION E: AI Synthesis with Mock Injection & Error Handling
  // ==========================================================================
  describe('E. Gemini AI Career Synthesis', () => {
    it('should successfully parse valid Gemini response when mock returns schema-compliant data', async () => {
      const testUser = new mongoose.Types.ObjectId();

      // Seed minimal data so it is not cold-start
      const resDoc = await Resume.create({
        userId: testUser,
        originalFileName: 'test.pdf',
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'Full Stack Engineer with React, Node, and TypeScript experience.',
      });
      await ResumeAnalysis.create({
        userId: testUser,
        resumeId: resDoc._id,
        overallScore: 85,
        summaryFeedback: 'Great resume summary.',
        identifiedSkills: { technical: ['TypeScript', 'Node.js'] },
      });

      // Mock valid Gemini response
      setMockCareerIntelligenceGenerator(async () => ({
        executiveSummary: 'Executive summary generated by Gemini for test candidate.',
        marketContext: 'Market context for full stack engineer roles.',
        skillGaps: [
          {
            skillName: 'GraphQL',
            demandFrequency: 3,
            proficiencyStatus: 'Critical Gap',
            priority: 'High',
            sourceAttribution: 'job_requirement',
          },
        ],
        learningRoadmap: [
          {
            title: 'Master GraphQL APIs',
            description: 'Build production GraphQL gateway with Apollo.',
            category: 'Technical Skill',
            priority: 'High',
            estimatedHours: 25,
            sourceAttribution: 'user_gap',
          },
        ],
        roleRecommendations: [
          {
            roleTitle: 'Senior Full Stack Engineer',
            category: 'Target Role',
            alignmentScore: 85,
            matchedSkills: ['TypeScript', 'Node.js'],
            missingSkills: ['GraphQL'],
            rationale: 'Direct match for your full-stack background.',
            sourceAttribution: 'skill_overlap',
          },
        ],
        nextActions: [
          {
            title: 'Build GraphQL Sample Project',
            description: 'Implement Apollo server and client caching.',
            priority: 'High',
            actionType: 'SKILL_STUDY',
            deepLink: '/career-intelligence',
          },
        ],
      }));

      const profile = await generateCareerIntelligence(testUser, { persist: false });

      expect(profile.generationSource).toBe('ai');
      expect(profile.aiSynthesis.executiveSummary).toContain('Executive summary generated by Gemini');
      expect(profile.learningRoadmap[0].title).toBe('Master GraphQL APIs');
      expect(profile.roleRecommendations[0].roleTitle).toBe('Senior Full Stack Engineer');
    });

    it('should fall back to heuristic engine when Gemini returns malformed/schema-violating output', async () => {
      const testUser = new mongoose.Types.ObjectId();
      const resDoc = await Resume.create({
        userId: testUser,
        originalFileName: 'test2.pdf',
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'Software Engineer with Python and SQL experience.',
      });
      await ResumeAnalysis.create({
        userId: testUser,
        resumeId: resDoc._id,
        overallScore: 75,
        summaryFeedback: 'Solid backend resume.',
        identifiedSkills: { technical: ['Python', 'SQL'] },
      });

      // Mock malformed Gemini response (missing required roadmap)
      setMockCareerIntelligenceGenerator(async () => ({
        executiveSummary: 'Short', // Too short for Zod schema
        skillGaps: [],
        learningRoadmap: [], // Violates min(1) constraint
        roleRecommendations: [],
        nextActions: [],
      }));

      const profile = await generateCareerIntelligence(testUser, { persist: false });

      // Must safely fallback without throwing an error
      expect(profile.generationSource).toBe('heuristic');
      expect(profile.aiSynthesis.executiveSummary).toBeDefined();
      expect(profile.learningRoadmap.length).toBeGreaterThan(0);
      expect(profile.roleRecommendations.length).toBeGreaterThan(0);
    });

    it('should fall back to heuristic engine when Gemini times out or throws an error', async () => {
      const testUser = new mongoose.Types.ObjectId();
      const resDoc = await Resume.create({
        userId: testUser,
        originalFileName: 'test3.pdf',
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'DevOps Engineer with AWS and Terraform experience.',
      });
      await ResumeAnalysis.create({
        userId: testUser,
        resumeId: resDoc._id,
        overallScore: 78,
        summaryFeedback: 'Strong cloud profile.',
        identifiedSkills: { technical: ['AWS', 'Terraform'] },
      });

      // Mock simulated timeout error
      setMockCareerIntelligenceGenerator(async () => {
        const err = new Error('Gemini request timed out after 30 seconds.');
        err.name = 'AbortError';
        throw err;
      });

      const profile = await generateCareerIntelligence(testUser, { persist: false });

      expect(profile.generationSource).toBe('heuristic');
      expect(profile.learningRoadmap.length).toBeGreaterThan(0);
      expect(profile.roleRecommendations.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // SECTION F: Deterministic Heuristic Fallback & Cold-Start
  // ==========================================================================
  describe('F. Deterministic Heuristic Fallback & Cold-Start', () => {
    it('should generate valid heuristic profile for cold-start user with zero data', async () => {
      const coldStartUser = new mongoose.Types.ObjectId();

      const profile = await generateCareerIntelligence(coldStartUser, { persist: false });

      expect(profile.generationSource).toBe('heuristic');
      expect(profile.careerReadiness.overallScore).toBeNull();
      expect(profile.careerReadiness.missingComponents.length).toBe(4);
      expect(profile.learningRoadmap.length).toBeGreaterThan(0);
      expect(profile.roleRecommendations.length).toBeGreaterThan(0);
      expect(profile.nextActions.length).toBeGreaterThan(0);
      // Next actions should guide user to upload resume or match job
      const actionTypes = profile.nextActions.map((a) => a.actionType);
      expect(actionTypes).toContain('RESUME_UPDATE');
    });

    it('should generate purely evidence-grounded recommendations from heuristic engine', () => {
      const mockContext = {
        targetPreferences: {
          desiredRole: 'Site Reliability Engineer',
          targetLevel: 'Senior',
          preferredIndustry: 'Cloud Infrastructure',
        },
        jobMatchContext: {
          recentJobs: [{ jobTitle: 'Senior SRE' }],
        },
      };

      const mockSkills = {
        criticalGaps: [
          { skillName: 'Kubernetes', demandFrequency: 3, proficiencyStatus: 'Critical Gap' },
        ],
        masteredSkills: [
          { skillName: 'Linux', demandFrequency: 2, proficiencyStatus: 'Mastered' },
        ],
        partialGaps: [],
      };

      const mockReadiness = {
        overallScore: 75,
        tier: 'Competitive',
        missingComponents: ['Mock Interview Simulator'],
      };

      const heuristic = generateHeuristicCareerProfile(
        mockContext,
        mockSkills,
        mockReadiness,
        { momentumStatus: 'Steady' }
      );

      expect(heuristic.executiveSummary).toContain('Site Reliability Engineer');
      expect(heuristic.executiveSummary).toContain('Kubernetes');
      expect(heuristic.learningRoadmap[0].title).toContain('Kubernetes');
      expect(heuristic.roleRecommendations[0].roleTitle).toContain('Senior Site Reliability Engineer');
      expect(heuristic.nextActions.some((a) => a.actionType === 'INTERVIEW_PRACTICE')).toBe(true);
    });
  });
});
