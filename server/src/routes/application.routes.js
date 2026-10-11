import { Router } from 'express';
import {
  listApplications,
  getApplicationAnalytics,
  getApplicationById,
  createApplication,
  updateApplication,
  updateApplicationStatus,
  deleteApplication,
  addInterviewRound,
  updateInterviewRound,
  deleteInterviewRound,
  addReminder,
  toggleReminder,
  deleteReminder,
  addNote,
  deleteNote,
} from '../controllers/applicationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = Router();

// Enforce authentication across all application tracker routes
router.use(authMiddleware);

// Core CRUD & Pipeline Operations
router.get('/', listApplications);
router.get('/analytics', getApplicationAnalytics);
router.get('/:id', getApplicationById);
router.post('/', createApplication);
router.put('/:id', updateApplication);
router.patch('/:id/status', updateApplicationStatus);
router.delete('/:id', deleteApplication);

// Subdocuments: Interview Scheduling
router.post('/:id/interviews', addInterviewRound);
router.patch('/:id/interviews/:interviewId', updateInterviewRound);
router.delete('/:id/interviews/:interviewId', deleteInterviewRound);

// Subdocuments: Follow-up Reminders (In-App)
router.post('/:id/reminders', addReminder);
router.patch('/:id/reminders/:reminderId/toggle', toggleReminder);
router.delete('/:id/reminders/:reminderId', deleteReminder);

// Subdocuments: Timeline Activity Notes
router.post('/:id/notes', addNote);
router.delete('/:id/notes/:noteId', deleteNote);

export default router;
