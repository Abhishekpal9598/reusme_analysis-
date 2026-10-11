import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Resume } from '../src/models/Resume.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import {
  setMockJobMatchGenerator,
} from '../src/services/jobMatchService.js';
import {
  calculateOverallMatchScore,
  MATCH_DISCLAIMER,
} from '../src/validators/jobMatchValidators.js';
import { GeminiServiceError } from '../src/services/geminiService.js';

let mongoServer;
let userAAuthCookie;
let userBAuthCookie;
let userAId;
let userBId;
let userAResumeId;
let userBResumeId;

const validMockJobMatchResponse = {
  dimensionScores: {
    skillsAlignment: {
      score: 85,
      explanation: 'Candidate possesses core requirements including React, TypeScript, and Node.js.',
    },
    experienceAlignment: {
      score: 75,
      explanation: 'Demonstrated mid-to-senior experience in web frontend architectures.',
    },
    educationAlignment: {
      score: 90,
      explanation: 'Bachelor degree in computer science matches role expectation.',
    },
    responsibilityAlignment: {
      score: 80,
      explanation: 'Track record in leading UI component delivery matches job duties.',
    },
  },
  skills: {
    matchedSkills: [
      {
        skill: 'React.js',
        evidenceFromResume: 'Built 15+ reusable React components',
        importance: 'required',
      },
      {
        skill: 'TypeScript',
        evidenceFromResume: 'Developed frontend codebase in TypeScript',
        importance: 'required',
      },
    ],
    missingOrUnverifiedSkills: [
      {
        skill: 'GraphQL',
        rationale: 'No mention of Apollo Client or GraphQL schema design in resume.',
        criticality: 'critical',
      },
    ],
    partiallyMatchedSkills: [
      {
        skill: 'CI/CD Pipelines',
        resumeContext: 'Used GitHub for version control',
        jobRequirement: 'Automated CI/CD deployment with GitHub Actions',
        gapExplanation: 'Familiar with Git but automated workflow configuration is not explicit.',
      },
    ],
  },
  experience: {
    relevantExperience: ['3+ years in React SPA design and REST API integrations.'],
    experienceGaps: ['Lacks explicit high-scale distributed system monitoring examples.'],
    evidenceFromResume: ['Architected microservices with Node.js and MongoDB.'],
  },
  educationAndCertifications: {
    relevantMatches: ['BS in Computer Science'],
    unmetOrUnverifiedRequirements: ['AWS Certified Solutions Architect (preferred)'],
  },
  recommendations: {
    priorityImprovements: ['Highlight GraphQL or REST query optimizations in project descriptions.'],
    resumeTailoringSuggestions: ['Incorporate CI/CD automation keywords in recent experience bullet.'],
    relevantKeywordsToConsider: ['GraphQL', 'Apollo Client', 'GitHub Actions', 'Jest'],
  },
  summaryAssessment:
    'Strong 81% semantic match. Candidate aligns closely on core frontend tech stack, with minor gaps in GraphQL and CI/CD automation.',
};

