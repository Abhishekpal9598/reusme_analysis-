import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import {
  CareerProfile,
  Resume,
  ResumeAnalysis,
  JobAnalysis,
  InterviewSession,
  Application,
  User,
} from '../src/models/index.js';
import {
  calculateCareerReadinessIndex,
} from '../src/validators/careerIntelligenceValidators.js';
import {
  setMockCareerIntelligenceGenerator,
} from '../src/services/careerIntelligenceService.js';
import {
  computeWeeklyMomentum,
} from '../src/services/careerIntelligenceContextService.js';

let mongoServer;
let userACookie;
let userBCookie;
let userAId;
let userBId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
  await CareerProfile.init();

  // Register User A
  const resA = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Candidate Stage5 Alpha',
    email: 'alpha_stage5@example.com',
    password: 'Password123!',
  });
  userACookie = resA.headers['set-cookie'][0].split(';')[0];
  userAId = resA.body.data.user.id;

  // Register User B
  const resB = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Candidate Stage5 Beta',
    email: 'beta_stage5@example.com',
    password: 'Password123!',
  });
  userBCookie = resB.headers['set-cookie'][0].split(';')[0];
  userBId = resB.body.data.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

beforeEach(() => {
  setMockCareerIntelligenceGenerator(null);
});

describe('Phase 9 Stage 5: End-to-End Integration, QA & Production Readiness Audit', () => {
  // ==========================================================================
  // SCENARIO A: BRAND-NEW USER
  // ==========================================================================
  describe('Scenario A: Brand-New User (Cold Start & Preferences)', () => {
    let freshUserCookie;
    let freshUserId;

    beforeAll(async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Brand New User',
        email: 'brandnew_stage5@example.com',
        password: 'Password123!',
      });
      freshUserCookie = res.headers['set-cookie'][0].split(';')[0];
      freshUserId = res.body.data.user.id;
    });

    it('returns a cold-start profile without triggering AI generation', async () => {
      const res = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', freshUserCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isColdStart).toBe(true);
      expect(res.body.data.generationSource).toBe('heuristic');
    });

    it('CRI is strictly null (not 0) and missing components are clearly explained', async () => {
      const res = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', freshUserCookie);

      const { careerReadiness } = res.body.data;
      expect(careerReadiness.overallScore).toBeNull();
      expect(careerReadiness.availableDimensions).toEqual([]);
      expect(careerReadiness.missingComponents).toContain('Resume Analysis');
      expect(careerReadiness.missingComponents).toContain('Job Description Matching');
      expect(careerReadiness.missingComponents).toContain('Mock Interview Simulator');
      expect(careerReadiness.missingComponents).toContain('Job Application Tracker');
    });

    it('user enters career preferences and they persist across refreshes', async () => {
      // 1. Update preferences
      const updateRes = await request(app)
        .patch('/api/v1/career-intelligence/preferences')
        .set('Cookie', freshUserCookie)
        .send({
          desiredRole: 'Full Stack Engineer',
          targetLevel: 'Mid',
          preferredIndustry: 'Cloud Platforms',
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.desiredRole).toBe('Full Stack Engineer');

      // 2. Fetch profile again
      const fetchRes = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', freshUserCookie);

      expect(fetchRes.status).toBe(200);
      expect(fetchRes.body.data.targetPreferences.desiredRole).toBe('Full Stack Engineer');
      expect(fetchRes.body.data.targetPreferences.targetLevel).toBe('Mid');
      expect(fetchRes.body.data.targetPreferences.preferredIndustry).toBe('Cloud Platforms');
    });
  });

  // ==========================================================================
  // SCENARIO B: USER WITH RESUME
  // ==========================================================================
  describe('Scenario B: User with Ingested Resume', () => {
    let resumeUserCookie;
    let resumeUserId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Resume User',
        email: 'resume_stage5@example.com',
        password: 'Password123!',
      });
      resumeUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      resumeUserId = regRes.body.data.user.id;

      // Seed resume and analysis
      const resume = await Resume.create({
        userId: resumeUserId,
        originalFileName: 'ResumeB.pdf',
        fileFormat: 'pdf',
        fileSize: 2048,
        rawText: 'Expert Python, Django, Docker, and PostgreSQL developer.',
      });

      await ResumeAnalysis.create({
        userId: resumeUserId,
        resumeId: resume._id,
        overallScore: 88,
        summaryFeedback: 'Exceptional backend capabilities with Python.',
        identifiedSkills: {
          technical: ['Python', 'Django', 'PostgreSQL'],
          toolsAndFrameworks: ['Docker'],
        },
      });
    });

    it('calculates CRI using actual resume analysis data and identifies mastered skills', async () => {
      // Trigger generation
      const genRes = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', resumeUserCookie)
        .send({});

      expect(genRes.status).toBe(201);
      const profile = genRes.body.data;

      // ResumeQuality dimension must be 88
      expect(profile.careerReadiness.resumeQuality).toBe(88);
      expect(profile.careerReadiness.availableDimensions).toContain('resumeQuality');
      // With only resume available, CRI overall score equals resume score (88)
      expect(profile.careerReadiness.overallScore).toBe(88);

      // Mastered skills must contain Python, Django, Docker, PostgreSQL
      const masteredNames = profile.skillAnalysis.masteredSkills.map((s) => s.skillName);
      expect(masteredNames).toContain('Python');
      expect(masteredNames).toContain('PostgreSQL');

      // Persistence check: exactly one document in MongoDB
      const docCount = await CareerProfile.countDocuments({ userId: resumeUserId });
      expect(docCount).toBe(1);
    });
  });

  // ==========================================================================
  // SCENARIO C: USER WITH JOB MATCHES
  // ==========================================================================
  describe('Scenario C: User with Job Matches', () => {
    let jobUserCookie;
    let jobUserId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Job Match User',
        email: 'jobmatch_stage5@example.com',
        password: 'Password123!',
      });
      jobUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      jobUserId = regRes.body.data.user.id;

      const resume = await Resume.create({
        userId: jobUserId,
        originalFileName: 'CandidateC.pdf',
        fileFormat: 'pdf',
        fileSize: 1024,
        rawText: 'Frontend Developer with React, TypeScript, and Tailwind CSS.',
      });

      await ResumeAnalysis.create({
        userId: jobUserId,
        resumeId: resume._id,
        overallScore: 75,
        summaryFeedback: 'Strong modern frontend fundamentals.',
        identifiedSkills: {
          technical: ['React', 'TypeScript', 'Tailwind CSS'],
          toolsAndFrameworks: [],
        },
      });

      // Job Match 1
      await JobAnalysis.create({
        userId: jobUserId,
        resumeId: resume._id,
        jobTitle: 'Senior React Developer',
        jobDescription: 'Requires React, TypeScript, and Next.js, with GraphQL.',
        matchScore: 78,
        skillsAnalysis: {
          matchedSkills: [{ skill: 'React' }, { skill: 'TypeScript' }],
          missingOrUnverifiedSkills: [{ skill: 'Next.js' }, { skill: 'GraphQL' }],
        },
      });

      // Job Match 2 (Next.js demanded again to make it a critical gap)
      await JobAnalysis.create({
        userId: jobUserId,
        resumeId: resume._id,
        jobTitle: 'Fullstack Next.js Specialist',
        jobDescription: 'Demands deep Next.js performance tuning and GraphQL.',
        matchScore: 65,
        skillsAnalysis: {
          matchedSkills: [{ skill: 'React' }],
          missingOrUnverifiedSkills: [{ skill: 'Next.js' }],
        },
      });
    });

    it('synthesizes critical and partial gaps from actual job analysis records', async () => {
      const genRes = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', jobUserCookie)
        .send({});

      expect(genRes.status).toBe(201);
      const profile = genRes.body.data;

      // Available dimensions should include resumeQuality and jobFitAlignment
      expect(profile.careerReadiness.availableDimensions).toContain('resumeQuality');
      expect(profile.careerReadiness.availableDimensions).toContain('jobFitAlignment');

      // Next.js demanded twice, missing twice -> Critical Gap
      const criticalNames = profile.skillAnalysis.criticalGaps.map((s) => s.skillName);
      expect(criticalNames).toContain('Next.js');

      // React matched -> Mastered Skill
      const masteredNames = profile.skillAnalysis.masteredSkills.map((s) => s.skillName);
      expect(masteredNames).toContain('React');
    });
  });

  // ==========================================================================
  // SCENARIO D: MOCK INTERVIEWS (EXCLUDING INCOMPLETE SESSIONS)
  // ==========================================================================
  describe('Scenario D: Mock Interview User', () => {
    let interviewUserCookie;
    let interviewUserId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Interview User',
        email: 'interview_stage5@example.com',
        password: 'Password123!',
      });
      interviewUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      interviewUserId = regRes.body.data.user.id;

      // Completed Session 1 (score 80)
      await InterviewSession.create({
        userId: interviewUserId,
        jobRole: 'Systems Engineer',
        experienceLevel: 'Mid',
        status: 'completed',
        overallScore: 80,
        overallReport: { overallScore: 80 },
        questions: [],
      });

      // Incomplete Session 2 (status: 'in_progress', score 40)
      await InterviewSession.create({
        userId: interviewUserId,
        jobRole: 'Systems Engineer',
        experienceLevel: 'Mid',
        status: 'in_progress',
        overallScore: 40,
        overallReport: { overallScore: 40 },
        questions: [],
      });
    });

    it('counts completed interview sessions only, excluding in-progress sessions', async () => {
      const genRes = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', interviewUserCookie)
        .send({});

      expect(genRes.status).toBe(201);
      const profile = genRes.body.data;

      // Interview mastery score must be 80 (not average of 80 and 40)
      expect(profile.careerReadiness.interviewMastery).toBe(80);
      expect(profile.weeklyMomentum.interviewsCompleted).toBe(1);
    });
  });

  // ==========================================================================
  // SCENARIO E: APPLICATION TRACKER & 7-DAY MOMENTUM BOUNDARIES
  // ==========================================================================
  describe('Scenario E: Application Tracker & UTC Momentum Window', () => {
    let appUserCookie;
    let appUserId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Application User',
        email: 'apps_stage5@example.com',
        password: 'Password123!',
      });
      appUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      appUserId = regRes.body.data.user.id;

      // Recent application (within 7 days)
      await Application.create({
        userId: appUserId,
        companyName: 'Stripe',
        positionTitle: 'Backend Engineer',
        status: 'Interview',
      });

      // Historical application (older than 10 days)
      const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);
      const oldApp = new Application({
        userId: appUserId,
        companyName: 'Legacy Corp',
        positionTitle: 'Software Engineer',
        status: 'Applied',
        createdAt: oldDate,
        updatedAt: oldDate,
      });
      await oldApp.save({ timestamps: false });
    });

    it('includes active pipeline in health score and excludes activity outside 7-day UTC window', async () => {
      const momentum = await computeWeeklyMomentum(appUserId);

      // Only the recent application is counted in applicationsAdvanced
      expect(momentum.applicationsAdvanced).toBe(1);
      expect(momentum.momentumStatus).toBe('Steady');
    });
  });

  // ==========================================================================
  // SCENARIO F: ROADMAP MILESTONES & PERSISTENCE
  // ==========================================================================
  describe('Scenario F: Roadmap Milestone Toggling and IDOR Security', () => {
    let milestoneUserCookie;
    let milestoneUserId;
    let milestoneId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Milestone User',
        email: 'milestone_stage5@example.com',
        password: 'Password123!',
      });
      milestoneUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      milestoneUserId = regRes.body.data.user.id;

      // Generate profile for milestone user
      const genRes = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', milestoneUserCookie)
        .send({});

      milestoneId = genRes.body.data.learningRoadmap[0]._id;

      // Also ensure User B has a profile
      await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userBCookie)
        .send({});
    });

    it('marking milestone completed sets completed=true and populates completedAt', async () => {
      const patchRes = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneId}`)
        .set('Cookie', milestoneUserCookie);

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.completed).toBe(true);
      expect(patchRes.body.data.completedAt).toBeDefined();
      expect(new Date(patchRes.body.data.completedAt).getTime()).toBeGreaterThan(0);
    });

    it('toggling milestone again clears completedAt to null and sets completed=false', async () => {
      const reopenRes = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneId}`)
        .set('Cookie', milestoneUserCookie);

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.completed).toBe(false);
      expect(reopenRes.body.data.completedAt).toBeNull();
    });

    it('IDOR protection: another user cannot toggle milestone (returns 404)', async () => {
      const idorRes = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneId}`)
        .set('Cookie', userBCookie);

      expect(idorRes.status).toBe(404);
      expect(idorRes.body.error.code).toBe('MILESTONE_NOT_FOUND');
    });
  });

  // ==========================================================================
  // SCENARIO G: GEMINI SERVICE UNAVAILABILITY & HEURISTIC FALLBACK
  // ==========================================================================
  describe('Scenario G: Gemini Outage and Heuristic Graceful Fallback', () => {
    let outageUserCookie;
    let outageUserId;

    beforeAll(async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        fullName: 'Outage User',
        email: 'outage_stage5@example.com',
        password: 'Password123!',
      });
      outageUserCookie = regRes.headers['set-cookie'][0].split(';')[0];
      outageUserId = regRes.body.data.user.id;
    });

    it('falls back seamlessly to heuristic engine when Gemini service throws 503 outage', async () => {
      setMockCareerIntelligenceGenerator(async () => {
        const err = new Error('Simulated 503 Google Gemini Unavailable');
        err.status = 503;
        throw err;
      });

      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', outageUserCookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generationSource).toBe('heuristic');
      expect(res.body.data.learningRoadmap.length).toBeGreaterThan(0);
      expect(res.body.data.roleRecommendations.length).toBeGreaterThan(0);
    });

    it('falls back seamlessly to heuristic engine when Gemini returns malformed JSON schema', async () => {
      // Cooldown reset
      await CareerProfile.updateOne(
        { userId: outageUserId },
        { $set: { lastGeneratedAt: new Date(Date.now() - 35000) } }
      );

      setMockCareerIntelligenceGenerator(async () => ({
        corruptedPayload: true,
      }));

      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', outageUserCookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.generationSource).toBe('heuristic');
    });
  });

  // ==========================================================================
  // SCENARIO H: MATHEMATICAL AUDIT OF CAREER READINESS INDEX (CRI)
  // ==========================================================================
  describe('Scenario H: Mathematical CRI Rubric & Weight Proportionality', () => {
    it('1. All four dimensions present: Resume(25%) + JobFit(30%) + Interview(25%) + Application(20%)', () => {
      // Input: 80, 70, 90, 60
      // Weighted: (80*0.25) + (70*0.30) + (90*0.25) + (60*0.20) = 20 + 21 + 22.5 + 12 = 75.5 -> rounds to 76
      const result = calculateCareerReadinessIndex({
        resumeQuality: 80,
        jobFitAlignment: 70,
        interviewMastery: 90,
        applicationPipeline: 60,
      });

      expect(result.overallScore).toBe(76);
      expect(result.availableDimensions.length).toBe(4);
      expect(result.weightsUsed.resumeQuality).toBeCloseTo(0.25, 2);
      expect(result.weightsUsed.jobFitAlignment).toBeCloseTo(0.30, 2);
      expect(result.weightsUsed.interviewMastery).toBeCloseTo(0.25, 2);
      expect(result.weightsUsed.applicationPipeline).toBeCloseTo(0.20, 2);
    });

    it('2. Only resume quality present: normalized weight becomes 1.0 (100%)', () => {
      const result = calculateCareerReadinessIndex({
        resumeQuality: 84,
        jobFitAlignment: null,
        interviewMastery: null,
        applicationPipeline: null,
      });

      expect(result.overallScore).toBe(84);
      expect(result.availableDimensions).toEqual(['resumeQuality']);
      expect(result.weightsUsed.resumeQuality).toBe(1.0);
    });

    it('3. Resume (25%) and JobFit (30%) present: normalized weights 25/55 and 30/55', () => {
      // Score: resume=100, jobFit=50
      // Proportional: 100 * (25/55) + 50 * (30/55) = (2500 + 1500) / 55 = 4000 / 55 = 72.727 -> 73
      const result = calculateCareerReadinessIndex({
        resumeQuality: 100,
        jobFitAlignment: 50,
      });

      expect(result.overallScore).toBe(73);
      expect(result.weightsUsed.resumeQuality).toBeCloseTo(25 / 55, 3);
      expect(result.weightsUsed.jobFitAlignment).toBeCloseTo(30 / 55, 3);
    });

    it('4. Missing interview dimension: remaining weights 25+30+20 = 75 normalized to 100', () => {
      const result = calculateCareerReadinessIndex({
        resumeQuality: 80,
        jobFitAlignment: 80,
        interviewMastery: null,
        applicationPipeline: 80,
      });

      expect(result.overallScore).toBe(80);
      expect(result.availableDimensions).not.toContain('interviewMastery');
    });

    it('5. Missing application dimension: remaining weights 25+30+25 = 80 normalized to 100', () => {
      const result = calculateCareerReadinessIndex({
        resumeQuality: 70,
        jobFitAlignment: 70,
        interviewMastery: 70,
        applicationPipeline: null,
      });

      expect(result.overallScore).toBe(70);
      expect(result.availableDimensions).not.toContain('applicationPipeline');
    });

    it('6. Genuine zero score is mathematically valid (returns 0, not null)', () => {
      const result = calculateCareerReadinessIndex({
        resumeQuality: 0,
      });

      expect(result.overallScore).toBe(0);
      expect(result.overallScore).not.toBeNull();
    });

    it('7. All dimensions unavailable: overallScore is strictly null', () => {
      const result = calculateCareerReadinessIndex({});

      expect(result.overallScore).toBeNull();
      expect(result.availableDimensions).toEqual([]);
      expect(result.weightsUsed).toEqual({});
    });
  });
});
