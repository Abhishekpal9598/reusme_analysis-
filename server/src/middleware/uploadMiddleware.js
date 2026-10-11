import multer from 'multer';
import { sendError } from '../utils/apiResponse.js';

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
  'text/plain',
  'application/octet-stream', // Some browsers send octet-stream for docx
];

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.txt'];

const fileFilter = (req, file, cb) => {
  const originalName = file.originalname.toLowerCase();
  const hasValidExt = ALLOWED_EXTENSIONS.some((ext) => originalName.endsWith(ext));

  if (!hasValidExt) {
    return cb(new Error('Invalid file type. Supported formats: .pdf, .docx, .txt'), false);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB max
    files: 1,
  },
  fileFilter,
});

/**
 * Middleware wrapper to handle Multer upload and catch file size / type errors gracefully
 */
export const handleResumeUpload = (req, res, next) => {
  const uploadSingle = upload.single('file');

  uploadSingle(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return sendError(
          res,
          400,
          'FILE_TOO_LARGE',
          'File size exceeds the 5MB limit. Please upload a smaller document.'
        );
      }
      return sendError(res, 400, 'INVALID_FILE', err.message || 'File upload error');
    }

    if (!req.file) {
      return sendError(res, 400, 'MISSING_FILE', 'Please select a resume file to upload.');
    }

    next();
  });
};

export default handleResumeUpload;
