import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Resume } from '../src/models/Resume.js';
import { InterviewSession } from '../src/models/InterviewSession.js';
import {
  setMockInterviewQuestionGenerator,
  setMockInterviewEvaluator,
  setMockInterviewReportGenerator,
} from '../src/services/interviewService.js';
import {
  calculateDeterministicOverallScore,
  PRACTICE_VERDICT_DISCLAIMER,
} from '../src/validators/interviewValidators.js';

let mongoServer;
let userACookie;
let userBCookie;
let userAId;
let userBId;
let userAResumeId;

const mockQuestions = [
  {
    questionText: 'Can you describe the lifecycle of a React component and when useEffect runs?',
    category: 'Technical',
    difficulty: 'Medium',
    sampleKeyPoints: [
      'Mount, Update, Unmount stages',
      'useEffect runs after render and commit',
      'Cleanup functions on unmount or dependency change',
    ],
  },
  {
    questionText: 'Tell me about a time you had a technical disagreement with a team member.',
    category: 'Behavioral',
    difficulty: 'Medium',
    sampleKeyPoints: [
      'Specific situation and context',
      'Objective analysis and discussion',
      'Data-driven resolution and outcome',
    ],
  },
  {
    questionText: 'How do you approach database schema design for high concurrency in Node.js?',
    category: 'Technical',
    difficulty: 'Hard',
    sampleKeyPoints: [
      'Indexing strategies and query patterns',
      'Connection pooling and caching layers',
      'Transaction isolation and eventual consistency',
    ],
  },
];

const mockEvalHigh = {
  score: 88,
  rubricScores: {
    technicalAccuracy: 90,
    completeness: 85,
    clarity: 88,
    problemSolving: 89,
  },
  starAssessment: {
    isStarApplicable: false,
    situation: '',
    task: '',
    action: '',
    result: '',
    starFeedback: 'Technical question; STAR format not required.',
  },
  strengths: ['Clear explanation of render lifecycle', 'Understands cleanup functions well'],
  weaknesses: [],
  missingPoints: ['Could mention layout effects vs standard effects'],
  improvements: ['Mention useLayoutEffect for synchronous DOM measurements'],
  modelAnswer: 'A React component lifecycle comprises Mounting, Updating, and Unmounting...',
};

const mockEvalBehavioral = {
  score: 82,
  rubricScores: {
    technicalAccuracy: 80,
    completeness: 85,
    clarity: 85,
    problemSolving: 78,
  },
  starAssessment: {
    isStarApplicable: true,
    situation: 'Described disagreeing on API contract with backend lead.',
    task: 'Needed consensus to unblock sprint delivery.',
    action: 'Created benchmark prototype to compare REST vs GraphQL response times.',
    result: 'Adopted REST with clear schema specs, delivered ahead of deadline.',
    starFeedback: 'Strong STAR structure demonstrating collaborative conflict resolution.',
  },
  strengths: ['Well-structured response following STAR', 'Data-driven mindset'],
  weaknesses: [],
  missingPoints: ['Could specify long-term team impact'],
  improvements: ['Reflect on retrospective learning'],
  modelAnswer: 'In my previous position, our team faced a design disagreement...',
};

const mockReport = {
  summary: 'The candidate demonstrated robust mid-to-senior frontend engineering capabilities with solid communication and systematic conflict resolution.',
  strengthsSummary: [
    'Deep understanding of frontend component lifecycles',
    'Data-driven approach to technical collaboration',
  ],
  weaknessesSummary: [
    'Concurrency architecture depth could be expanded',
  ],
  studyRecommendations: [
    'Distributed systems caching patterns (Redis, CDN edge caching)',
    'Database index execution plans and query tuning',
  ],
  personalizedRoadmap: [
    'Stage 1: Review Node.js clustering and connection pooling',
    'Stage 2: Practice system design scenarios for distributed web apps',
    'Stage 3: Deep dive into React Concurrent Mode and hydration internals',
    'Stage 4: Polish behavioral examples focusing on business metrics',
  ],
};

