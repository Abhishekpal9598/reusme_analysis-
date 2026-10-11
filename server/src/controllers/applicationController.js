import mongoose from 'mongoose';
import { Application, APPLICATION_STATUSES } from '../models/Application.js';
import { Resume } from '../models/Resume.js';
import { JobAnalysis } from '../models/JobAnalysis.js';
import { sendSuccess, sendError } from '../utils/apiResponse.js';
import {
  createApplicationSchema,
  updateApplicationSchema,
  updateStatusSchema,
  interviewRoundSchema,
  updateInterviewRoundSchema,
  reminderSchema,
  noteSchema,
  isValidTransition,
} from '../validators/applicationValidators.js';

// Regex escape helper to prevent ReDoS / injection
const escapeRegex = (string) => string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whitelisted sorting fields
const WHITELISTED_SORT_FIELDS = [
  'createdAt',
  'updatedAt',
  'appliedDate',
  'companyName',
  'positionTitle',
  'status',
  'salaryExpectation',
];

/**
 * @route   GET /api/v1/applications
 * @desc    Get user applications with search, status filters, sorting, and pagination
 * @access  Protected
 */
export const listApplications = async (req, res, next) => {
  try {
    const { q, status, sortBy = 'createdAt', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const query = { userId: req.user._id };

    // Search on companyName or positionTitle
    if (q && q.trim()) {
      const sanitized = escapeRegex(q.trim());
      query.$or = [
        { companyName: { $regex: sanitized, $options: 'i' } },
        { positionTitle: { $regex: sanitized, $options: 'i' } },
      ];
    }

    // Filter by status if valid
    if (status && APPLICATION_STATUSES.includes(status)) {
      query.status = status;
    }

    // Sorting
    const sortField = WHITELISTED_SORT_FIELDS.includes(sortBy) ? sortBy : 'createdAt';
    const sortDirection = sortOrder === 'asc' ? 1 : -1;
    const sortOptions = { [sortField]: sortDirection };

    // Pagination bounds
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const [applications, totalCount] = await Promise.all([
      Application.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('resumeId', 'originalFileName')
        .populate('jobAnalysisId', 'jobTitle companyName overallMatchScore'),
      Application.countDocuments(query),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum) || 1;

    return sendSuccess(
      res,
      200,
      applications,
      'Applications retrieved successfully',
      {
        totalCount,
        page: pageNum,
        limit: limitNum,
        totalPages,
      }
    );
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/applications/analytics
 * @desc    Get pipeline analytics, conversion rates, and upcoming alerts
 * @access  Protected
 */
export const getApplicationAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const allApps = await Application.find({ userId });
    const totalApplications = allApps.length;

    // Status Breakdown dictionary with 0 defaults
    const statusBreakdown = {};
    APPLICATION_STATUSES.forEach((s) => {
      statusBreakdown[s] = 0;
    });

    let activePipeline = 0;
    let poolForConversion = 0; // Applied, Assessment, Interview, Offer, Rejected
    let interviewCount = 0; // Interview, Offer
    let offerCount = 0;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOf7Days = new Date(startOfToday.getTime() + 7 * 24 * 60 * 60 * 1000 + (24 * 60 * 60 * 1000 - 1));

    const upcomingInterviews = [];
    const upcomingReminders = [];
    const overdueReminders = [];
    let pendingFollowUpsCount = 0;

    allApps.forEach((app) => {
      const st = app.status;
      if (statusBreakdown[st] !== undefined) {
        statusBreakdown[st] += 1;
      }

      if (['Applied', 'Assessment', 'Interview', 'Offer'].includes(st)) {
        activePipeline += 1;
      }

      if (['Applied', 'Assessment', 'Interview', 'Offer', 'Rejected'].includes(st)) {
        poolForConversion += 1;
      }

      if (['Interview', 'Offer'].includes(st)) {
        interviewCount += 1;
      }

      if (st === 'Offer') {
        offerCount += 1;
      }

      // Check upcoming interviews in subdocuments
      if (Array.isArray(app.interviews)) {
        app.interviews.forEach((inv) => {
          if (!inv.completed && inv.scheduledDate) {
            const schDate = new Date(inv.scheduledDate);
            if (schDate >= startOfToday && schDate <= endOf7Days) {
              upcomingInterviews.push({
                applicationId: app._id,
                companyName: app.companyName,
                positionTitle: app.positionTitle,
                roundId: inv._id,
                roundName: inv.roundName,
                roundType: inv.roundType,
                scheduledDate: inv.scheduledDate,
                format: inv.format,
                meetingLink: inv.meetingLink,
                location: inv.location,
              });
            }
          }
        });
      }

      // Check reminders in subdocuments
      if (Array.isArray(app.reminders)) {
        app.reminders.forEach((rem) => {
          if (!rem.isCompleted && rem.reminderDate) {
            pendingFollowUpsCount += 1;
            const rDate = new Date(rem.reminderDate);
            const reminderItem = {
              applicationId: app._id,
              companyName: app.companyName,
              positionTitle: app.positionTitle,
              reminderId: rem._id,
              title: rem.title,
              note: rem.note,
              reminderDate: rem.reminderDate,
            };

            if (rDate < startOfToday) {
              overdueReminders.push(reminderItem);
            } else if (rDate <= endOf7Days) {
              upcomingReminders.push(reminderItem);
            }
          }
        });
      }
    });

    // Safe rates calculation with zero denominator guards
    const interviewConversionRate =
      poolForConversion > 0
        ? Number(((interviewCount / poolForConversion) * 100).toFixed(1))
        : 0.0;

    const offerRate =
      poolForConversion > 0
        ? Number(((offerCount / poolForConversion) * 100).toFixed(1))
        : 0.0;

    // Sort upcoming events by earliest date
    upcomingInterviews.sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));
    upcomingReminders.sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate));
    overdueReminders.sort((a, b) => new Date(a.reminderDate) - new Date(b.reminderDate));

    const analytics = {
      totalApplications,
      activePipeline,
      interviewConversionRate,
      offerRate,
      upcomingInterviewsCount: upcomingInterviews.length,
      pendingFollowUpsCount,
      statusBreakdown,
      upcomingInterviews,
      upcomingReminders,
      overdueReminders,
    };

    return sendSuccess(res, 200, analytics, 'Application analytics calculated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   GET /api/v1/applications/:id
 * @desc    Get detailed application by ID (IDOR protected)
 * @access  Protected
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const application = await Application.findOne({
      _id: id,
      userId: req.user._id,
    })
      .populate('resumeId', 'originalFileName fileType')
      .populate('jobAnalysisId', 'jobTitle companyName overallMatchScore matchedSkills missingSkills');

    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    return sendSuccess(res, 200, application, 'Application retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   POST /api/v1/applications
 * @desc    Create a new job application (with ownership check on referenced documents)
 * @access  Protected
 */
export const createApplication = async (req, res, next) => {
  try {
    const validation = createApplicationSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid application data'
      );
    }

    const data = validation.data;

    // Cross-document ownership validation: Resume
    if (data.resumeId) {
      const resume = await Resume.findOne({ _id: data.resumeId, userId: req.user._id });
      if (!resume) {
        return sendError(
          res,
          400,
          'INVALID_RESUME_REFERENCE',
          'Referenced resume not found or does not belong to your account.'
        );
      }
    }

    // Cross-document ownership validation: JobAnalysis
    if (data.jobAnalysisId) {
      const jobAnalysis = await JobAnalysis.findOne({
        _id: data.jobAnalysisId,
        userId: req.user._id,
      });
      if (!jobAnalysis) {
        return sendError(
          res,
          400,
          'INVALID_JOB_ANALYSIS_REFERENCE',
          'Referenced job analysis not found or does not belong to your account.'
        );
      }
    }

    const timelineNotes = [];
    if (data.initialNote && data.initialNote.trim()) {
      timelineNotes.push({
        content: data.initialNote.trim(),
        author: req.user.fullName || 'Candidate',
        createdAt: new Date(),
      });
    }

    // If appliedDate is unset but status is Applied, auto-set appliedDate to now
    let appliedDate = data.appliedDate || null;
    if (data.status === 'Applied' && !appliedDate) {
      appliedDate = new Date();
    }

    const application = new Application({
      ...data,
      userId: req.user._id,
      appliedDate,
      timelineNotes,
    });

    await application.save();

    return sendSuccess(res, 201, application, 'Job application created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PUT /api/v1/applications/:id
 * @desc    Update job application details (IDOR protected)
 * @access  Protected
 */
export const updateApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const validation = updateApplicationSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid application update data'
      );
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const data = validation.data;

    // Cross-document ownership validation: Resume
    if (data.resumeId) {
      const resume = await Resume.findOne({ _id: data.resumeId, userId: req.user._id });
      if (!resume) {
        return sendError(
          res,
          400,
          'INVALID_RESUME_REFERENCE',
          'Referenced resume not found or does not belong to your account.'
        );
      }
    }

    // Cross-document ownership validation: JobAnalysis
    if (data.jobAnalysisId) {
      const jobAnalysis = await JobAnalysis.findOne({
        _id: data.jobAnalysisId,
        userId: req.user._id,
      });
      if (!jobAnalysis) {
        return sendError(
          res,
          400,
          'INVALID_JOB_ANALYSIS_REFERENCE',
          'Referenced job analysis not found or does not belong to your account.'
        );
      }
    }

    // If status changed, validate transition and log timeline note
    if (data.status && data.status !== application.status) {
      if (!isValidTransition(application.status, data.status)) {
        return sendError(
          res,
          400,
          'INVALID_STATUS_TRANSITION',
          `Cannot transition application status from '${application.status}' to '${data.status}'.`
        );
      }
      application.timelineNotes.push({
        content: `Status updated from ${application.status} to ${data.status}.`,
        author: req.user.fullName || 'Candidate',
        createdAt: new Date(),
      });
      if (data.status === 'Applied' && !application.appliedDate && !data.appliedDate) {
        application.appliedDate = new Date();
      }
    }

    // Merge updates
    Object.assign(application, data);
    await application.save();

    return sendSuccess(res, 200, application, 'Job application updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/applications/:id/status
 * @desc    Quick status change (e.g. Kanban column move) with state machine validation
 * @access  Protected
 */
export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const validation = updateStatusSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid status provided'
      );
    }

    const { status: targetStatus } = validation.data;

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    if (application.status === targetStatus) {
      return sendSuccess(res, 200, application, 'Status is already set to target status');
    }

    if (!isValidTransition(application.status, targetStatus)) {
      return sendError(
        res,
        400,
        'INVALID_STATUS_TRANSITION',
        `Cannot transition application status from '${application.status}' to '${targetStatus}'.`
      );
    }

    const prevStatus = application.status;
    application.status = targetStatus;

    if (targetStatus === 'Applied' && !application.appliedDate) {
      application.appliedDate = new Date();
    }

    application.timelineNotes.push({
      content: `Moved status from ${prevStatus} to ${targetStatus}.`,
      author: req.user.fullName || 'Candidate',
      createdAt: new Date(),
    });

    await application.save();

    return sendSuccess(res, 200, application, `Application status updated to ${targetStatus}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/applications/:id
 * @desc    Delete job application (IDOR protected)
 * @access  Protected
 */
export const deleteApplication = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const result = await Application.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!result) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    return sendSuccess(res, 200, { id }, 'Job application deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUBDOCUMENT CONTROLLERS: INTERVIEWS
// ============================================================================

/**
 * @route   POST /api/v1/applications/:id/interviews
 * @desc    Schedule interview round on application
 * @access  Protected
 */
export const addInterviewRound = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const validation = interviewRoundSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid interview data'
      );
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const newInterview = validation.data;
    application.interviews.push(newInterview);

    // If application was in Saved or Applied, auto-advance or suggest Interview status
    if (['Saved', 'Applied'].includes(application.status)) {
      application.status = 'Interview';
    }

    application.timelineNotes.push({
      content: `Scheduled ${newInterview.roundType} interview (${newInterview.roundName}) on ${new Date(newInterview.scheduledDate).toLocaleDateString()}.`,
      author: req.user.fullName || 'Candidate',
      createdAt: new Date(),
    });

    await application.save();

    const createdInterview = application.interviews[application.interviews.length - 1];

    return sendSuccess(res, 201, createdInterview, 'Interview round scheduled successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/applications/:id/interviews/:interviewId
 * @desc    Update or mark complete an interview round
 * @access  Protected
 */
export const updateInterviewRound = async (req, res, next) => {
  try {
    const { id, interviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(interviewId)) {
      return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid ID format.');
    }

    const validation = updateInterviewRoundSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid interview update data'
      );
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const interview = application.interviews.id(interviewId);
    if (!interview) {
      return sendError(res, 404, 'INTERVIEW_NOT_FOUND', 'Interview round not found in this application.');
    }

    Object.assign(interview, validation.data);
    await application.save();

    return sendSuccess(res, 200, interview, 'Interview round updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/applications/:id/interviews/:interviewId
 * @desc    Delete an interview round
 * @access  Protected
 */
export const deleteInterviewRound = async (req, res, next) => {
  try {
    const { id, interviewId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(interviewId)) {
      return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid ID format.');
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const interview = application.interviews.id(interviewId);
    if (!interview) {
      return sendError(res, 404, 'INTERVIEW_NOT_FOUND', 'Interview round not found.');
    }

    interview.deleteOne();
    await application.save();

    return sendSuccess(res, 200, { interviewId }, 'Interview round deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUBDOCUMENT CONTROLLERS: REMINDERS (IN-APP ONLY)
// ============================================================================

/**
 * @route   POST /api/v1/applications/:id/reminders
 * @desc    Add a follow-up reminder
 * @access  Protected
 */
export const addReminder = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const validation = reminderSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid reminder data'
      );
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const newReminder = validation.data;
    application.reminders.push(newReminder);
    await application.save();

    const createdReminder = application.reminders[application.reminders.length - 1];

    return sendSuccess(res, 201, createdReminder, 'Follow-up reminder created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   PATCH /api/v1/applications/:id/reminders/:reminderId/toggle
 * @desc    Toggle reminder completion status
 * @access  Protected
 */
export const toggleReminder = async (req, res, next) => {
  try {
    const { id, reminderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reminderId)) {
      return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid ID format.');
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const reminder = application.reminders.id(reminderId);
    if (!reminder) {
      return sendError(res, 404, 'REMINDER_NOT_FOUND', 'Follow-up reminder not found.');
    }

    reminder.isCompleted = !reminder.isCompleted;
    reminder.completedAt = reminder.isCompleted ? new Date() : null;

    await application.save();

    return sendSuccess(res, 200, reminder, `Reminder marked ${reminder.isCompleted ? 'completed' : 'pending'}`);
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/applications/:id/reminders/:reminderId
 * @desc    Delete a follow-up reminder
 * @access  Protected
 */
export const deleteReminder = async (req, res, next) => {
  try {
    const { id, reminderId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(reminderId)) {
      return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid ID format.');
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const reminder = application.reminders.id(reminderId);
    if (!reminder) {
      return sendError(res, 404, 'REMINDER_NOT_FOUND', 'Follow-up reminder not found.');
    }

    reminder.deleteOne();
    await application.save();

    return sendSuccess(res, 200, { reminderId }, 'Follow-up reminder deleted successfully');
  } catch (error) {
    next(error);
  }
};

// ============================================================================
// SUBDOCUMENT CONTROLLERS: TIMELINE NOTES
// ============================================================================

/**
 * @route   POST /api/v1/applications/:id/notes
 * @desc    Add a timeline note (Author forcefully assigned on backend)
 * @access  Protected
 */
export const addNote = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return sendError(res, 400, 'INVALID_APPLICATION_ID', 'Invalid application ID format.');
    }

    const validation = noteSchema.safeParse(req.body);
    if (!validation.success) {
      const issue = validation.error.issues[0];
      return sendError(
        res,
        400,
        'VALIDATION_ERROR',
        issue ? `${issue.path.join('.')}: ${issue.message}` : 'Invalid note content'
      );
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    // Server-assigned author name (never trusts client author string)
    const newNote = {
      content: validation.data.content,
      author: req.user.fullName || 'Candidate',
      createdAt: new Date(),
    };

    application.timelineNotes.push(newNote);
    await application.save();

    const createdNote = application.timelineNotes[application.timelineNotes.length - 1];

    return sendSuccess(res, 201, createdNote, 'Timeline note added successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * @route   DELETE /api/v1/applications/:id/notes/:noteId
 * @desc    Delete a timeline note
 * @access  Protected
 */
export const deleteNote = async (req, res, next) => {
  try {
    const { id, noteId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id) || !mongoose.Types.ObjectId.isValid(noteId)) {
      return sendError(res, 400, 'INVALID_ID_FORMAT', 'Invalid ID format.');
    }

    const application = await Application.findOne({ _id: id, userId: req.user._id });
    if (!application) {
      return sendError(res, 404, 'APPLICATION_NOT_FOUND', 'Job application not found.');
    }

    const note = application.timelineNotes.id(noteId);
    if (!note) {
      return sendError(res, 404, 'NOTE_NOT_FOUND', 'Timeline note not found.');
    }

    note.deleteOne();
    await application.save();

    return sendSuccess(res, 200, { noteId }, 'Timeline note deleted successfully');
  } catch (error) {
    next(error);
  }
};
