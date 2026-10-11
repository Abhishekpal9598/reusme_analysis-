import { extractText as extractPdfText } from 'unpdf';
import mammoth from 'mammoth';

/**
 * Detect file format based on magic bytes and filename extension
 */
export const detectFormat = (buffer, originalname = '') => {
  if (!buffer || buffer.length === 0) {
    throw new Error('Uploaded file buffer is empty.');
  }

  const ext = originalname.split('.').pop()?.toLowerCase();

  // Check PDF signature: %PDF- (0x25 0x50 0x44 0x46 0x2D)
  if (
    buffer.length >= 5 &&
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46
  ) {
    return 'pdf';
  }

  // Check DOCX signature: PK.. (ZIP archive header for OOXML)
  if (
    buffer.length >= 4 &&
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    (buffer[2] === 0x03 || buffer[2] === 0x05 || buffer[2] === 0x07) &&
    (buffer[3] === 0x04 || buffer[3] === 0x06 || buffer[3] === 0x08)
  ) {
    return 'docx';
  }

  // Check TXT
  if (ext === 'txt') {
    let nullBytes = 0;
    for (let i = 0; i < Math.min(buffer.length, 512); i++) {
      if (buffer[i] === 0) nullBytes++;
    }
    if (nullBytes === 0) {
      return 'txt';
    }
  }

  // Fallback check on extension if signatures are matched
  if (ext === 'pdf') return 'pdf';
  if (ext === 'docx') return 'docx';
  if (ext === 'txt') return 'txt';

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
 * Parse document buffer and extract clean text
 */
export const parseDocument = async (buffer, originalname = '') => {
  const format = detectFormat(buffer, originalname);
  let extractedText = '';

  try {
    if (format === 'pdf') {
      const { text } = await extractPdfText(new Uint8Array(buffer));
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

  const cleanText = cleanExtractedText(extractedText);

  if (!cleanText || cleanText.length < 20) {
    throw new Error('Uploaded document contains no extractable or readable text (minimum 20 characters required).');
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

export default { detectFormat, detectSections, cleanExtractedText, parseDocument };
