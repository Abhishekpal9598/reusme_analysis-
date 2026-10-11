import mongoose from 'mongoose';

export const TARGET_LEVELS = ['Junior', 'Mid', 'Senior', 'Lead'];
export const MOMENTUM_STATUSES = ['Accelerating', 'Steady', 'Inactive'];
export const GENERATION_SOURCES = ['ai', 'heuristic'];
export const MILESTONE_CATEGORIES = [
  'Technical Skill',
  'Project Deliverable',
  'Interview Preparation',
  'Domain Knowledge',
  'Certification',
];
export const MILESTONE_PRIORITIES = ['High', 'Medium', 'Low'];
export const ROLE_CATEGORIES = ['Target Role', 'Growth Role', 'Lateral Role'];
export const PROFICIENCY_STATUSES = ['Mastered', 'Partial Gap', 'Critical Gap'];
export const ACTION_TYPES = [
  'RESUME_UPDATE',
  'INTERVIEW_PRACTICE',
  'APPLICATION_FOLLOWUP',
  'SKILL_STUDY',
  'JOB_MATCH',
];

// Subdocument 1: Roadmap Milestone
const roadmapMilestoneSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Milestone title is required'],
      trim: true,
      maxlength: [150, 'Milestone title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [1000, 'Description cannot exceed 1,000 characters'],
      default: '',
    },
    category: {
      type: String,
      enum: {
        values: MILESTONE_CATEGORIES,
        message: '{VALUE} is not a valid milestone category',
      },
      default: 'Technical Skill',
    },
    priority: {
      type: String,
      enum: {
        values: MILESTONE_PRIORITIES,
        message: '{VALUE} is not a valid priority',
      },
      default: 'High',
    },
    estimatedHours: {
      type: Number,
      min: [1, 'Estimated hours must be at least 1'],
      max: [200, 'Estimated hours cannot exceed 200'],
      default: 10,
    },
    completed: {
      type: Boolean,
      default: false,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    sourceAttribution: {
      type: String,
      enum: {
        values: ['user_gap', 'market_demand', 'ai_synthesized'],
        message: '{VALUE} is not a valid milestone attribution',
      },
      default: 'user_gap',
    },
  },
  { timestamps: true }
);

// Subdocument 2: Role Recommendation
const roleRecommendationSchema = new mongoose.Schema(
  {
    roleTitle: {
      type: String,
      required: [true, 'Role title is required'],
      trim: true,
      maxlength: [150, 'Role title cannot exceed 150 characters'],
    },
    category: {
      type: String,
      enum: {
        values: ROLE_CATEGORIES,
        message: '{VALUE} is not a valid role category',
      },
      default: 'Target Role',
    },
    alignmentScore: {
      type: Number,
      required: [true, 'Alignment score is required'],
      min: [0, 'Alignment score cannot be less than 0'],
      max: [100, 'Alignment score cannot exceed 100'],
    },
    matchedSkills: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      validate: [
        (val) => val.length <= 25,
        'Matched skills array cannot exceed 25 items',
      ],
      default: [],
    },
    missingSkills: {
      type: [{ type: String, trim: true, maxlength: 60 }],
      validate: [
        (val) => val.length <= 25,
        'Missing skills array cannot exceed 25 items',
      ],
      default: [],
    },
    rationale: {
      type: String,
      trim: true,
      maxlength: [1000, 'Rationale cannot exceed 1,000 characters'],
      default: '',
    },
    sourceAttribution: {
      type: String,
      enum: {
        values: ['skill_overlap', 'market_trend', 'ai_synthesized'],
        message: '{VALUE} is not a valid role attribution',
      },
      default: 'skill_overlap',
    },
  },
  { _id: false }
);

// Subdocument 3: Aggregated Skill Gap
const aggregatedSkillGapSchema = new mongoose.Schema(
  {
    skillName: {
      type: String,
      required: [true, 'Skill name is required'],
      trim: true,
      maxlength: [80, 'Skill name cannot exceed 80 characters'],
    },
    demandFrequency: {
      type: Number,
      min: [1, 'Demand frequency must be at least 1'],
      max: [1000, 'Demand frequency cannot exceed 1,000'],
      default: 1,
    },
    proficiencyStatus: {
      type: String,
      enum: {
        values: PROFICIENCY_STATUSES,
        message: '{VALUE} is not a valid proficiency status',
      },
      default: 'Critical Gap',
    },
    priority: {
      type: String,
      enum: {
        values: MILESTONE_PRIORITIES,
        message: '{VALUE} is not a valid skill priority',
      },
      default: 'High',
    },
    sourceAttribution: {
      type: String,
      enum: {
        values: [
          'resume_identified',
          'job_requirement',
          'interview_deficit',
          'ai_inferred',
        ],
        message: '{VALUE} is not a valid skill attribution',
      },
      default: 'job_requirement',
    },
  },
  { _id: false }
);

