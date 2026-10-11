import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document as DocxDoc, Paragraph, TextRun, Packer } from 'docx';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';

let mongoServer;
let userACookie;
let userBCookie;
let userAId;
let userBId;

// Generate real specification-compliant PDF binary buffer
const createPdfBuffer = async (text = 'Priya Sharma - Senior Full Stack Software Engineer with Experience in React and Node') => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([600, 400]);
  page.drawText(text, { x: 50, y: 350, size: 14, font, color: rgb(0, 0, 0) });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

// Generate real specification-compliant DOCX binary buffer
const createDocxBuffer = async (text = 'Marcus Vance - Cloud Infrastructure Architect with Kubernetes and Terraform experience') => {
  const doc = new DocxDoc({
    sections: [
      {
        children: [
          new Paragraph({
            children: [new TextRun(text)],
          }),
        ],
      },
    ],
  });
  return await Packer.toBuffer(doc);
};

const sampleTxtResume = `Priya Sharma
Email: priya.sharma@example.com | Location: San Francisco, CA

PROFESSIONAL SUMMARY
Experienced Full Stack Software Engineer with 5+ years specializing in React, Node.js, Express, and distributed MongoDB systems.

WORK EXPERIENCE
Senior Software Engineer - Acme Corp (2022 - Present)
- Architected and delivered resilient microservices handling 2M+ daily requests.
- Optimized database indexing, improving p95 query latency by 45%.

EDUCATION
B.S. in Computer Science - University of California, Berkeley (2018 - 2022)

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, SQL
Frameworks: React, Express, Node.js, Tailwind CSS
Databases & Cloud: MongoDB, Redis, AWS, Docker`;

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

beforeEach(async () => {
  await User.deleteMany({});
  await Resume.deleteMany({});

  // 1. Register User A
  const resA = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Priya Sharma',
    email: 'priya@example.com',
    password: 'Password123!',
  });
  userACookie = resA.headers['set-cookie'];
  userAId = resA.body.data.user.id;

  // 2. Register User B
  const resB = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Marcus Vance',
    email: 'marcus@example.com',
    password: 'Password123!',
  });
  userBCookie = resB.headers['set-cookie'];
  userBId = resB.body.data.user.id;
});

describe('Resume Upload & Ingestion Tests (POST /api/v1/resumes)', () => {
  it('should reject unauthenticated upload with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .attach('file', Buffer.from(sampleTxtResume), 'resume.txt');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should upload and parse valid TXT resume successfully', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', Buffer.from(sampleTxtResume), 'priya_resume.txt');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume).toBeDefined();
    expect(res.body.data.resume.fileFormat).toBe('txt');
    expect(res.body.data.resume.originalFileName).toBe('priya_resume.txt');
    expect(res.body.data.resume.wordCount).toBeGreaterThan(20);
    expect(res.body.data.resume.parsedSections.experience).toBe(true);
    expect(res.body.data.resume.parsedSections.education).toBe(true);
    expect(res.body.data.resume.parsedSections.skills).toBe(true);
  });

  it('should upload and parse valid PDF resume successfully', async () => {
    const pdfBuffer = await createPdfBuffer('Priya Sharma - Experienced Full Stack Engineer with React and Node.js');

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', pdfBuffer, 'priya_resume.pdf');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.fileFormat).toBe('pdf');
    expect(res.body.data.resume.rawText).toContain('Priya Sharma');
  });

  it('should upload and parse valid DOCX resume successfully', async () => {
    const docxBuffer = await createDocxBuffer('Marcus Vance - Cloud Infrastructure Architect with Kubernetes and Terraform');

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userBCookie)
      .attach('file', docxBuffer, 'marcus_resume.docx');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.fileFormat).toBe('docx');
    expect(res.body.data.resume.rawText).toContain('Marcus Vance');
  });

  it('should reject unsupported file extensions (e.g. .jpg, .exe)', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', Buffer.from('fake image content'), 'profile.jpg');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('INVALID_FILE');
  });

  it('should reject document with empty / insufficient text (< 20 chars)', async () => {
    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', Buffer.from('Too short'), 'short.txt');

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('PARSER_ERROR');
  });

  it('should reject file exceeding 5MB limit', async () => {
    // 5.1 MB buffer
    const largeBuffer = Buffer.alloc(5.1 * 1024 * 1024, 'a');

    const res = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', largeBuffer, 'huge_resume.txt');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('FILE_TOO_LARGE');
  });
});

describe('Resume Management & IDOR Security Tests', () => {
  let userAResumeId;

  beforeEach(async () => {
    const uploadRes = await request(app)
      .post('/api/v1/resumes')
      .set('Cookie', userACookie)
      .attach('file', Buffer.from(sampleTxtResume), 'userA_resume.txt');

    userAResumeId = uploadRes.body.data.resume.id;
  });

  it('should list only the authenticated user resumes', async () => {
    // User A lists resumes -> should see 1
    const resA = await request(app)
      .get('/api/v1/resumes')
      .set('Cookie', userACookie);

    expect(resA.status).toBe(200);
    expect(resA.body.data.resumes.length).toBe(1);
    expect(resA.body.data.resumes[0].id).toBe(userAResumeId);

    // User B lists resumes -> should see 0
    const resB = await request(app)
      .get('/api/v1/resumes')
      .set('Cookie', userBCookie);

    expect(resB.status).toBe(200);
    expect(resB.body.data.resumes.length).toBe(0);
  });

  it('should allow owner (User A) to get details of their resume', async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${userAResumeId}`)
      .set('Cookie', userACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.resume.id).toBe(userAResumeId);
    expect(res.body.data.resume.rawText).toContain('PROFESSIONAL SUMMARY');
  });

  it('IDOR Protection: User B cannot access User A resume (returns 404)', async () => {
    const res = await request(app)
      .get(`/api/v1/resumes/${userAResumeId}`)
      .set('Cookie', userBCookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
  });

  it('IDOR Protection: User B cannot delete User A resume (returns 404)', async () => {
    const res = await request(app)
      .delete(`/api/v1/resumes/${userAResumeId}`)
      .set('Cookie', userBCookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);

    // Verify resume still exists in DB
    const checkDoc = await Resume.findById(userAResumeId);
    expect(checkDoc).not.toBeNull();
  });

  it('should allow owner (User A) to delete their resume', async () => {
    const res = await request(app)
      .delete(`/api/v1/resumes/${userAResumeId}`)
      .set('Cookie', userACookie);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify document deleted from DB
    const checkDoc = await Resume.findById(userAResumeId);
    expect(checkDoc).toBeNull();
  });

  it('should return 404 for invalid ObjectId parameter', async () => {
    const res = await request(app)
      .get('/api/v1/resumes/invalid-non-hex-id')
      .set('Cookie', userACookie);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('RESUME_NOT_FOUND');
  });
});
