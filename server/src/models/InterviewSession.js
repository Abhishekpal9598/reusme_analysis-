import mongoose from 'mongoose';

/**
 * Legacy Difficulty Migration Map:
 * Maps legacy seniority-based difficulty values ('Junior', 'Mid', 'Senior')
 * to standard difficulty levels ('Easy', 'Medium', 'Hard').
 */
export const LEGACY_DIFFICULTY_MAP = {
  Junior: 'Easy',
  Mid: 'Medium',
  Senior: 'Hard',
};

export const normalizeDifficulty = (val) => {
  if (!val) return 'Medium';
  if (LEGACY_DIFFICULTY_MAP[val]) return LEGACY_DIFFICULTY_MAP[val];
  if (['Easy', 'Medium', 'Hard'].includes(val)) return val;
  return 'Medium';
};

const questionSubSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    category: {
      type: String,
      enum: ['Technical', 'Behavioral', 'Situational', 'HR', 'Role-Based', 'General'],
      default: 'Technical',
    },
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid question difficulty (must be Easy, Medium, or Hard)',
      },
      set: normalizeDifficulty,
      default: 'Medium',
    },
    sampleKeyPoints: {
      type: [String],
      default: [],
    },
    userAnswer: {
      type: String,
      default: '',
      trim: true,
    },
    answeredAt: {
      type: Date,
      default: null,
    },
    evaluation: {
      score: { type: Number, min: 0, max: 100 },
      rubricScores: {
        technicalAccuracy: { type: Number, min: 0, max: 100 },
        completeness: { type: Number, min: 0, max: 100 },
        clarity: { type: Number, min: 0, max: 100 },
        problemSolving: { type: Number, min: 0, max: 100 },
      },
      starAssessment: {
        isStarApplicable: { type: Boolean, default: false },
        situation: { type: String, default: '' },
        task: { type: String, default: '' },
        action: { type: String, default: '' },
        result: { type: String, default: '' },
        starFeedback: { type: String, default: '' },
      },
      strengths: { type: [String], default: [] },
      weaknesses: { type: [String], default: [] },
      missingPoints: { type: [String], default: [] },
      improvements: { type: [String], default: [] },
      modelAnswer: { type: String, default: '' },
      evaluatedAt: { type: Date, default: null },
    },
  },
  { _id: true }
);

const interviewSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },
    resumeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Resume',
      required: false,
      default: null,
    },
    jobRole: {
      type: String,
      required: [true, 'Job role is required'],
      trim: true,
      maxlength: [150, 'Job role cannot exceed 150 characters'],
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    // Strictly separated: Candidate Experience Level
    experienceLevel: {
      type: String,
      enum: {
        values: ['Junior', 'Mid', 'Senior', 'Lead'],
        message: '{VALUE} is not a valid experience level (must be Junior, Mid, Senior, or Lead)',
      },
      default: 'Mid',
    },
    category: {
      type: String,
      enum: ['Technical', 'HR', 'Behavioral', 'Role-Based', 'General'],
      default: 'Technical',
    },
    // Strictly separated: Interview Difficulty
    difficulty: {
      type: String,
      enum: {
        values: ['Easy', 'Medium', 'Hard'],
        message: '{VALUE} is not a valid interview difficulty (must be Easy, Medium, or Hard)',
      },
      set: normalizeDifficulty,
      default: 'Medium',
    },
    questionCount: {
      type: Number,
      default: 5,
      min: 1,
      max: 10,
    },
    status: {
      type: String,
      enum: ['in_progress', 'completed', 'abandoned'],
      default: 'in_progress',
      index: true,
    },
    questions: [questionSubSchema],
    overallReport: {
      overallScore: { type: Number, min: 0, max: 100 },
      verdict: {
        type: String,
        enum: ['Strong Hire', 'Hire', 'Leaning Hire', 'Needs Improvement'],
      },
      summary: { type: String, default: '' },
      categoryBreakdown: [
        {
          category: { type: String },
          score: { type: Number },
          questionsCount: { type: Number },
        },
      ],
      rubricAverages: {
        technicalAccuracy: { type: Number },
        completeness: { type: Number },
        clarity: { type: Number },
        problemSolving: { type: Number },
      },
      strengthsSummary: { type: [String], default: [] },
      weaknessesSummary: { type: [String], default: [] },
      studyRecommendations: { type: [String], default: [] },
      personalizedRoadmap: { type: [String], default: [] },
      disclaimer: {
        type: String,
        default:
          'This assessment is an AI-generated practice simulation for educational and preparation purposes only. Performance verdict indicators (Strong Hire, Hire, Leaning Hire, Needs Improvement) evaluate practice response quality and are not guarantees, predictions, or endorsements of actual hiring outcomes by any employer.',
      },
      completedAt: { type: Date, default: null },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: { createdAt: 'createdAt', updatedAt: 'updatedAt' },
  }
);

// Backward-compatible hooks for legacy database records
interviewSessionSchema.pre('validate', function (next) {
  // 1. Role synchronization
  if (this.jobRole && !this.jobTitle) {
    this.jobTitle = this.jobRole;
  } else if (this.jobTitle && !this.jobRole) {
    this.jobRole = this.jobTitle;
  }

  // 2. Legacy record recovery: if experienceLevel was unset but difficulty had legacy values
  if (!this.experienceLevel && this.difficulty) {
    if (['Junior', 'Mid', 'Senior'].includes(this.difficulty)) {
      this.experienceLevel = this.difficulty;
    }
  }

  // 3. Ensure all question difficulties are normalized
  if (this.questions && Array.isArray(this.questions)) {
    this.questions.forEach((q) => {
      if (q && q.difficulty) {
        q.difficulty = normalizeDifficulty(q.difficulty);
      }
    });
  }

  next();
});

interviewSessionSchema.index({ userId: 1, createdAt: -1 });
interviewSessionSchema.index({ userId: 1, status: 1 });

interviewSessionSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

export const InterviewSession =
  mongoose.models.InterviewSession || mongoose.model('InterviewSession', interviewSessionSchema);
export default InterviewSession;
