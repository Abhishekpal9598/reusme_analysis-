import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import { ResumeAnalysis } from '../src/models/ResumeAnalysis.js';
import {
  setMockGeminiGenerator,
  GeminiServiceError,
} from '../src/services/geminiService.js';
import {
  calculateOverallScore,
} from '../src/validators/analysisValidators.js';

let mongoServer;
let userAAuthCookie;
let userBAuthCookie;
let userAId;
let userBId;
let userAResumeId;
let userBResumeId;

const validMockGeminiResponse = {
  dimensionScores: {
    impact: {
      score: 80,
      explanation: 'Demonstrates quantifiable achievements and scale.',
      evidence: ['Reduced latency by 45%', 'Scaled application to 100k users'],
    },
    brevity: {
      score: 70,
      explanation: 'Clear and readable, though some bullet points contain redundant phrases.',
      evidence: ['Used "Responsible for" in two bullets'],
    },
    actionVerbs: {
      score: 85,
      explanation: 'Uses strong technical action verbs throughout experience entries.',
      evidence: ['Architected', 'Implemented', 'Spearheaded'],
    },
    skillsCoverage: {
      score: 90,
      explanation: 'Extensive coverage of modern backend and cloud competencies.',
      evidence: ['Node.js', 'React', 'MongoDB', 'Docker', 'AWS'],
    },
    atsReadability: {
      score: 95,
      explanation: 'Standardized section taxonomy and clean parseable hierarchy.',
      evidence: ['Experience', 'Education', 'Skills', 'Projects'],
    },
  },
  summaryFeedback:
    'A high-caliber technical resume with solid metrics and modern stack proficiencies. Refining bullet points to eliminate passive phrasing will further elevate impact.',
  strengths: [
    {
      title: 'Strong Technical Stack',
      description: 'Comprehensive coverage of modern JavaScript/TypeScript ecosystem.',
      evidence: ['Node.js', 'React', 'Docker'],
    },
    {
      title: 'Quantified Accomplishments',
      description: 'Multiple bullets include measurable latency and scaling metrics.',
      evidence: ['Reduced latency by 45%'],
    },
  ],
  improvementAreas: [
    {
      title: 'Eliminate Passive Filler Phrases',
      description: 'Replace "Responsible for" and "Worked on" with decisive action verbs.',
      evidence: ['Responsible for maintaining CI/CD pipeline'],
    },
  ],
  bulletRewrites: [
    {
      originalBullet: 'Responsible for maintaining CI/CD pipeline and backend deployments.',
      suggestedBullet:
        'Architected and automated CI/CD deployment pipelines using GitHub Actions, reducing release cycle time by 40%.',
      rationale:
        'Replaced passive responsibility phrasing with active ownership and quantifiable cycle-time impact.',
    },
  ],
  recommendations: [
    'Expand on cloud infrastructure and monitoring tools (e.g. Prometheus, Datadog).',
    'Add links to public GitHub repositories or live system architectures.',
  ],
  identifiedSkills: {
    technical: ['JavaScript', 'Node.js', 'React', 'Express.js', 'MongoDB'],
    soft: ['Agile Leadership', 'Cross-functional Collaboration'],
    toolsAndFrameworks: ['Docker', 'AWS', 'GitHub Actions', 'Jest'],
  },
};

