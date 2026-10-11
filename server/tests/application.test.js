import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../src/app.js';
import { Application, APPLICATION_STATUSES } from '../src/models/Application.js';
import { Resume } from '../src/models/Resume.js';
import { JobAnalysis } from '../src/models/JobAnalysis.js';
import { migrateLegacyApplicationStatuses } from '../src/utils/migrateLegacyApplications.js';

let mongoServer;
let userACookie;
let userBCookie;
let userAId;
let userBId;
let userAResumeId;
let userBResumeId;

describe('Phase 8: Job Application Tracker Test Suite', () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    await mongoose.connect(uri);

    // Register User A
    const resA = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Candidate Alpha',
      email: 'alpha_phase8@example.com',
      password: 'Password123!',
    });
    userACookie = resA.headers['set-cookie'][0].split(';')[0];
    userAId = resA.body.data.user.id;

    // Register User B
    const resB = await request(app).post('/api/v1/auth/register').send({
      fullName: 'Candidate Beta',
      email: 'beta_phase8@example.com',
      password: 'Password123!',
    });
    userBCookie = resB.headers['set-cookie'][0].split(';')[0];
    userBId = resB.body.data.user.id;

    // Create a Resume owned by User A
    const resumeA = await Resume.create({
      userId: userAId,
      originalFileName: 'Alpha_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024,
      rawText: 'Full Stack Engineer with React and Node.js expertise in large scale systems.',
    });
    userAResumeId = resumeA._id.toString();

    // Create a Resume owned by User B
    const resumeB = await Resume.create({
      userId: userBId,
      originalFileName: 'Beta_Resume.pdf',
      fileFormat: 'pdf',
      fileSize: 1024,
      rawText: 'Python Data Scientist expertise in machine learning and data pipelines.',
    });
    userBResumeId = resumeB._id.toString();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Application.deleteMany({});
  });

  // ==========================================================================
  // 1. MODEL, BACKWARD COMPATIBILITY & LEGACY MIGRATION
  // ==========================================================================
  describe('1. Model, Normalization & Legacy Migration', () => {
    it('should read-normalize legacy status "Interviewing" to "Interview"', async () => {
      // Insert raw document bypassing mongoose validation
      await Application.collection.insertOne({
        userId: new mongoose.Types.ObjectId(userAId),
        companyName: 'Legacy Tech Inc',
        positionTitle: 'Backend Dev',
        status: 'Interviewing',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const doc = await Application.findOne({ companyName: 'Legacy Tech Inc' });
      expect(doc).toBeDefined();
      expect(doc.status).toBe('Interview');
    });

    it('should read-normalize legacy status "Offered" to "Offer"', async () => {
      await Application.collection.insertOne({
        userId: new mongoose.Types.ObjectId(userAId),
        companyName: 'Legacy Cloud Corp',
        positionTitle: 'Cloud Architect',
        status: 'Offered',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const doc = await Application.findOne({ companyName: 'Legacy Cloud Corp' });
      expect(doc).toBeDefined();
      expect(doc.status).toBe('Offer');
    });

    it('should execute idempotent database migration utility successfully', async () => {
      await Application.collection.insertMany([
        {
          userId: new mongoose.Types.ObjectId(userAId),
          companyName: 'Migrate One',
          positionTitle: 'Engineer',
          status: 'Interviewing',
        },
        {
          userId: new mongoose.Types.ObjectId(userAId),
          companyName: 'Migrate Two',
          positionTitle: 'Engineer',
          status: 'Offered',
        },
      ]);

      const result = await migrateLegacyApplicationStatuses();
      expect(result.modifiedCount).toBe(2);

      // Verify raw database records are permanently updated
      const rawOne = await Application.collection.findOne({ companyName: 'Migrate One' });
      const rawTwo = await Application.collection.findOne({ companyName: 'Migrate Two' });
      expect(rawOne.status).toBe('Interview');
      expect(rawTwo.status).toBe('Offer');
    });

    it('should synchronize salary.amount and legacy salaryExpectation', async () => {
      const appWithAmount = await Application.create({
        userId: userAId,
        companyName: 'Stripe',
        positionTitle: 'Senior Infrastructure',
        salary: { amount: 160000, currency: 'USD', period: 'Yearly' },
      });
      expect(appWithAmount.salaryExpectation).toBe(160000);

      const appWithLegacy = await Application.create({
        userId: userAId,
        companyName: 'Datadog',
        positionTitle: 'SRE',
        salaryExpectation: 140000,
      });
      expect(appWithLegacy.salary.amount).toBe(140000);
    });
  });

  // ==========================================================================
  // 2. INPUT VALIDATION & CROSS-DOCUMENT OWNERSHIP
  // ==========================================================================
  describe('2. Validation & Cross-Document Ownership Guard', () => {
    it('should reject creation without companyName or positionTitle with 400', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ status: 'Saved' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should reject reference to another user’s resume with 400 INVALID_RESUME_REFERENCE', async () => {
      // User A attempts to link User B's resume
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({
          companyName: 'Meta',
          positionTitle: 'Product Engineer',
          resumeId: userBResumeId, // Owned by User B
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('INVALID_RESUME_REFERENCE');
    });

    it('should accept valid reference to owned resume', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({
          companyName: 'Meta',
          positionTitle: 'Product Engineer',
          resumeId: userAResumeId, // Owned by User A
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.companyName).toBe('Meta');
    });

    it('should reject invalid status with 400', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({
          companyName: 'Google',
          positionTitle: 'Staff Engineer',
          status: 'NonExistentStatus',
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  // ==========================================================================
  // 3. APPLICATION CRUD & OWNERSHIP IDOR
  // ==========================================================================
  describe('3. Application CRUD & IDOR Security', () => {
    it('should block unauthenticated access with 401 Unauthorized', async () => {
      const res = await request(app).get('/api/v1/applications');
      expect(res.status).toBe(401);
    });

    it('should create an application and return 201 Created', async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({
          companyName: 'Amazon',
          positionTitle: 'SDE II',
          status: 'Applied',
          jobUrl: 'https://amazon.jobs/en/jobs/12345',
          location: 'Seattle, WA',
          salary: { amount: 155000, currency: 'USD', period: 'Yearly' },
          initialNote: 'Submitted application via employee referral.',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.companyName).toBe('Amazon');
      expect(res.body.data.status).toBe('Applied');
      expect(res.body.data.appliedDate).toBeDefined();
      expect(res.body.data.timelineNotes.length).toBe(1);
      expect(res.body.data.timelineNotes[0].author).toBe('Candidate Alpha');
    });

    it('should return 404 when User B tries to read, update or delete User A’s application', async () => {
      // Create User A's application
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ companyName: 'Netflix', positionTitle: 'Senior UI Engineer' });
      const appId = createRes.body.data.id;

      // User B attempts to read
      const readRes = await request(app)
        .get(`/api/v1/applications/${appId}`)
        .set('Cookie', userBCookie);
      expect(readRes.status).toBe(404);

      // User B attempts to update
      const updateRes = await request(app)
        .put(`/api/v1/applications/${appId}`)
        .set('Cookie', userBCookie)
        .send({ positionTitle: 'Hacked Title' });
      expect(updateRes.status).toBe(404);

      // User B attempts to delete
      const deleteRes = await request(app)
        .delete(`/api/v1/applications/${appId}`)
        .set('Cookie', userBCookie);
      expect(deleteRes.status).toBe(404);

      // Verify User A's application remains completely intact
      const verifyRes = await request(app)
        .get(`/api/v1/applications/${appId}`)
        .set('Cookie', userACookie);
      expect(verifyRes.status).toBe(200);
      expect(verifyRes.body.data.companyName).toBe('Netflix');
    });

    it('should delete application by owner', async () => {
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ companyName: 'Uber', positionTitle: 'Software Engineer' });
      const appId = createRes.body.data.id;

      const delRes = await request(app)
        .delete(`/api/v1/applications/${appId}`)
        .set('Cookie', userACookie);
      expect(delRes.status).toBe(200);

      const fetchRes = await request(app)
        .get(`/api/v1/applications/${appId}`)
        .set('Cookie', userACookie);
      expect(fetchRes.status).toBe(404);
    });
  });

  // ==========================================================================
  // 4. STATUS TRANSITIONS
  // ==========================================================================
  describe('4. Status Transitions', () => {
    it('should update status via PATCH /:id/status and log timeline note', async () => {
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ companyName: 'Apple', positionTitle: 'iOS Engineer', status: 'Saved' });
      const appId = createRes.body.data.id;

      const patchRes = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Cookie', userACookie)
        .send({ status: 'Applied' });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.status).toBe('Applied');
      expect(patchRes.body.data.appliedDate).toBeDefined();
      expect(patchRes.body.data.timelineNotes.some((n) => n.content.includes('Applied'))).toBe(true);
    });

    it('should support reopening from Rejected or Withdrawn back to Applied', async () => {
      const createRes = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ companyName: 'Airbnb', positionTitle: 'Staff SRE', status: 'Rejected' });
      const appId = createRes.body.data.id;

      const reopenRes = await request(app)
        .patch(`/api/v1/applications/${appId}/status`)
        .set('Cookie', userACookie)
        .send({ status: 'Applied' });

      expect(reopenRes.status).toBe(200);
      expect(reopenRes.body.data.status).toBe('Applied');
    });
  });

  // ==========================================================================
  // 5. SUBDOCUMENTS: INTERVIEWS, REMINDERS & NOTES
  // ==========================================================================
  describe('5. Subdocuments: Interviews, Reminders & Notes', () => {
    let appId;

    beforeEach(async () => {
      const res = await request(app)
        .post('/api/v1/applications')
        .set('Cookie', userACookie)
        .send({ companyName: 'Palantir', positionTitle: 'Forward Deployed Engineer' });
      appId = res.body.data.id;
    });

    it('should schedule and update interview rounds', async () => {
      const scheduledDate = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString();
      const addRes = await request(app)
        .post(`/api/v1/applications/${appId}/interviews`)
        .set('Cookie', userACookie)
        .send({
          roundName: 'System Architecture',
          roundType: 'System Design',
          scheduledDate,
          format: 'Video Call',
          meetingLink: 'https://meet.google.com/abc-def-ghi',
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.roundName).toBe('System Architecture');
      const interviewId = addRes.body.data._id;

      // Update interview round
      const updateRes = await request(app)
        .patch(`/api/v1/applications/${appId}/interviews/${interviewId}`)
        .set('Cookie', userACookie)
        .send({ completed: true });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.data.completed).toBe(true);
    });

    it('should add and toggle in-app reminders', async () => {
      const reminderDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      const addRes = await request(app)
        .post(`/api/v1/applications/${appId}/reminders`)
        .set('Cookie', userACookie)
        .send({
          title: 'Send thank-you email to recruiter',
          reminderDate,
          note: 'Mention interest in distributed cache work.',
        });

      expect(addRes.status).toBe(201);
      const reminderId = addRes.body.data._id;
      expect(addRes.body.data.isCompleted).toBe(false);

      // Toggle reminder completion
      const toggleRes = await request(app)
        .patch(`/api/v1/applications/${appId}/reminders/${reminderId}/toggle`)
        .set('Cookie', userACookie);

      expect(toggleRes.status).toBe(200);
      expect(toggleRes.body.data.isCompleted).toBe(true);
      expect(toggleRes.body.data.completedAt).toBeDefined();
    });

    it('should add timeline notes with server-enforced author', async () => {
      const addRes = await request(app)
        .post(`/api/v1/applications/${appId}/notes`)
        .set('Cookie', userACookie)
        .send({
          content: 'Recruiter mentioned next steps in 48 hours.',
          author: 'FakeAttackerName', // Must be ignored by server
        });

      expect(addRes.status).toBe(201);
      expect(addRes.body.data.content).toBe('Recruiter mentioned next steps in 48 hours.');
      expect(addRes.body.data.author).toBe('Candidate Alpha'); // Forcefully set to req.user.fullName
    });
  });

  // ==========================================================================
  // 6. SEARCH, SORTING & PAGINATION
  // ==========================================================================
  describe('6. Search, Sorting & Pagination', () => {
    beforeEach(async () => {
      await Application.create([
        { userId: userAId, companyName: 'Google', positionTitle: 'L5 Software Engineer', status: 'Applied' },
        { userId: userAId, companyName: 'Microsoft', positionTitle: 'Senior Cloud Dev', status: 'Interview' },
        { userId: userAId, companyName: 'OpenAI', positionTitle: 'Research Engineer', status: 'Offer' },
      ]);
    });

    it('should search by company or position safely against regex injection', async () => {
      // Normal search
      const searchRes = await request(app)
        .get('/api/v1/applications?q=open')
        .set('Cookie', userACookie);
      expect(searchRes.status).toBe(200);
      expect(searchRes.body.data.length).toBe(1);
      expect(searchRes.body.data[0].companyName).toBe('OpenAI');

      // ReDoS / regex meta-characters injection attempt
      const injectRes = await request(app)
        .get('/api/v1/applications?q=.*+?^${}()|[]\\')
        .set('Cookie', userACookie);
      expect(injectRes.status).toBe(200);
      expect(injectRes.body.data.length).toBe(0);
    });

    it('should filter by status and paginate', async () => {
      const filterRes = await request(app)
        .get('/api/v1/applications?status=Interview')
        .set('Cookie', userACookie);
      expect(filterRes.status).toBe(200);
      expect(filterRes.body.data.length).toBe(1);
      expect(filterRes.body.data[0].companyName).toBe('Microsoft');

      const pageRes = await request(app)
        .get('/api/v1/applications?page=1&limit=2')
        .set('Cookie', userACookie);
      expect(pageRes.status).toBe(200);
      expect(pageRes.body.data.length).toBe(2);
      expect(pageRes.body.meta.totalCount).toBe(3);
      expect(pageRes.body.meta.totalPages).toBe(2);
    });
  });

  // ==========================================================================
  // 7. ANALYTICS & ZERO-DENOMINATOR COMPUTATION
  // ==========================================================================
  describe('7. Analytics & Safe Mathematical Computations', () => {
    it('should return 0.0% conversion rates safely when user has zero applications', async () => {
      const res = await request(app)
        .get('/api/v1/applications/analytics')
        .set('Cookie', userBCookie); // User B has 0 applications

      expect(res.status).toBe(200);
      const { analytics } = { analytics: res.body.data };
      expect(analytics.totalApplications).toBe(0);
      expect(analytics.activePipeline).toBe(0);
      expect(analytics.interviewConversionRate).toBe(0.0);
      expect(analytics.offerRate).toBe(0.0);
      expect(analytics.upcomingInterviewsCount).toBe(0);
      expect(analytics.pendingFollowUpsCount).toBe(0);
      expect(analytics.statusBreakdown.Saved).toBe(0);
      expect(analytics.statusBreakdown.Applied).toBe(0);
    });

    it('should calculate accurate metrics for active pipeline, conversion, and upcoming events', async () => {
      const now = Date.now();
      await Application.create([
        {
          userId: userAId,
          companyName: 'Figma',
          positionTitle: 'Frontend Engineer',
          status: 'Interview',
          interviews: [
            {
              roundName: 'Coding Round',
              scheduledDate: new Date(now + 2 * 24 * 60 * 60 * 1000), // In 2 days
              format: 'Video Call',
              completed: false,
            },
          ],
        },
        {
          userId: userAId,
          companyName: 'Canva',
          positionTitle: 'Full Stack Engineer',
          status: 'Offer',
        },
        {
          userId: userAId,
          companyName: 'Spotify',
          positionTitle: 'Audio Platform',
          status: 'Rejected',
        },
        {
          userId: userAId,
          companyName: 'Linear',
          positionTitle: 'Product Engineer',
          status: 'Saved',
          reminders: [
            {
              title: 'Reach out to hiring manager',
              reminderDate: new Date(now + 24 * 60 * 60 * 1000), // In 1 day
              isCompleted: false,
            },
          ],
        },
      ]);

      const res = await request(app)
        .get('/api/v1/applications/analytics')
        .set('Cookie', userACookie);

      expect(res.status).toBe(200);
      const a = res.body.data;
      expect(a.totalApplications).toBe(4);
      // Active pipeline: Figma (Interview) + Canva (Offer) = 2
      expect(a.activePipeline).toBe(2);
      // Pool for conversion: Figma (Interview) + Canva (Offer) + Spotify (Rejected) = 3
      // Interview conversion: (Interview or Offer = 2) / 3 = 66.7%
      expect(a.interviewConversionRate).toBe(66.7);
      // Offer rate: (Offer = 1) / 3 = 33.3%
      expect(a.offerRate).toBe(33.3);
      // Upcoming interviews count = 1
      expect(a.upcomingInterviewsCount).toBe(1);
      expect(a.upcomingInterviews[0].companyName).toBe('Figma');
      // Pending follow-ups count = 1
      expect(a.pendingFollowUpsCount).toBe(1);
    });
  });
});
