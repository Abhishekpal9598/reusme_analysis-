import { z } from 'zod';
import { APPLICATION_STATUSES, SUPPORTED_CURRENCIES } from '../models/Application.js';

// Valid status transitions matrix for flexible, practical hiring pipelines
export const VALID_STATUS_TRANSITIONS = {
  Saved: ['Applied', 'Withdrawn', 'Saved'],
  Applied: ['Assessment', 'Interview', 'Rejected', 'Withdrawn', 'Applied'],
  Assessment: ['Interview', 'Rejected', 'Withdrawn', 'Assessment'],
  Interview: ['Assessment', 'Interview', 'Offer', 'Rejected', 'Withdrawn'],
  Offer: ['Withdrawn', 'Rejected', 'Offer'],
  Rejected: ['Applied', 'Saved', 'Rejected'],
  Withdrawn: ['Applied', 'Saved', 'Withdrawn'],
};

export const isValidTransition = (fromStatus, toStatus) => {
  if (!fromStatus || !toStatus) return false;
  if (!APPLICATION_STATUSES.includes(toStatus)) return false;
  // Allow all transitions in Kanban if status is in list, but provide transition helper
  const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
  return Array.isArray(allowed) ? allowed.includes(toStatus) : true;
};

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export const createApplicationSchema = z.object({
  companyName: z
    .string({ required_error: 'Company name is required' })
    .trim()
    .min(1, 'Company name is required')
    .max(150, 'Company name cannot exceed 150 characters'),
  positionTitle: z
    .string({ required_error: 'Position title is required' })
    .trim()
    .min(1, 'Position title is required')
    .max(150, 'Position title cannot exceed 150 characters'),
  status: z
    .enum(APPLICATION_STATUSES, {
      required_error: 'Status is required',
      invalid_type_error: 'Invalid application status',
    })
    .default('Saved'),
  jobUrl: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional(),
  location: z
    .string()
    .trim()
    .max(100, 'Location cannot exceed 100 characters')
    .optional(),
  employmentType: z
    .enum(['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'])
    .default('Full-Time'),
  salary: z
    .object({
      amount: z.number().min(0, 'Salary amount cannot be negative').nullable().optional(),
      currency: z.enum(SUPPORTED_CURRENCIES).default('USD'),
      period: z.enum(['Yearly', 'Monthly', 'Hourly']).default('Yearly'),
    })
    .optional(),
  salaryExpectation: z
    .number()
    .min(0, 'Salary expectation cannot be negative')
    .nullable()
    .optional(),
  resumeId: z
    .string()
    .regex(objectIdRegex, 'Invalid Resume ID format')
    .nullable()
    .or(z.literal(''))
    .optional(),
  jobAnalysisId: z
    .string()
    .regex(objectIdRegex, 'Invalid Job Analysis ID format')
    .nullable()
    .or(z.literal(''))
    .optional(),
  contactPerson: z
    .object({
      name: z.string().trim().max(100).optional(),
      email: z.string().trim().email('Invalid email').or(z.literal('')).optional(),
      phone: z.string().trim().max(30).optional(),
      role: z.string().trim().max(100).optional(),
    })
    .optional(),
  appliedDate: z.coerce.date().nullable().optional(),
  interviewDate: z.coerce.date().nullable().optional(),
  notes: z.string().trim().max(2000, 'Notes cannot exceed 2000 characters').optional(),
  initialNote: z.string().trim().max(3000, 'Initial note cannot exceed 3000 characters').optional(),
  tags: z.array(z.string().trim().max(50)).optional(),
});

export const updateApplicationSchema = createApplicationSchema.partial();

export const updateStatusSchema = z.object({
  status: z.enum(APPLICATION_STATUSES, {
    required_error: 'Status is required',
    invalid_type_error: 'Invalid application status',
  }),
});

export const interviewRoundSchema = z.object({
  roundName: z
    .string({ required_error: 'Round name is required' })
    .trim()
    .min(1, 'Round name is required')
    .max(100, 'Round name cannot exceed 100 characters'),
  roundType: z
    .enum([
      'Recruiter Screen',
      'Technical',
      'Behavioral',
      'System Design',
      'Hiring Manager',
      'Take-Home',
      'Other',
    ])
    .default('Technical'),
  scheduledDate: z.coerce.date({
    required_error: 'Scheduled date is required',
    invalid_type_error: 'Invalid scheduled date',
  }),
  format: z
    .enum(['Video Call', 'Phone', 'In-Person', 'Online Assessment'])
    .default('Video Call'),
  meetingLink: z
    .string()
    .trim()
    .url('Must be a valid URL')
    .or(z.literal(''))
    .optional(),
  location: z.string().trim().max(150).optional(),
  interviewerNames: z.string().trim().max(150).optional(),
  notes: z.string().trim().max(2000).optional(),
  completed: z.boolean().default(false),
});

export const updateInterviewRoundSchema = interviewRoundSchema.partial();

export const reminderSchema = z.object({
  title: z
    .string({ required_error: 'Reminder title is required' })
    .trim()
    .min(1, 'Reminder title is required')
    .max(150, 'Reminder title cannot exceed 150 characters'),
  reminderDate: z.coerce.date({
    required_error: 'Reminder date is required',
    invalid_type_error: 'Invalid reminder date',
  }),
  note: z.string().trim().max(1000).optional(),
});

export const noteSchema = z.object({
  content: z
    .string({ required_error: 'Note content is required' })
    .trim()
    .min(1, 'Note content is required')
    .max(3000, 'Note content cannot exceed 3000 characters'),
});