describe('Phase 5: Gemini AI Resume Quality Audit Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Candidate Alpha',
        email: 'alpha@example.com',
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
        email: 'beta@example.com',
        password: 'Password123!',
      });
    expect(resB.status).toBe(201);
    userBAuthCookie = resB.headers['set-cookie'][0].split(';')[0];
    userBId = resB.body.data.user.id;

    // Create User A Resume
    const resumeA = await Resume.create({
      userId: userAId,
      originalFileName: 'Alpha_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024,
      rawText:
        'Candidate Alpha\nFull Stack Engineer\nExperience:\n- Architected microservices with Node.js and MongoDB.\n- Reduced latency by 45% for 100k active users.\nSkills:\nNode.js, React, Docker, AWS.',
      wordCount: 35,
      characterCount: 220,
      parsedSections: { experience: true, skills: true },
      parsingStatus: 'completed',
    });
    userAResumeId = resumeA._id.toString();

    // Create User B Resume
    const resumeB = await Resume.create({
      userId: userBId,
      originalFileName: 'Beta_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024,
      rawText:
        'Candidate Beta\nBackend Developer\nExperience:\n- Developed Python APIs.\nSkills: Python, Django.',
      wordCount: 15,
      characterCount: 90,
      parsedSections: { experience: true, skills: true },
      parsingStatus: 'completed',
    });
    userBResumeId = resumeB._id.toString();
  });

  afterAll(async () => {
    setMockGeminiGenerator(null);
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(() => {
    // Default to valid mock generator
    setMockGeminiGenerator(async () => JSON.stringify(validMockGeminiResponse));
  });

  describe('Deterministic Scoring Formula Unit Verification', () => {
    it('should compute deterministic overall score using exact weights: 25% impact, 25% skills, 20% actionVerbs, 15% ats, 15% brevity', () => {
      // 0.25*80 + 0.25*90 + 0.20*85 + 0.15*95 + 0.15*70
      // = 20 + 22.5 + 17 + 14.25 + 10.5 = 84.25 -> round = 84
      const calculated = calculateOverallScore(validMockGeminiResponse.dimensionScores);
      expect(calculated).toBe(84);
    });

    it('should bound score between 0 and 100 on extreme inputs', () => {
      const minScores = {
        impact: { score: 0 },
        brevity: { score: 0 },
        actionVerbs: { score: 0 },
        skillsCoverage: { score: 0 },
        atsReadability: { score: 0 },
      };
      expect(calculateOverallScore(minScores)).toBe(0);

      const maxScores = {
        impact: { score: 100 },
        brevity: { score: 100 },
        actionVerbs: { score: 100 },
        skillsCoverage: { score: 100 },
        atsReadability: { score: 100 },
      };
      expect(calculateOverallScore(maxScores)).toBe(100);
    });
  });

  describe('Resume Audit API (POST /api/v1/resumes/:id/analyze)', () => {
    it('should reject unauthenticated analysis request with 401', async () => {
      const res = await request(app).post(`/api/v1/resumes/${userAResumeId}/analyze`);
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject analysis of non-existent resume with 404', async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();
      const res = await request(app)
        .post(`/api/v1/resumes/${fakeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    });

    it('should reject cross-user IDOR attempt with 404 (User A cannot audit User B resume)', async () => {
      const res = await request(app)
        .post(`/api/v1/resumes/${userBResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    });

    it('should reject resume with empty or insufficient text (<20 chars) with 422', async () => {
      const shortResume = await Resume.create({
        userId: userAId,
        originalFileName: 'Short.txt',
        fileFormat: 'txt',
        fileSize: 10,
        rawText: 'Valid initial length text for resume creation',
        wordCount: 7,
        characterCount: 45,
      });

      // Update in database directly to simulate a document with < 20 chars
      await Resume.collection.updateOne(
        { _id: shortResume._id },
        { $set: { rawText: 'Too short' } }
      );

      const res = await request(app)
        .post(`/api/v1/resumes/${shortResume._id}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('UNPARSEABLE_RESUME');
    });

    it('should successfully analyze resume, compute deterministic overall score, persist to DB, and return report', async () => {
      const res = await request(app)
        .post(`/api/v1/resumes/${userAResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis).toBeDefined();

      const analysis = res.body.data.analysis;
      expect(analysis.resumeId.toString()).toBe(userAResumeId);
      expect(analysis.userId.toString()).toBe(userAId);
      expect(analysis.overallScore).toBe(84);
      expect(analysis.dimensionScores.impact.score).toBe(80);
      expect(analysis.dimensionScores.skillsCoverage.score).toBe(90);
      expect(analysis.dimensionScores.actionVerbs.score).toBe(85);
      expect(analysis.dimensionScores.atsReadability.score).toBe(95);
      expect(analysis.dimensionScores.brevity.score).toBe(70);
      expect(analysis.strengths).toHaveLength(2);
      expect(analysis.improvementAreas).toHaveLength(1);
      expect(analysis.bulletRewrites).toHaveLength(1);
      expect(analysis.recommendations).toHaveLength(2);
      expect(analysis.providerMetadata.provider).toBe('Google Gemini');

      // Verify persistence in MongoDB
      const dbRecord = await ResumeAnalysis.findById(analysis.id);
      expect(dbRecord).not.toBeNull();
      expect(dbRecord.overallScore).toBe(84);
    });

    it('should handle malformed JSON from Gemini and return 422', async () => {
      setMockGeminiGenerator(async () => 'INVALID_NON_JSON_STRING_<<<>>>');

      const res = await request(app)
        .post(`/api/v1/resumes/${userAResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('MALFORMED_AI_RESPONSE');
    });

    it('should handle invalid Zod schema from Gemini and return 422', async () => {
      // Missing dimensionScores.impact
      const incomplete = {
        dimensionScores: {
          brevity: { score: 80, explanation: 'ok', evidence: [] },
        },
        summaryFeedback: 'Short feedback',
      };
      setMockGeminiGenerator(async () => JSON.stringify(incomplete));

      const res = await request(app)
        .post(`/api/v1/resumes/${userAResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(422);
      expect(res.body.error.code).toBe('INVALID_ANALYSIS_SCHEMA');
    });

    it('should handle Gemini timeout error and return 504', async () => {
      setMockGeminiGenerator(async () => {
        throw new GeminiServiceError('Request timed out', 504, 'GEMINI_TIMEOUT');
      });

      const res = await request(app)
        .post(`/api/v1/resumes/${userAResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(504);
      expect(res.body.error.code).toBe('GEMINI_TIMEOUT');
    });

    it('should handle Gemini rate limit (429) and return 429', async () => {
      setMockGeminiGenerator(async () => {
        throw new GeminiServiceError('Rate limit exceeded', 429, 'GEMINI_RATE_LIMIT');
      });

      const res = await request(app)
        .post(`/api/v1/resumes/${userAResumeId}/analyze`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(429);
      expect(res.body.error.code).toBe('GEMINI_RATE_LIMIT');
    });
  });

  describe('Analysis History & Retrieval Endpoints', () => {
    let savedAnalysisId;

    beforeAll(async () => {
      // Create a persistent analysis for User A
      const analysis = await ResumeAnalysis.create({
        userId: userAId,
        resumeId: userAResumeId,
        overallScore: 84,
        dimensionScores: validMockGeminiResponse.dimensionScores,
        categoryScores: {
          impactAndMetrics: 80,
          brevityAndFormatting: 70,
          actionVerbsAndStyle: 85,
          skillsCoverage: 90,
          atsReadability: 95,
        },
        summaryFeedback: validMockGeminiResponse.summaryFeedback,
        strengths: validMockGeminiResponse.strengths,
        improvementAreas: validMockGeminiResponse.improvementAreas,
        bulletRewrites: validMockGeminiResponse.bulletRewrites,
        recommendations: validMockGeminiResponse.recommendations,
        identifiedSkills: validMockGeminiResponse.identifiedSkills,
        providerMetadata: { provider: 'Google Gemini', model: 'gemini-2.5-flash', latencyMs: 250 },
      });
      savedAnalysisId = analysis._id.toString();
    });

    it('should retrieve audit history for a specific resume (GET /api/v1/resumes/:id/analyses)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}/analyses`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.analyses)).toBe(true);
      expect(res.body.data.analyses.length).toBeGreaterThanOrEqual(1);
    });

    it('should prevent cross-user audit history access (User B accessing User A resume analyses)', async () => {
      const res = await request(app)
        .get(`/api/v1/resumes/${userAResumeId}/analyses`)
        .set('Cookie', [userBAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    });

    it('should retrieve single analysis report by ID (GET /api/v1/analyses/:id)', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${savedAnalysisId}`)
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.analysis.id).toBe(savedAnalysisId);
      expect(res.body.data.analysis.overallScore).toBe(84);
    });

    it('should prevent cross-user access to single analysis report (User B accessing User A report)', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${savedAnalysisId}`)
        .set('Cookie', [userBAuthCookie]);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('ANALYSIS_NOT_FOUND');
    });

    it('should list all analyses for authenticated user (GET /api/v1/analyses)', async () => {
      const res = await request(app)
        .get('/api/v1/analyses')
        .set('Cookie', [userAAuthCookie]);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data.analyses)).toBe(true);
      expect(res.body.data.analyses.some((a) => a.id === savedAnalysisId)).toBe(true);
    });

    it('should verify that API key is NEVER exposed in any analysis response payload', async () => {
      const res = await request(app)
        .get(`/api/v1/analyses/${savedAnalysisId}`)
        .set('Cookie', [userAAuthCookie]);

      const jsonString = JSON.stringify(res.body);
      expect(jsonString).not.toContain('GEMINI_API_KEY');
      expect(jsonString).not.toContain('apiKey');
    });
  });
});