describe('Phase 7: AI Mock Interview Simulator Backend Integration Tests', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Interview Candidate A',
        email: 'candidate_a@example.com',
        password: 'Password123!',
      });
    expect(resA.status).toBe(201);
    userACookie = resA.headers['set-cookie'][0].split(';')[0];
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        fullName: 'Interview Candidate B',
        email: 'candidate_b@example.com',
        password: 'Password123!',
      });
    expect(resB.status).toBe(201);
    userBCookie = resB.headers['set-cookie'][0].split(';')[0];
    userBId = resB.body.data.user.id;

    // Create User A Resume
    const resume = await Resume.create({
      userId: userAId,
      originalFileName: 'Candidate_A_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024,
      rawText: 'Candidate A. Full Stack Developer. Proficient in React, Node.js, Express, MongoDB, and TypeScript.',
      wordCount: 20,
      characterCount: 150,
    });
    userAResumeId = resume._id.toString();

    // Configure Mocks
    setMockInterviewQuestionGenerator(async () => mockQuestions);
    setMockInterviewEvaluator(async ({ category }) =>
      category === 'Behavioral' ? mockEvalBehavioral : mockEvalHigh
    );
    setMockInterviewReportGenerator(async () => mockReport);
  });

  afterAll(async () => {
    setMockInterviewQuestionGenerator(null);
    setMockInterviewEvaluator(null);
    setMockInterviewReportGenerator(null);
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  describe('1. Interview Session Creation & Question Generation', () => {
    it('creates an interview session without selecting a resume (optional resume)', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Full Stack Engineer',
          experienceLevel: 'Mid',
          category: 'Technical',
          difficulty: 'Medium',
          questionCount: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.jobRole).toBe('Full Stack Engineer');
      expect(res.body.data.resumeId).toBeNull();
      expect(res.body.data.status).toBe('in_progress');
      expect(res.body.data.questions).toHaveLength(3);
      expect(res.body.data.questions[0].questionText).toContain('React');
    });

    it('creates an interview session with an uploaded resume attached', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Senior Frontend Developer',
          experienceLevel: 'Senior',
          category: 'Role-Based',
          difficulty: 'Hard',
          questionCount: 3,
          resumeId: userAResumeId,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resumeId).toBe(userAResumeId);
      expect(res.body.data.questions).toHaveLength(3);
    });

    it('fails with 404 when attempting to use another user resume (IDOR protection)', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userBCookie)
        .send({
          jobRole: 'Backend Engineer',
          resumeId: userAResumeId, // Belongs to User A
        });

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
    });

    it('fails with 400 when jobRole is invalid or missing', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: '',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('enforces strict separation: rejects invalid experienceLevel', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Software Engineer',
          experienceLevel: 'Easy', // Invalid! 'Easy' is a difficulty, not an experience level
          difficulty: 'Medium',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('experience level');
    });

    it('enforces strict separation: rejects invalid difficulty', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Software Engineer',
          experienceLevel: 'Senior',
          difficulty: 'Junior', // Invalid! 'Junior' is an experience level, not a difficulty
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
      expect(res.body.error.message).toContain('difficulty');
    });

    it('accepts valid strictly separated experienceLevel (Lead) and difficulty (Hard)', async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Staff Architect',
          experienceLevel: 'Lead',
          difficulty: 'Hard',
          questionCount: 3,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.experienceLevel).toBe('Lead');
      expect(res.body.data.difficulty).toBe('Hard');
    });
  });

  describe('2. Session Recovery & Listing', () => {
    let createdSessionId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Full Stack Engineer',
          questionCount: 3,
        });
      createdSessionId = res.body.data.id;
    });

    it('allows user to retrieve active session with questions for session recovery', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${createdSessionId}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(createdSessionId);
      expect(res.body.data.questions).toHaveLength(3);
    });

    it('denies User B access to User A interview session (IDOR protection)', async () => {
      const res = await request(app)
        .get(`/api/v1/interviews/${createdSessionId}`)
        .set('Cookie', userBCookie);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('SESSION_NOT_FOUND');
    });

    it('lists user interview sessions without exposing other users data', async () => {
      const res = await request(app)
        .get('/api/v1/interviews')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBeGreaterThan(0);
      // All returned records belong to user A
      res.body.data.forEach((s) => {
        expect(s.userId).toBe(userAId);
      });
    });
  });

  describe('3. Answer Evaluation & Idempotency', () => {
    let sessionId;
    let questionId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Full Stack Engineer',
          questionCount: 3,
        });
      sessionId = res.body.data.id;
      questionId = res.body.data.questions[0]._id;
    });

    it('evaluates an answer and updates MongoDB session document', async () => {
      const answerText = 'React components re-render when state or props change. useEffect executes after DOM paint.';

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluate`)
        .set('Cookie', userACookie)
        .send({
          questionId,
          userAnswer: answerText,
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.evaluation).toBeDefined();
      expect(res.body.data.evaluation.score).toBe(88);
      expect(res.body.data.evaluation.rubricScores.technicalAccuracy).toBe(90);

      // Verify MongoDB persistence
      const saved = await InterviewSession.findById(sessionId);
      const q = saved.questions.id(questionId);
      expect(q.userAnswer).toBe(answerText);
      expect(q.evaluation.score).toBe(88);
      expect(q.answeredAt).toBeDefined();
    });

    it('protects against duplicate evaluation requests for identical answer (idempotency)', async () => {
      const answerText = 'React components re-render when state or props change. useEffect executes after DOM paint.';

      // First evaluation
      const res1 = await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluate`)
        .set('Cookie', userACookie)
        .send({ questionId, userAnswer: answerText });
      expect(res1.status).toBe(200);

      // Duplicate submission
      const res2 = await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluate`)
        .set('Cookie', userACookie)
        .send({ questionId, userAnswer: answerText });
      expect(res2.status).toBe(200);
      expect(res2.body.data.idempotent).toBe(true);
      expect(res2.body.data.evaluation.score).toBe(88);
    });

    it('rejects answer that is too short', async () => {
      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluate`)
        .set('Cookie', userACookie)
        .send({
          questionId,
          userAnswer: 'no',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('4. Completion Validation & Deterministic Scoring', () => {
    let sessionId;
    let questions;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/interviews')
        .set('Cookie', userACookie)
        .send({
          jobRole: 'Full Stack Engineer',
          questionCount: 3,
        });
      sessionId = res.body.data.id;
      questions = res.body.data.questions;
    });

    it('rejects completion with 400 when questions remain unanswered/unevaluated', async () => {
      // Answer only question 1
      await request(app)
        .post(`/api/v1/interviews/${sessionId}/evaluate`)
        .set('Cookie', userACookie)
        .send({
          questionId: questions[0]._id,
          userAnswer: 'React lifecycle encompasses mounting, updating, and unmounting phases.',
        });

      // Attempt complete prematurely
      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/complete`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INCOMPLETE_INTERVIEW');
      expect(res.body.error.details).toHaveLength(2); // Questions 2 and 3 incomplete
    });

    it('successfully completes session, generates deterministic scores, and saves report', async () => {
      // Answer and evaluate all 3 questions
      for (const q of questions) {
        await request(app)
          .post(`/api/v1/interviews/${sessionId}/evaluate`)
          .set('Cookie', userACookie)
          .send({
            questionId: q._id,
            userAnswer: `Comprehensive answer for question ${q.questionText} demonstrating strong domain knowledge.`,
          });
      }

      const res = await request(app)
        .post(`/api/v1/interviews/${sessionId}/complete`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('completed');
      expect(res.body.data.overallReport).toBeDefined();

      const report = res.body.data.overallReport;
      // Questions 1 & 3 received 88, question 2 received 82: average is Math.round((88+82+88)/3) = 86
      expect(report.overallScore).toBe(86);
      expect(report.verdict).toBe('Strong Hire');
      expect(report.rubricAverages.technicalAccuracy).toBeGreaterThan(0);
      expect(report.disclaimer).toContain(
        'This assessment is an AI-generated practice simulation for educational and preparation purposes only'
      );
      expect(report.summary).toContain('candidate demonstrated');

      // Check DB persistence
      const saved = await InterviewSession.findById(sessionId);
      expect(saved.status).toBe('completed');
      expect(saved.overallReport.overallScore).toBe(86);
    });
  });

  describe('5. Backward Compatibility & IDOR Session Deletion', () => {
    it('preserves and loads legacy InterviewSession documents having only jobTitle and legacy categories', async () => {
      // Insert raw document mimicking legacy schema
      const legacyDoc = await InterviewSession.create({
        userId: userAId,
        jobTitle: 'Legacy Frontend Developer',
        jobRole: 'Legacy Frontend Developer',
        questions: [
          {
            questionText: 'Explain CSS specificity and the box model.',
            category: 'Technical',
            difficulty: 'Mid',
            sampleKeyPoints: ['Box model: content, padding, border, margin'],
            userAnswer: 'Box model comprises padding border margin.',
            evaluation: {
              score: 75,
              strengths: ['Accurate components'],
              weaknesses: [],
              missingPoints: [],
              modelAnswer: 'The CSS box model...',
            },
          },
        ],
      });

      expect(legacyDoc._id).toBeDefined();
      expect(legacyDoc.jobTitle).toBe('Legacy Frontend Developer');
      expect(legacyDoc.jobRole).toBe('Legacy Frontend Developer');
      expect(legacyDoc.status).toBe('in_progress');

      // Fetch via endpoint
      const res = await request(app)
        .get(`/api/v1/interviews/${legacyDoc._id}`)
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      expect(res.body.data.jobRole).toBe('Legacy Frontend Developer');
      expect(legacyDoc.questions[0].difficulty).toBe('Medium');
      expect(res.body.data.questions[0].difficulty).toBe('Medium');
    });

    it('deletes session with IDOR protection (cannot delete other user session)', async () => {
      const session = await InterviewSession.create({
        userId: userAId,
        jobRole: 'To Be Deleted',
        jobTitle: 'To Be Deleted',
        questions: [],
      });

      // User B attempts to delete User A's session
      const resB = await request(app)
        .delete(`/api/v1/interviews/${session._id}`)
        .set('Cookie', userBCookie);
      expect(resB.status).toBe(404);

      // User A deletes own session
      const resA = await request(app)
        .delete(`/api/v1/interviews/${session._id}`)
        .set('Cookie', userACookie);
      expect(resA.status).toBe(200);
      expect(resA.body.success).toBe(true);

      const check = await InterviewSession.findById(session._id);
      expect(check).toBeNull();
    });
  });
});
