import { extractText as extractPdfText } from 'unpdf';
import mammoth from 'mammoth';
import JSZip from 'jszip';
import { Worker } from 'node:worker_threads';
import path from 'path';
import { fileURLToPath } from 'url';
import { env } from '../config/env.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const workerPath = path.resolve(__dirname, './parserWorker.js');

// Security thresholds and decompression bounds
export const MAX_PDF_PAGES = 30;
export const MAX_DOCX_ENTRIES = 500;
export const MAX_TOTAL_UNCOMPRESSED_SIZE = 30 * 1024 * 1024; // 30 MB
export const MAX_SINGLE_ENTRY_SIZE = 15 * 1024 * 1024; // 15 MB
export const MAX_EXTRACTED_CHARS = 100000; // 100,000 characters
export const MIN_EXTRACTED_CHARS = 20;

export class ParserTimeoutError extends Error {
  constructor(message = 'Document parsing timed out. The document may be corrupted or excessively complex.') {
    super(message);
    this.name = 'ParserTimeoutError';
    this.code = 'PARSER_TIMEOUT';
    this.statusCode = 422;
  }
}

/**
 * Strict file format and integrity validation.
 * Verifies magic bytes, container headers, and structural integrity.
 * Never falls back to trusting file extensions without header verification.
 */
export const detectFormat = async (buffer, originalname = '') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded file buffer is empty (0 bytes).');
  }

  const ext = originalname.split('.').pop()?.toLowerCase();

  if (!ext || !['pdf', 'docx', 'txt'].includes(ext)) {
    throw new Error('Unsupported file extension. Supported formats: .pdf, .docx, .txt');
  }

  // 1. PDF strict validation: expected signature %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (ext === 'pdf') {
    if (
      buffer.length < 5 ||
      buffer[0] !== 0x25 ||
      buffer[1] !== 0x50 ||
      buffer[2] !== 0x44 ||
      buffer[3] !== 0x46 ||
      buffer[4] !== 0x2d
    ) {
      throw new Error('Invalid PDF format: File lacks valid %PDF- header signature. Renamed or corrupted files are rejected.');
    }
    return 'pdf';
  }

  // 2. DOCX strict validation: OOXML ZIP container signature PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (ext === 'docx') {
    if (
      buffer.length < 4 ||
      buffer[0] !== 0x50 ||
      buffer[1] !== 0x4b ||
      (buffer[2] !== 0x03 && buffer[2] !== 0x05 && buffer[2] !== 0x07) ||
      (buffer[3] !== 0x04 && buffer[3] !== 0x06 && buffer[3] !== 0x08)
    ) {
      throw new Error('Invalid DOCX format: File lacks valid ZIP container signature.');
    }

    let zip;
    try {
      zip = await JSZip.loadAsync(buffer);
    } catch (zipErr) {
      throw new Error(`Corrupted DOCX archive: ${zipErr.message || 'Unable to read ZIP container.'}`);
    }

    const entryNames = Object.keys(zip.files);
    if (entryNames.length > MAX_DOCX_ENTRIES) {
      throw new Error(`Suspicious DOCX archive: entry count (${entryNames.length}) exceeds maximum limit (${MAX_DOCX_ENTRIES}).`);
    }

    // Mandatory DOCX structural element
    if (!zip.file('word/document.xml')) {
      throw new Error('Invalid DOCX structure: Missing required word/document.xml entry. Arbitrary ZIP archives are not supported.');
    }

    // Zip bomb / decompression limit protection
    let totalUncompressed = 0;
    for (const name of entryNames) {
      const entry = zip.files[name];
      const uncompressedSize = entry._data?.uncompressedSize || 0;
      if (uncompressedSize > MAX_SINGLE_ENTRY_SIZE) {
        throw new Error(`Suspicious DOCX archive: entry "${name}" exceeds single file decompression limit.`);
      }
      totalUncompressed += uncompressedSize;
    }

    if (totalUncompressed > MAX_TOTAL_UNCOMPRESSED_SIZE) {
      throw new Error('Suspicious DOCX archive: total uncompressed size exceeds 30MB limit.');
    }

    return 'docx';
  }

  // 3. TXT strict validation: ensure clean UTF-8 text without binary null bytes or excessive control sequences
  if (ext === 'txt') {
    if (buffer.includes(0)) {
      throw new Error('Invalid TXT format: File contains binary null bytes.');
    }

    let decoded;
    try {
      const decoder = new TextDecoder('utf-8', { fatal: true });
      decoded = decoder.decode(buffer);
    } catch {
      throw new Error('Invalid TXT format: File is not valid UTF-8 text.');
    }

    let controlCharCount = 0;
    const sampleLength = Math.min(decoded.length, 2048);
    for (let i = 0; i < sampleLength; i++) {
      const code = decoded.charCodeAt(i);
      // Allow whitespace \t (9), \n (10), \r (13); count other control codes (< 32 or 127)
      if ((code < 32 && code !== 9 && code !== 10 && code !== 13) || code === 127) {
        controlCharCount++;
      }
    }

    if (controlCharCount > 5) {
      throw new Error('Invalid TXT format: File contains non-printable binary control characters.');
    }

    return 'txt';
  }

  throw new Error('Unsupported or unrecognized file format. Supported formats: .pdf, .docx, .txt');
};

