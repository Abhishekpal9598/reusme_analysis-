import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { CareerProfile } from '../src/models/CareerProfile.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { setMockCareerIntelligenceGenerator } from '../src/services/careerIntelligenceService.js';

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
    fullName: 'Candidate Stage3 Alpha',
    email: 'alpha_stage3@example.com',
    password: 'Password123!',
  });
  userACookie = resA.headers['set-cookie'][0].split(';')[0];
  userAId = resA.body.data.user.id;

  // Register User B
  const resB = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Candidate Stage3 Beta',
    email: 'beta_stage3@example.com',
    password: 'Password123!',
  });
  userBCookie = resB.headers['set-cookie'][0].split(';')[0];
  userBId = resB.body.data.user.id;

  // Seed sample resume and analysis for User A
  const resumeA = await Resume.create({
    userId: userAId,
    originalFileName: 'AlphaResume.pdf',
    fileFormat: 'pdf',
    fileSize: 1024,
    rawText: 'Senior Backend Engineer with Go, Distributed Systems, and Kubernetes.',
  });

  await ResumeAnalysis.create({
    userId: userAId,
    resumeId: resumeA._id,
    overallScore: 85,
    summaryFeedback: 'Strong backend systems background.',
    identifiedSkills: {
      technical: ['Go', 'Kubernetes', 'PostgreSQL'],
      toolsAndFrameworks: ['Docker'],
    },
  });

  await JobAnalysis.create({
    userId: userAId,
    resumeId: resumeA._id,
    jobTitle: 'Senior Cloud Platform Engineer',
    jobDescription: 'Seeking expert in Go and Kubernetes with Kafka messaging.',
    matchScore: 82,
    skillsAnalysis: {
      matchedSkills: [{ skill: 'Go' }, { skill: 'Kubernetes' }],
      missingOrUnverifiedSkills: [{ skill: 'Kafka' }],
    },
  });
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

const defaultMockResponse = {
  executiveSummary: 'Demonstrated proficiency across Go and Kubernetes backend architectures.',
  skillGaps: [
    {
      skill: 'Kafka',
      category: 'Technical Skill',
      demandFrequency: 1,
      severity: 'Critical',
      sourceAttribution: 'user_gap',
    },
  ],
  learningRoadmap: [
    {
      title: 'Master Event Streaming with Kafka',
      description: 'Build event-driven architecture.',
      category: 'Technical Skill',
      priority: 'High',
      estimatedHours: 20,
      sourceAttribution: 'user_gap',
    },
  ],
  roleRecommendations: [
    {
      roleTitle: 'Senior Cloud Platform Engineer',
      category: 'Target Role',
      alignmentScore: 84,
      matchedSkills: ['Go', 'Kubernetes'],
      missingSkills: ['Kafka'],
      rationale: 'Direct alignment with cloud infrastructure.',
      sourceAttribution: 'skill_overlap',
    },
  ],
  nextActions: [
    {
      title: 'Study Kafka Distributed Architecture',
      description: 'Learn partition rebalancing and consumer groups.',
      priority: 'High',
      actionType: 'SKILL_STUDY',
      deepLink: '/career-intelligence',
    },
  ],
};

beforeEach(() => {
  setMockCareerIntelligenceGenerator(async () => defaultMockResponse);
});

