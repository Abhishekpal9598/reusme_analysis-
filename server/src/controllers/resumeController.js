import mongoose from 'mongoose';
import { Resume } from '../models/Resume.js';
import { parseDocument } from '../services/parserService.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';

/**
 * @route   POST /api/v1/resumes
 * @desc    Upload and parse resume document (PDF, DOCX, TXT)
 * @access  Protected
 */
export const uploadResume = async (req, res, next) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return sendError(res, 400, 'MISSING_FILE', 'No file was uploaded.');
    }

    // 1. Extract text and detect sections using parserService
    let parseResult;
    try {
      parseResult = await parseDocument(file.buffer, file.originalname);
    } catch (parseErr) {
      return sendError(
        res,
        422,
        'PARSER_ERROR',
        parseErr.message || 'Unable to parse document text. Please ensure the file is not corrupted or password-protected.'
      );
    }

    const { rawText, fileFormat, wordCount, characterCount, parsedSections } = parseResult;

    // 2. Persist Resume in MongoDB linked to authenticated user
    const resume = await Resume.create({
      userId: req.user._id,
      originalFileName: file.originalname,
      fileFormat,
      fileSize: file.size,
      rawText,
      wordCount,
      characterCount,
      parsedSections,
      parsingStatus: 'completed',
    });

    return sendSuccess(
      res,
      201,
      { resume: resume.toJSON() },
      'Resume uploaded and parsed successfully.'
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/resumes
 * @desc    List authenticated user's uploaded resumes
 * @access  Protected
 */
export const listResumes = async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [resumes, totalCount] = await Promise.all([
      Resume.find({ userId: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Resume.countDocuments({ userId: req.user._id }),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    return sendSuccess(
      res,
      200,
      {
        resumes: resumes.map((r) => r.toJSON()),
      },
      null,
      {
        page,
        limit,
        totalCount,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/resumes/:id
 * @desc    Get detailed extracted content of specific resume
 * @access  Protected
 */
export const getResumeById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    // IDOR protection: Compound query enforces userId ownership
    const resume = await Resume.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!resume) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    return sendSuccess(res, 200, { resume: resume.toJSON() });
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/resumes/:id
 * @desc    Delete specific resume record
 * @access  Protected
 */
export const deleteResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    // IDOR protection: findOneAndDelete scoped to owner
    const deleted = await Resume.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!deleted) {
      return sendError(res, 404, 'RESUME_NOT_FOUND', 'The requested resume was not found.');
    }

    return sendSuccess(res, 200, {}, 'Resume deleted successfully.');
  } catch (error) {
    next(error);
  }
};

export default { uploadResume, listResumes, getResumeById, deleteResume };