// Subdocument 4: Next Action
const nextActionSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Action title is required'],
      trim: true,
      maxlength: [150, 'Action title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Action description cannot exceed 500 characters'],
      default: '',
    },
    priority: {
      type: String,
      enum: {
        values: MILESTONE_PRIORITIES,
        message: '{VALUE} is not a valid action priority',
      },
      default: 'High',
    },
    actionType: {
      type: String,
      enum: {
        values: ACTION_TYPES,
        message: '{VALUE} is not a valid action type',
      },
      default: 'SKILL_STUDY',
    },
    deepLink: {
      type: String,
      trim: true,
      maxlength: [200, 'Deep link cannot exceed 200 characters'],
      default: '/dashboard',
    },
    completed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

// Root Career Readiness Subdocument
const careerReadinessSchema = new mongoose.Schema(
  {
    overallScore: {
      type: Number,
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
      default: null,
    },
    resumeQuality: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    jobFitAlignment: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    interviewMastery: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    applicationPipeline: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    availableDimensions: {
      type: [
        {
          type: String,
          enum: [
            'resumeQuality',
            'jobFitAlignment',
            'interviewMastery',
            'applicationPipeline',
          ],
        },
      ],
      default: [],
    },
    weightsUsed: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    calculatedAt: {
      type: Date,
      default: null,
    },
    disclaimer: {
      type: String,
      default:
        'The Career Readiness Index is an assistive metric based on semantic profile alignment and does not constitute a guarantee of employment.',
    },
  },
  { _id: false }
);

// Root Career Profile Schema
const careerProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },
    targetPreferences: {
      desiredRole: {
        type: String,
        trim: true,
        maxlength: [150, 'Desired role cannot exceed 150 characters'],
        default: '',
      },
      targetLevel: {
        type: String,
        enum: {
          values: TARGET_LEVELS,
          message: '{VALUE} is not a valid target level',
        },
        default: 'Mid',
      },
      preferredIndustry: {
        type: String,
        trim: true,
        maxlength: [100, 'Preferred industry cannot exceed 100 characters'],
        default: '',
      },
    },
    careerReadiness: {
      type: careerReadinessSchema,
      default: () => ({}),
    },
    skillAnalysis: {
      masteredSkills: {
        type: [aggregatedSkillGapSchema],
        validate: [
          (val) => val.length <= 50,
          'Mastered skills array cannot exceed 50 items',
        ],
        default: [],
      },
      criticalGaps: {
        type: [aggregatedSkillGapSchema],
        validate: [
          (val) => val.length <= 50,
          'Critical gaps array cannot exceed 50 items',
        ],
        default: [],
      },
      partialGaps: {
        type: [aggregatedSkillGapSchema],
        validate: [
          (val) => val.length <= 50,
          'Partial gaps array cannot exceed 50 items',
        ],
        default: [],
      },
      totalAnalyzedJobs: {
        type: Number,
        min: 0,
        default: 0,
      },
    },
    learningRoadmap: {
      type: [roadmapMilestoneSchema],
      validate: [
        (val) => val.length <= 20,
        'Learning roadmap cannot exceed 20 milestones',
      ],
      default: [],
    },
    roleRecommendations: {
      type: [roleRecommendationSchema],
      validate: [
        (val) => val.length <= 15,
        'Role recommendations cannot exceed 15 roles',
      ],
      default: [],
    },
    nextActions: {
      type: [nextActionSchema],
      validate: [
        (val) => val.length <= 15,
        'Next actions cannot exceed 15 actions',
      ],
      default: [],
    },
    weeklyMomentum: {
      startDate: { type: Date, default: null },
      endDate: { type: Date, default: null },
      resumesAudited: { type: Number, min: 0, default: 0 },
      jobsAnalyzed: { type: Number, min: 0, default: 0 },
      interviewsCompleted: { type: Number, min: 0, default: 0 },
      applicationsAdvanced: { type: Number, min: 0, default: 0 },
      milestonesCompleted: { type: Number, min: 0, default: 0 },
      momentumStatus: {
        type: String,
        enum: {
          values: MOMENTUM_STATUSES,
          message: '{VALUE} is not a valid momentum status',
        },
        default: 'Steady',
      },
    },
    aiSynthesis: {
      executiveSummary: {
        type: String,
        trim: true,
        maxlength: [3000, 'Executive summary cannot exceed 3,000 characters'],
        default: '',
      },
      marketContext: {
        type: String,
        trim: true,
        maxlength: [2000, 'Market context cannot exceed 2,000 characters'],
        default: '',
      },
      generatedAt: { type: Date, default: null },
      modelUsed: { type: String, trim: true, default: '' },
    },
    generationSource: {
      type: String,
      enum: {
        values: GENERATION_SOURCES,
        message: '{VALUE} is not a valid generation source',
      },
      default: 'heuristic',
    },
    lastGeneratedAt: {
      type: Date,
      default: null,
    },
    schemaVersion: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Secondary compound indexes for queries (avoiding duplicate on userId which is already unique)
careerProfileSchema.index({ 'careerReadiness.overallScore': -1 });
careerProfileSchema.index({ updatedAt: -1 });

export const CareerProfile =
  mongoose.models.CareerProfile ||
  mongoose.model('CareerProfile', careerProfileSchema);

export default CareerProfile;
