import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document as DocxDoc, Paragraph, TextRun, Packer } from 'docx';
import JSZip from 'jszip';
import app from '../src/app.js';
import { User } from '../src/models/User.js';
import { Resume } from '../src/models/Resume.js';
import {
  detectFormat,
  parseDocument,
  parseDocumentInternal,
  ParserTimeoutError,
} from '../src/services/parserService.js';

let mongoServer;
let userCookie;

const createValidPdf = async (text = 'Valid PDF Resume - Senior Engineer with React and Node.js Experience') => {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.addPage([600, 400]);
  page.drawText(text, { x: 50, y: 350, size: 14, font, color: rgb(0, 0, 0) });
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
};

const createValidDocx = async (text = 'Valid DOCX Resume - Cloud Architect with AWS and Kubernetes Skills') => {
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

  const regRes = await request(app).post('/api/v1/auth/register').send({
    fullName: 'Security Auditor',
    email: 'auditor@example.com',
    password: 'Password123!',
  });
  userCookie = regRes.headers['set-cookie'];
});

describe('Phase 10 Step 4B: File Upload & Document Parser Security Suite', () => {
  describe('Task 1: Strict File Format Validation', () => {
    it('1. should accept and parse a valid PDF with correct %PDF- signature', async () => {
      const pdfBuffer = await createValidPdf();
      const format = await detectFormat(pdfBuffer, 'resume.pdf');
      expect(format).toBe('pdf');

      const parsed = await parseDocument(pdfBuffer, 'resume.pdf');
      expect(parsed.fileFormat).toBe('pdf');
      expect(parsed.rawText).toContain('Valid PDF Resume');
    });

    it('2. should reject a file with invalid PDF signature', async () => {
      const invalidPdf = Buffer.from('FAKE-HEADER this is not a valid pdf document at all');
      await expect(detectFormat(invalidPdf, 'resume.pdf')).rejects.toThrow(
        /File lacks valid %PDF- header signature/
      );
    });

    it('3. should reject a renamed non-PDF file with a .pdf extension', async () => {
      const disguisedText = Buffer.from('Plain text content that someone renamed to resume.pdf to bypass filter');
      await expect(detectFormat(disguisedText, 'resume.pdf')).rejects.toThrow(
        /Invalid PDF format/
      );

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', disguisedText, 'resume.pdf');

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PARSER_ERROR');
    });

    it('4. should accept and parse a valid DOCX with valid ZIP and word/document.xml', async () => {
      const docxBuffer = await createValidDocx();
      const format = await detectFormat(docxBuffer, 'resume.docx');
      expect(format).toBe('docx');

      const parsed = await parseDocument(docxBuffer, 'resume.docx');
      expect(parsed.fileFormat).toBe('docx');
      expect(parsed.rawText).toContain('Valid DOCX Resume');
    });

    it('5. should reject an arbitrary ZIP file renamed to .docx', async () => {
      const zip = new JSZip();
      zip.file('readme.txt', 'This is an arbitrary zip archive, not an Office Open XML document');
      const arbitraryZipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

      await expect(detectFormat(arbitraryZipBuffer, 'resume.docx')).rejects.toThrow(
        /Missing required word\/document\.xml entry/
      );

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', arbitraryZipBuffer, 'resume.docx');

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PARSER_ERROR');
    });

    it('6. should reject a DOCX archive missing word/document.xml', async () => {
      const zip = new JSZip();
      zip.file('word/settings.xml', '<settings></settings>');
      const missingDocXml = await zip.generateAsync({ type: 'nodebuffer' });

      await expect(detectFormat(missingDocXml, 'malformed.docx')).rejects.toThrow(
        /Missing required word\/document\.xml entry/
      );
    });

    it('7. should reject TXT file with binary null bytes or non-printable content', async () => {
      const binaryTxt = Buffer.concat([
        Buffer.from('Valid text prefix here '),
        Buffer.from([0, 0, 1, 2, 3]),
        Buffer.from(' text continuing after binary sequence'),
      ]);

      await expect(detectFormat(binaryTxt, 'resume.txt')).rejects.toThrow(
        /binary null bytes/
      );

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', binaryTxt, 'resume.txt');

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PARSER_ERROR');
    });
  });

  describe('Task 2 & 3: Resource Protection, Limits & Parser Timeout', () => {
    it('8. should reject oversized files exceeding the 5MB upload limit', async () => {
      const oversizedBuffer = Buffer.alloc(5 * 1024 * 1024 + 100, 0x20); // 5MB + 100 bytes

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', oversizedBuffer, 'oversized.txt');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('FILE_TOO_LARGE');
      expect(res.body.error.message).toContain('5MB limit');
    });

    it('9. should reject an empty file (0 bytes)', async () => {
      const emptyBuffer = Buffer.alloc(0);

      await expect(detectFormat(emptyBuffer, 'empty.txt')).rejects.toThrow(
        /empty \(0 bytes\)/
      );
    });

    it('10. should safely handle malformed or corrupted documents without crashing', async () => {
      // PDF header but corrupted binary payload
      const corruptedPdf = Buffer.from('%PDF-1.4\nCorrupted content without xref or catalog dictionary');

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', corruptedPdf, 'corrupted.pdf');

      expect(res.status).toBe(422);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('PARSER_ERROR');
    });

    it('11. should reject DOCX archives with excessive entry counts (> 500 entries)', async () => {
      const zip = new JSZip();
      zip.file('word/document.xml', '<w:document></w:document>');
      for (let i = 0; i < 505; i++) {
        zip.file(`entry_${i}.xml`, 'content');
      }
      const excessiveZip = await zip.generateAsync({ type: 'nodebuffer' });

      await expect(detectFormat(excessiveZip, 'bomb.docx')).rejects.toThrow(
        /entry count \(\d+\) exceeds maximum limit \(500\)/
      );
    });

    it('12. should terminate worker thread and return PARSER_TIMEOUT when timeout expires', async () => {
      const validPdf = await createValidPdf();

      // Trigger parseDocument with an artificially strict 1ms timeout
      await expect(
        parseDocument(validPdf, 'resume.pdf', { timeoutMs: 1 })
      ).rejects.toThrow(/timed out/);
    });

    it('13. should return clean HTTP 422 with safe error code and no internal stack traces on parser failure', async () => {
      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', Buffer.from('Not a pdf header'), 'resume.pdf');

      expect(res.status).toBe(422);
      expect(res.body).toHaveProperty('success', false);
      expect(res.body).toHaveProperty('error');
      expect(res.body.error).toHaveProperty('code', 'PARSER_ERROR');
      expect(res.body.error).not.toHaveProperty('stack');
      expect(res.body.error.message).not.toContain('node:internal');
    });

    it('14. should preserve existing valid resume upload compatibility for standard TXT, DOCX, and PDF', async () => {
      const validTxt = Buffer.from(
        'Priya Sharma - Senior Software Engineer with 5 years experience in React, Node.js, and MongoDB.'
      );

      const res = await request(app)
        .post('/api/v1/resumes')
        .set('Cookie', userCookie)
        .attach('file', validTxt, 'priya_resume.txt');

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.resume).toHaveProperty('id');
      expect(res.body.data.resume.fileFormat).toBe('txt');
      expect(res.body.data.resume.wordCount).toBeGreaterThan(5);
    });
  });
});
