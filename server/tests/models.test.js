import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import {
  User,
  Resume,
  ResumeAnalysis,
  JobAnalysis,
  InterviewSession,
  Application,
} from '../src/models/index.js';

let mongoServer;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);
});

afterAll(async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
  }
});

describe('Mongoose Models Schema Validation', () => {
  let createdUserId;
  let createdResumeId;

  it('should create a valid User document and hide passwordHash in JSON serialization', async () => {
    const user = await User.create({
      fullName: 'Marcus Vance',
      email: 'marcus.vance@example.com',
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      targetRole: 'Cloud Architect',
      careerLevel: 'Senior',
    });

    createdUserId = user._id;
    expect(user._id).toBeDefined();
    expect(user.email).toBe('marcus.vance@example.com');
    expect(user.careerLevel).toBe('Senior');

    const json = user.toJSON();
    expect(json.passwordHash).toBeUndefined();
    expect(json.id).toBe(user._id.toString());
  });

  it('should create a valid Resume document linked to user', async () => {
    const resume = await Resume.create({
      userId: createdUserId,
      originalFileName: 'Marcus_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 102400,
      rawText: 'Marcus Vance - Cloud Architect with 8+ years of AWS and Kubernetes experience...',
      parsedSections: { experience: true, skills: true },
    });

    createdResumeId = resume._id;
    expect(resume._id).toBeDefined();
    expect(resume.userId.toString()).toBe(createdUserId.toString());
    expect(resume.fileFormat).toBe('pdf');
  });

  it('should create a valid ResumeAnalysis document', async () => {
    const analysis = await ResumeAnalysis.create({
      userId: createdUserId,
      resumeId: createdResumeId,
      overallScore: 85,
      categoryScores: {
        impactAndMetrics: 80,
        brevityAndFormatting: 90,
        actionVerbsAndStyle: 85,
        skillsCoverage: 85,
        atsReadability: 90,
      },
      summaryFeedback: 'Strong architectural experience with clear leadership progression.',
      bulletImprovements: [
        {
          originalBullet: 'Managed cloud migrations',
          issueCritique: 'Lacks scale',
          recommendedRewrite: 'Orchestrated migration of 40+ microservices to AWS EKS',
        },
      ],
      strengths: ['Kubernetes expertise'],
      weaknesses: ['Add more metrics'],
      identifiedSkills: {
        technical: ['AWS', 'Kubernetes', 'Terraform'],
        soft: ['Leadership'],
        toolsAndFrameworks: ['Docker'],
      },
    });

    expect(analysis._id).toBeDefined();
    expect(analysis.overallScore).toBe(85);
  });

  it('should create a valid JobAnalysis document', async () => {
    const jobMatch = await JobAnalysis.create({
      userId: createdUserId,
      resumeId: createdResumeId,
      jobTitle: 'Lead Cloud Architect',
      company: 'Datadog',
      jobDescription: 'Seeking Lead Cloud Architect with deep AWS, Terraform, and distributed systems experience to lead infrastructure modernization...',
      matchScore: 82,
      matchedSkills: ['AWS', 'Terraform', 'Kubernetes'],
      missingSkills: ['Golang', 'eBPF'],
      unverifiedSkills: ['System Design'],
      tailoringRecommendations: ['Emphasize low-level networking and observability'],
    });

    expect(jobMatch._id).toBeDefined();
    expect(jobMatch.matchScore).toBe(82);
  });

  it('should create a valid InterviewSession document', async () => {
    const session = await InterviewSession.create({
      userId: createdUserId,
      resumeId: createdResumeId,
      jobTitle: 'Lead Cloud Architect',
      questions: [
        {
          questionText: 'How would you architect a zero-downtime multi-region Kubernetes migration?',
          category: 'Technical',
          difficulty: 'Senior',
          sampleKeyPoints: ['Traffic shaping', 'Database replication', 'Canary rollouts'],
        },
      ],
    });

    expect(session._id).toBeDefined();
    expect(session.questions.length).toBe(1);
    expect(session.questions[0].category).toBe('Technical');
  });

  it('should create a valid Application document', async () => {
    const appDoc = await Application.create({
      userId: createdUserId,
      resumeId: createdResumeId,
      companyName: 'Datadog',
      positionTitle: 'Lead Cloud Architect',
      status: 'Applied',
      salaryExpectation: 190000,
      notes: 'Applied through company portal. Referral provided.',
    });

    expect(appDoc._id).toBeDefined();
    expect(appDoc.status).toBe('Applied');
    expect(appDoc.salaryExpectation).toBe(190000);
  });
});