describe('Phase 6: Job Description Matcher Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Candidate Alpha',
        email: 'jobmatch_alpha@example.com',
        password: 'Password123!',
      });
    expect(resA.status).toBe(201);
    userAAuthCookie = resA.headers['set-cookie'][0].split(';')[0];
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Candidate Beta',
        email: 'jobmatch_beta@example.com',
        password: 'Password123!',
      });
    expect(resB.status).toBe(201);
    userBAuthCookie = resB.headers['set-cookie'][0].split(';')[0];
    userBId = resB.body.data.user.id;

    // Create User A Resume
    const resumeA = await Resume.create({
      userId: userAId,
      originalFileName: 'Alpha_FullStack.pdf',
      fileFormat: 'pdf',
      fileSize: 2048,
      rawText:
        'Candidate Alpha\nFull Stack Engineer\nExperience: Built 15+ reusable React components. Developed frontend codebase in TypeScript. Architected microservices with Node.js.\nEducation: BS in Computer Science.',
      wordCount: 30,
      characterCount: 220,
    });
    userAResumeId = resumeA._id.toString();

    // Create User B Resume
    const resumeB = await Resume.create({
      userId: userBId,
      originalFileName: 'Beta_PythonDev.pdf',
      fileFormat: 'pdf',
      fileSize: 2048,
      rawText:
        'Candidate Beta\nPython Backend Engineer\nExperience: Django, Flask, PostgreSQL databases.',
      wordCount: 15,
      characterCount: 100,
    });
    userBResumeId = resumeB._id.toString();
  }, 30000);

  afterAll(async () => {
    setMockJobMatchGenerator(null);
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    setMockJobMatchGenerator(async () => JSON.stringify(validMockJobMatchResponse));
  });

  describe('Deterministic Match Scoring Formula Verification', () => {
    it('should compute exact weighted score: 40% skills + 30% experience + 15% education + 15% responsibility', () => {
      // 0.40*85 + 0.30*75 + 0.15*90 + 0.15*80
      // = 34 + 22.5 + 13.5 + 12 = 82
      const score = calculateOverallMatchScore(validMockJobMatchResponse.dimensionScores);
      expect(score).toBe(82);
    });

    it('should clamp match score between 0 and 100', () => {
      const minScores = {
        skillsAlignment: { score: 0 },
        experienceAlignment: { score: 0 },
        educationAlignment: { score: 0 },
        responsibilityAlignment: { score: 0 },
      };
      expect(calculateOverallMatchScore(minScores)).toBe(0);

      const maxScores = {
        skillsAlignment: { score: 100 },
        experienceAlignment: { score: 100 },
        educationAlignment: { score: 100 },
        responsibilityAlignment: { score: 100 },
      };
      expect(calculateOverallMatchScore(maxScores)).toBe(100);
    });
  });

  describe('Job Matching API (POST /api/v1/job-matches)', () => {
    const validPayload = {
      resumeId: '', // populated dynamically
      jobTitle: 'Senior Frontend Engineer',
      companyName: 'Stripe',
      jobDescription:
        'We are seeking a Senior Frontend Engineer with 4+ years of React, TypeScript, GraphQL, CI/CD, and performance optimization experience to lead key user checkout flows.',
    };

    it('should reject unauthenticated request with 401', async () => {
      const res = await request(app)
        .post('/api/v1/job-matches')
        .send({ ...validPayload, resumeId: userAResumeId });

      expect(res.status).toBe(401);
    });

    it('should reject request with missing or short job description (<20 chars) with 400', async () => {
      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          resumeId: userAResumeId,
          jobDescription: 'Short JD',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject request with excessively long job description (>20,000 chars) with 400', async () => {
      const hugeJD = 'A'.repeat(20005);
      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          resumeId: userAResumeId,
          jobDescription: hugeJD,
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject cross-user IDOR attempt with 404 (User A cannot match against User B resume)', async () => {
      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          ...validPayload,
          resumeId: userBResumeId,
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    });

    it('should successfully run job match analysis, persist in DB, and return structured report', async () => {
      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          ...validPayload,
          resumeId: userAResumeId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.disclaimer).toBe(MATCH_DISCLAIMER);

      const match = res.body.data.jobAnalysis;
      expect(match).toBeDefined();
      expect(match.jobTitle).toBe('Senior Frontend Engineer');
      expect(match.companyName).toBe('Stripe');
      expect(match.matchScore).toBe(82);
      expect(match.dimensionScores.skillsAlignment.score).toBe(85);
      expect(match.dimensionScores.experienceAlignment.score).toBe(75);
      expect(match.skillsAnalysis.matchedSkills).toHaveLength(2);
      expect(match.skillsAnalysis.missingOrUnverifiedSkills).toHaveLength(1);
      expect(match.skillsAnalysis.partiallyMatchedSkills).toHaveLength(1);
      expect(match.recommendations.priorityImprovements).toHaveLength(1);

      // Verify DB record
      const dbMatch = await JobAnalysis.findById(match.id);
      expect(dbMatch).not.toBeNull();
      expect(dbMatch.userId.toString()).toBe(userAId);
      expect(dbMatch.resumeId.toString()).toBe(userAResumeId);
      expect(dbMatch.matchScore).toBe(82);
    });

    it('should handle malformed JSON from Gemini and return 422', async () => {
      setMockJobMatchGenerator(async () => '<<<NOT_JSON_OUTPUT>>>');

      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          ...validPayload,
          resumeId: userAResumeId,
        });

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('MALFORMED_AI_RESPONSE');
    });

    it('should handle Gemini timeout and return 504', async () => {
      setMockJobMatchGenerator(async () => {
        throw new GeminiServiceError('Timeout', 504, 'GEMINI_TIMEOUT');
      });

      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          ...validPayload,
          resumeId: userAResumeId,
        });

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe('GEMINI_TIMEOUT');
    });

    it('should handle Gemini rate limit (429) and return 429', async () => {
      setMockJobMatchGenerator(async () => {
        throw new GeminiServiceError('Rate limit', 429, 'GEMINI_RATE_LIMIT');
      });

      const res = await request(app)
        .post('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie])
        .send({
          ...validPayload,
          resumeId: userAResumeId,
        });

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('GEMINI_RATE_LIMIT');
    });
  });

  describe('Job Match History & Retrieval Endpoints', () => {
    let savedMatchId;

    beforeAll(async () => {
      const match = await JobAnalysis.create({
        userId: userAId,
        resumeId: userAResumeId,
        jobTitle: 'Staff Engineer',
        companyName: 'Airbnb',
        jobDescription: 'Seeking Staff Engineer to architect frontend infrastructure.',
        matchScore: 82,
        overallMatchScore: 82,
        dimensionScores: validMockJobMatchResponse.dimensionScores,
        skillsAnalysis: validMockJobMatchResponse.skills,
        experienceAnalysis: validMockJobMatchResponse.experience,
        educationAnalysis: validMockJobMatchResponse.educationAndCertifications,
        recommendations: validMockJobMatchResponse.recommendations,
        summaryAssessment: validMockJobMatchResponse.summaryAssessment,
        matchedSkills: ['React.js', 'TypeScript'],
        missingSkills: ['GraphQL'],
        tailoringRecommendations: ['Add GraphQL'],
        disclaimer: MATCH_DISCLAIMER,
        providerMetadata: { provider: 'Google Gemini', model: 'gemini-2.5-flash', latencyMs: 300 },
      });
      savedMatchId = match._id.toString();
    });

    it('should list all job matches for authenticated user (GET /api/v1/job-matches)', async () => {
      const res = await request(app)
        .get('/api/v1/job-matches')
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.jobMatches)).toBe(true);
      expect(res.body.data.jobMatches.some((m) => m.id === savedMatchId)).toBe(true);
    });

    it('should get single job match report by ID (GET /api/v1/job-matches/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/job-matches/${savedMatchId}`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobAnalysis.id).toBe(savedMatchId);
      expect(res.body.data.jobAnalysis.matchScore).toBe(82);
    });

    it('should reject cross-user access to single job match report with 404 (User B accessing User A report)', async () => {
      const res = await request(app)
        .get(`/api/v1/job-matches/${savedMatchId}`)
        .set('Cookie', [userBAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('JOB_MATCH_NOT_FOUND');
    });

    it('should reject cross-user deletion attempt with 404 (User B deleting User A report)', async () => {
      const res = await request(app)
        .delete(`/api/v1/job-matches/${savedMatchId}`)
        .set('Cookie', [userBAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('JOB_MATCH_NOT_FOUND');
    });

    it('should allow owner to delete job match report (DELETE /api/v1/job-matches/:id)', async () => {
      const matchToDelete = await JobAnalysis.create({
        userId: userAId,
        resumeId: userAResumeId,
        jobTitle: 'To Delete',
        jobDescription: 'Job description to be deleted',
        matchScore: 50,
      });

      const res = await request(app)
        .delete(`/api/v1/job-matches/${matchToDelete._id}`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const check = await JobAnalysis.findById(matchToDelete._id);
      expect(check).toBeNull();
    });

    it('should confirm API key is NEVER exposed in job match responses', async () => {
      const res = await request(app)
        .get(`/api/v1/job-matches/${savedMatchId}`)
        .set('Cookie', [userAAuthCookie]);

      const jsonStr = JSON.stringify(res.body);
      expect(jsonStr).not.toContain('GEMINI_API_KEY');
      expect(jsonStr).not.toContain('apiKey');
    });
  });
});