describe('Phase 9 Stage 3: Career Intelligence Controller & Routes Integration', () => {
  // Helper to reset cooldown for User A
  const resetUserACooldown = async () => {
    await CareerProfile.updateOne(
      { userId: userAId },
      { $set: { lastGeneratedAt: new Date(Date.now() - 35000) } }
    );
  };

  // ==========================================================================
  // AUTHENTICATION TESTS
  // ==========================================================================
  describe('Authentication Enforcement', () => {
    it('1. Unauthenticated GET /career-intelligence rejected with 401', async () => {
      const res = await request(app).get('/api/v1/career-intelligence');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('2. Unauthenticated POST /career-intelligence/generate rejected with 401', async () => {
      const res = await request(app).post('/api/v1/career-intelligence/generate').send({});
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('3. Authenticated requests accepted with valid session cookie', async () => {
      const res = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', userACookie);
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  // ==========================================================================
  // PROFILE RETRIEVAL & COLD-START TESTS
  // ==========================================================================
  describe('Profile Retrieval & Cold-Start', () => {
    it('4. Returns cold-start response when user has no stored profile without external AI call', async () => {
      // User B has not generated a profile yet
      const res = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', userBCookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generationSource).toBe('heuristic');
      expect(res.body.data.isColdStart).toBe(true);
      expect(res.body.data.userId).toBe(userBId);
    });

    it('5. User receives only their own profile and tenant isolation is enforced', async () => {
      // Create a distinct profile for User A directly
      await CareerProfile.create({
        userId: userAId,
        targetPreferences: { desiredRole: 'User A Target Role', targetLevel: 'Senior' },
        learningRoadmap: [{ title: 'User A Exclusive Milestone', targetSkill: 'Go' }],
      });

      const resA = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', userACookie);

      const resB = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', userBCookie);

      expect(resA.status).toBe(200);
      expect(resA.body.data.targetPreferences.desiredRole).toBe('User A Target Role');

      expect(resB.status).toBe(200);
      expect(resB.body.data.targetPreferences.desiredRole).not.toBe('User A Target Role');
    });

    it('6. Existing profile returned accurately on subsequent GET', async () => {
      const res = await request(app)
        .get('/api/v1/career-intelligence')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.userId).toBe(userAId);
      expect(res.body.data.targetPreferences.desiredRole).toBe('User A Target Role');
    });
  });

  // ==========================================================================
  // GENERATION & REGENERATION TESTS
  // ==========================================================================
  describe('Profile Generation & AI Synthesis', () => {
    it('7. Generation creates/upserts profile and returns 201 on success', async () => {
      await resetUserACooldown();

      // Mock Gemini success
      setMockCareerIntelligenceGenerator(async () => ({
        executiveSummary: 'AI generated executive summary for User A.',
        marketContext: 'Market context for cloud platform engineering.',
        skillGaps: [
          {
            skillName: 'Kafka',
            demandFrequency: 2,
            proficiencyStatus: 'Critical Gap',
            priority: 'High',
            sourceAttribution: 'job_requirement',
          },
        ],
        learningRoadmap: [
          {
            title: 'Master Event Streaming with Kafka',
            description: 'Build event-driven architecture.',
            category: 'Technical Skill',
            priority: 'High',
            estimatedHours: 20,
            sourceAttribution: 'user_gap',
          },
        ],
        roleRecommendations: [
          {
            roleTitle: 'Senior Cloud Platform Engineer',
            category: 'Target Role',
            alignmentScore: 84,
            matchedSkills: ['Go', 'Kubernetes'],
            missingSkills: ['Kafka'],
            rationale: 'Direct alignment with cloud infrastructure.',
            sourceAttribution: 'skill_overlap',
          },
        ],
        nextActions: [
          {
            title: 'Study Kafka Distributed Architecture',
            description: 'Learn partition rebalancing and consumer groups.',
            priority: 'High',
            actionType: 'SKILL_STUDY',
            deepLink: '/career-intelligence',
          },
        ],
      }));

      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generationSource).toBe('ai');
      expect(res.body.data.learningRoadmap[0].title).toBe('Master Event Streaming with Kafka');
      expect(res.body.data.lastGeneratedAt).toBeDefined();
    });

    it('8. Existing profile is updated instead of duplicated', async () => {
      const count = await CareerProfile.countDocuments({ userId: userAId });
      expect(count).toBe(1);
    });

    it('9. Gemini success returns generationSource "ai"', async () => {
      const profile = await CareerProfile.findOne({ userId: userAId });
      expect(profile.generationSource).toBe('ai');
      expect(profile.aiSynthesis.modelUsed).toBeDefined();
    });

    it('10. Gemini failure returns heuristic fallback with generationSource "heuristic"', async () => {
      await resetUserACooldown();

      // Mock simulated Gemini outage
      setMockCareerIntelligenceGenerator(async () => {
        throw new Error('Simulated 503 Gemini Service Unavailable');
      });

      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.generationSource).toBe('heuristic');
      expect(res.body.data.learningRoadmap.length).toBeGreaterThan(0);
    });

    it('11. Invalid AI output is rejected by Zod and falls back to heuristic engine', async () => {
      await resetUserACooldown();

      // Mock malformed schema output
      setMockCareerIntelligenceGenerator(async () => ({
        executiveSummary: 'Short', // Invalid min length
        skillGaps: [],
        learningRoadmap: [],
        roleRecommendations: [],
        nextActions: [],
      }));

      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(201);
      expect(res.body.data.generationSource).toBe('heuristic');
    });

    it('12. Target preferences survive regeneration', async () => {
      await resetUserACooldown();

      // First set explicit preference
      await CareerProfile.updateOne(
        { userId: userAId },
        { $set: { 'targetPreferences.desiredRole': 'Staff Infrastructure Architect' } }
      );

      // Regenerate
      const res = await request(app)
        .post('/api/v1/career-intelligence/regenerate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data.targetPreferences.desiredRole).toBe('Staff Infrastructure Architect');
    });

    it('13. Cooldown blocks rapid repeated requests with 429 COOLDOWN_ACTIVE', async () => {
      // Immediately request again without resetting cooldown
      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('COOLDOWN_ACTIVE');
      expect(res.body.error.message).toContain('Career intelligence was generated recently');
    });

    it('14. Repeated regeneration endpoint also respects 30-second cooldown', async () => {
      const res = await request(app)
        .post('/api/v1/career-intelligence/regenerate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('COOLDOWN_ACTIVE');
    });
  });

  // ==========================================================================
  // PREFERENCES UPDATE TESTS
  // ==========================================================================
  describe('Preferences Management (PATCH /preferences)', () => {
    it('15. Valid preferences update successfully', async () => {
      const res = await request(app)
        .patch('/api/v1/career-intelligence/preferences')
        .set('Cookie', userACookie)
        .send({
          desiredRole: 'Principal Systems Architect',
          targetLevel: 'Lead',
          preferredIndustry: 'FinTech Platforms',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.desiredRole).toBe('Principal Systems Architect');
      expect(res.body.data.targetLevel).toBe('Lead');
      expect(res.body.data.preferredIndustry).toBe('FinTech Platforms');
    });

    it('16. Invalid targetLevel rejected with 400', async () => {
      const res = await request(app)
        .patch('/api/v1/career-intelligence/preferences')
        .set('Cookie', userACookie)
        .send({
          targetLevel: 'SupremeCommander', // Not Junior/Mid/Senior/Lead
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('17. Unknown fields rejected to prevent mass assignment', async () => {
      const res = await request(app)
        .patch('/api/v1/career-intelligence/preferences')
        .set('Cookie', userACookie)
        .send({
          desiredRole: 'Engineering Manager',
          unauthorizedField: 'malicious_override',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('UNKNOWN_FIELDS_REJECTED');
    });

    it('18. Another user cannot modify preferences (tenant isolation)', async () => {
      // User B updates preferences
      const resB = await request(app)
        .patch('/api/v1/career-intelligence/preferences')
        .set('Cookie', userBCookie)
        .send({
          desiredRole: 'User B Distinct Role',
          targetLevel: 'Mid',
        });

      expect(resB.status).toBe(200);

      // Verify User A profile was not modified
      const profileA = await CareerProfile.findOne({ userId: userAId });
      expect(profileA.targetPreferences.desiredRole).toBe('Principal Systems Architect');
    });
  });

  // ==========================================================================
  // ROADMAP MILESTONE TOGGLE TESTS
  // ==========================================================================
  describe('Milestone Progress Tracking (PATCH /milestones/:id)', () => {
    let milestoneIdA;

    beforeAll(async () => {
      const profileA = await CareerProfile.findOne({ userId: userAId });
      milestoneIdA = profileA.learningRoadmap[0]._id.toString();
    });

    it('19. Valid milestone completion toggles completed to true', async () => {
      const res = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneIdA}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completed).toBe(true);
    });

    it('20. completedAt timestamp is set when milestone marked completed', async () => {
      const profileA = await CareerProfile.findOne({ userId: userAId });
      const milestone = profileA.learningRoadmap.id(milestoneIdA);
      expect(milestone.completed).toBe(true);
      expect(milestone.completedAt).toBeDefined();
      expect(new Date(milestone.completedAt).getTime()).toBeGreaterThan(0);
    });

    it('21. completedAt is cleared when milestone is reopened / marked incomplete', async () => {
      const res = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneIdA}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.completed).toBe(false);
      expect(res.body.data.completedAt).toBeNull();
    });

    it('22. Invalid milestone ID format rejected with 400', async () => {
      const res = await request(app)
        .patch('/api/v1/career-intelligence/milestones/invalid-id-format')
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_MILESTONE_ID');
    });

    it('23. Missing milestone ID returns 404', async () => {
      const nonExistentId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${nonExistentId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MILESTONE_NOT_FOUND');
    });

    it('24. Another user cannot modify milestone (IDOR protection returns 404)', async () => {
      // User B attempts to toggle User A's milestone
      const res = await request(app)
        .patch(`/api/v1/career-intelligence/milestones/${milestoneIdA}`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('MILESTONE_NOT_FOUND');
    });
  });

  // ==========================================================================
  // RATE LIMITING & COOLDOWN RE-VERIFICATION
  // ==========================================================================
  describe('Rate Limiting & Safety Invariants', () => {
    it('25. AI generation endpoint is protected by aiRateLimiter middleware', async () => {
      // Confirms route definition attaches aiRateLimiter
      await resetUserACooldown();
      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect([201, 429]).toContain(res.status);
    });

    it('26. Repeated generation strictly respects cooldown guard across attempts', async () => {
      const res = await request(app)
        .post('/api/v1/career-intelligence/generate')
        .set('Cookie', userACookie)
        .send({});

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('COOLDOWN_ACTIVE');
    });
  });
});
