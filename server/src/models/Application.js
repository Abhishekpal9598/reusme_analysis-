import mongoose from 'mongoose';

export const APPLICATION_STATUSES = [
  'Saved',
  'Applied',
  'Assessment',
  'Interview',
  'Offer',
  'Rejected',
  'Withdrawn',
];

export const SUPPORTED_CURRENCIES = ['USD', 'INR', 'EUR', 'GBP', 'CAD', 'AUD', 'SGD'];

export const LEGACY_STATUS_MAP = {
  Interviewing: 'Interview',
  Offered: 'Offer',
};

export const normalizeStatus = (val) => {
  if (!val) return 'Saved';
  return LEGACY_STATUS_MAP[val] || val;
};

// Subdocument: Scheduled Interview Rounds
const interviewRoundSchema = new mongoose.Schema(
  {
    roundName: {
      type: String,
      required: [true, 'Round name is required'],
      trim: true,
      maxlength: [100, 'Round name cannot exceed 100 characters'],
    },
    roundType: {
      type: String,
      enum: {
        values: [
          'Recruiter Screen',
          'Technical',
          'Behavioral',
          'System Design',
          'Hiring Manager',
          'Take-Home',
          'Other',
        ],
        message: '{VALUE} is not a supported round type',
      },
      default: 'Technical',
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Scheduled date is required'],
    },
    format: {
      type: String,
      enum: {
        values: ['Video Call', 'Phone', 'In-Person', 'Online Assessment'],
        message: '{VALUE} is not a supported interview format',
      },
      default: 'Video Call',
    },
    meetingLink: { type: String, trim: true, default: '' },
    location: { type: String, trim: true, default: '' },
    interviewerNames: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, maxlength: [2000, 'Notes cannot exceed 2,000 characters'], default: '' },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Subdocument: In-App Follow-up Reminders
const reminderSchema = new mongoose.Schema(
  {
    reminderDate: {
      type: Date,
      required: [true, 'Reminder date is required'],
    },
    title: {
      type: String,
      required: [true, 'Reminder title is required'],
      trim: true,
      maxlength: [150, 'Reminder title cannot exceed 150 characters'],
    },
    note: { type: String, trim: true, maxlength: [1000, 'Reminder note cannot exceed 1,000 characters'], default: '' },
    isCompleted: { type: Boolean, default: false },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Subdocument: Timeline Activity Notes
const noteSchema = new mongoose.Schema({
  content: {
    type: String,
    required: [true, 'Note content is required'],
    trim: true,
    maxlength: [3000, 'Note content cannot exceed 3,000 characters'],
  },
  author: {
    type: String,
    required: true,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const applicationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    companyName: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
    },
    positionTitle: {
      type: String,
      required: [true, 'Position title is required'],
      trim: true,
      maxlength: [150, 'Position title cannot exceed 150 characters'],
    },
    status: {
      type: String,
      required: [true, 'Status is required'],
      enum: {
        values: APPLICATION_STATUSES,
        message: '{VALUE} is not a supported application status',
      },
      set: normalizeStatus,
      default: 'Saved',
      index: true,
    },
    jobUrl: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      maxlength: [100, 'Location cannot exceed 100 characters'],
      default: '',
    },
    employmentType: {
      type: String,
      enum: {
        values: ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Freelance'],
        message: '{VALUE} is not a supported employment type',
      },
      default: 'Full-Time',
    },
    // Multi-currency structured salary
    salary: {
      amount: { type: Number, min: [0, 'Salary amount cannot be negative'], default: null },
      currency: {
        type: String,
        enum: {
          values: SUPPORTED_CURRENCIES,
          message: '{VALUE} is not a supported currency',
        },
        default: 'USD',
        uppercase: true,
      },
      period: {
        type: String,
        enum: ['Yearly', 'Monthly', 'Hourly'],
        default: 'Yearly',
      },
    },
    // Legacy salaryExpectation preserved for backward compatibility
    salaryExpectation: {
      type: Number,
      min: [0, 'Salary expectation cannot be negative'],
      default: null,
    },
    // Cross-document references
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      default: null,
    },
    jobAnalysisId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'JobAnalysis',
      default: null,
    },
    contactPerson: {
      name: { type: String, trim: true, maxlength: 100, default: '' },
      email: { type: String, trim: true, maxlength: 150, default: '' },
      phone: { type: String, trim: true, maxlength: 30, default: '' },
      role: { type: String, trim: true, maxlength: 100, default: '' },
    },
    // Preserved legacy fields
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes cannot exceed 2,000 characters'],
      default: '',
    },
    appliedDate: {
      type: Date,
      default: null,
    },
    interviewDate: {
      type: Date,
      default: null,
    },
    // Phase 8 structured subdocuments
    interviews: [interviewRoundSchema],
    reminders: [reminderSchema],
    timelineNotes: [noteSchema],
    tags: [{ type: String, trim: true, maxlength: 50 }],
  },
  {
    timestamps: true,
  }
);

// Compound indexes (avoiding duplicates)
applicationSchema.index({ userId: 1, status: 1 });
applicationSchema.index({ userId: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, createdAt: -1 });
applicationSchema.index({ userId: 1, 'interviews.scheduledDate': 1 });
applicationSchema.index({ userId: 1, 'reminders.reminderDate': 1, 'reminders.isCompleted': 1 });

// Read normalization hook: Translates legacy document status on read
applicationSchema.post('init', function () {
  if (this.status) {
    this.status = normalizeStatus(this.status);
  }
});

// Pre-validation hook: Normalizes status and synchronizes salaryExpectation
applicationSchema.pre('validate', function (next) {
  if (this.status) {
    this.status = normalizeStatus(this.status);
  }

  // Synchronize salaryExpectation and salary.amount
  if (this.salary?.amount !== undefined && this.salary?.amount !== null) {
    this.salaryExpectation = this.salary.amount;
  } else if (this.salaryExpectation !== undefined && this.salaryExpectation !== null) {
    if (!this.salary) {
      this.salary = { amount: this.salaryExpectation, currency: 'USD', period: 'Yearly' };
    } else {
      this.salary.amount = this.salaryExpectation;
    }
  }

  next();
});

applicationSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

export const Application = mongoose.models.Application || mongoose.model('Application', applicationSchema);
export default Application;