/**
 * Extract text sections heuristic
 */
export const detectSections = (text) => {
  const normalized = text.toLowerCase();

  const sections = {
    summary: /(summary|profile|about me|objective|professional summary)/i.test(normalized),
    experience: /(experience|work history|employment|professional experience|career history)/i.test(normalized),
    education: /(education|academic background|qualifications|degrees|university)/i.test(normalized),
    skills: /(skills|technical skills|competencies|core competencies|technologies)/i.test(normalized),
    projects: /(projects|key projects|personal projects|portfolio)/i.test(normalized),
    certifications: /(certifications|licenses|courses|accreditations)/i.test(normalized),
  };

  return sections;
};

/**
 * Clean and normalize extracted document text
 */
export const cleanExtractedText = (text) => {
  if (!text) return '';
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[\u0000-\u0008\u000B-\u000C\u000E-\u001F\u007F-\u009F]/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Core parsing execution with format-specific extractors and limits
 */
export const parseDocumentInternal = async (buffer, originalname = '') => {
  const format = await detectFormat(buffer, originalname);
  let extractedText = '';

  try {
    if (format === 'pdf') {
      const { text, totalPages } = await extractPdfText(new Uint8Array(buffer));
      if (totalPages && totalPages > MAX_PDF_PAGES) {
        throw new Error(`PDF exceeds maximum allowed page count (${MAX_PDF_PAGES} pages). Document contains ${totalPages} pages.`);
      }
      extractedText = Array.isArray(text) ? text.join('\n\n') : (text || '');
    } else if (format === 'docx') {
      const result = await mammoth.extractRawText({ buffer });
      extractedText = result.value || '';
    } else if (format === 'txt') {
      extractedText = buffer.toString('utf-8');
    }
  } catch (err) {
    throw new Error(`Failed to parse ${format.toUpperCase()} document: ${err.message || 'Malformed or encrypted file'}`);
  }

  let cleanText = cleanExtractedText(extractedText);

  if (!cleanText || cleanText.length < MIN_EXTRACTED_CHARS) {
    throw new Error(`Uploaded document contains no extractable or readable text (minimum ${MIN_EXTRACTED_CHARS} characters required).`);
  }

  if (cleanText.length > MAX_EXTRACTED_CHARS) {
    cleanText = cleanText.slice(0, MAX_EXTRACTED_CHARS);
  }

  const words = cleanText.split(/\s+/).filter(Boolean);
  const sections = detectSections(cleanText);

  return {
    rawText: cleanText,
    fileFormat: format,
    wordCount: words.length,
    characterCount: cleanText.length,
    parsedSections: sections,
  };
};

/**
 * Public document parsing entrypoint with worker-thread isolation and timeout termination.
 * If processing exceeds timeoutMs, worker.terminate() halts the thread immediately.
 */
export const parseDocument = async (buffer, originalname = '', options = {}) => {
  const timeoutMs = options.timeoutMs || env.PARSER_TIMEOUT_MS || 10000;

  // Direct in-process execution bypass (e.g. for lightweight testing if requested)
  if (options.direct) {
    return parseDocumentInternal(buffer, originalname);
  }

  return new Promise((resolve, reject) => {
    let worker;
    let timer;
    let isSettled = false;

    const cleanup = () => {
      if (timer) clearTimeout(timer);
    };

    try {
      worker = new Worker(workerPath, {
        workerData: { buffer, originalname },
      });
    } catch {
      cleanup();
      return parseDocumentInternal(buffer, originalname).then(resolve).catch(reject);
    }

    timer = setTimeout(async () => {
      if (isSettled) return;
      isSettled = true;
      try {
        await worker.terminate();
      } catch {
        // Ignore termination errors
      }
      reject(new ParserTimeoutError(`Document parsing timed out after ${timeoutMs}ms. The document may be corrupted or excessively complex.`));
    }, timeoutMs);

    worker.on('message', (msg) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      if (msg.success) {
        resolve(msg.result);
      } else {
        reject(new Error(msg.error || 'Failed to parse document.'));
      }
    });

    worker.on('error', (err) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      reject(err);
    });

    worker.on('exit', (code) => {
      if (isSettled) return;
      isSettled = true;
      cleanup();
      if (code !== 0) {
        reject(new Error(`Parser worker thread exited abnormally with code ${code}.`));
      }
    });
  });
};

export default {
  detectFormat,
  detectSections,
  cleanExtractedText,
  parseDocumentInternal,
  parseDocument,
  ParserTimeoutError,
  MAX_PDF_PAGES,
  MAX_DOCX_ENTRIES,
  MAX_TOTAL_UNCOMPRESSED_SIZE,
  MAX_SINGLE_ENTRY_SIZE,
  MAX_EXTRACTED_CHARS,
  MIN_EXTRACTED_CHARS,
};
