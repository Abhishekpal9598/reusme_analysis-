import mongoose from 'mongoose';

const jobDimensionSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
      default: 0,
    },
    explanation: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const matchedSkillSubSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    category: { type: String, default: 'Technical' },
    evidenceFromResume: { type: String, default: '' },
    importance: { type: String, default: 'required' },
  },
  { _id: false }
);

const missingSkillSubSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    rationale: { type: String, default: '' },
    criticality: { type: String, default: 'critical' },
  },
  { _id: false }
);

const partialSkillSubSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    resumeContext: { type: String, default: '' },
    jobRequirement: { type: String, default: '' },
    gapExplanation: { type: String, default: '' },
    matchStatus: { type: String, default: 'Partial Match' },
    importance: { type: String, default: 'Medium' },
  },
  { _id: false }
);

const skillGapSubSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    resumeEvidence: { type: String, default: '' },
    jobRequirement: { type: String, default: '' },
    matchStatus: { type: String, default: 'Missing' },
    importance: { type: String, default: 'High' },
  },
  { _id: false }
);


const jobAnalysisSchema = new mongoose.Schema(
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
      required: [true, 'Resume ID is required'],
      index: true,
    },
    jobTitle: {
      type: String,
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
      default: 'Target Role',
    },
    companyName: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
      default: '',
    },
    company: {
      type: String,
      trim: true,
      maxlength: [150, 'Company name cannot exceed 150 characters'],
      default: '',
    },
    jobDescription: {
      type: String,
      required: [true, 'Job description is required'],
      maxlength: [20000, 'Job description cannot exceed 20,000 characters'],
    },
    matchScore: {
      type: Number,
      required: [true, 'Match score is required'],
      min: [0, 'Match score cannot be less than 0'],
      max: [100, 'Match score cannot exceed 100'],
    },
    overallMatchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    dimensionScores: {
      skillsAlignment: { type: jobDimensionSchema },
      experienceAlignment: { type: jobDimensionSchema },
      educationAlignment: { type: jobDimensionSchema },
      responsibilityAlignment: { type: jobDimensionSchema },
    },
    skillsAnalysis: {
      matchedSkills: { type: [matchedSkillSubSchema], default: [] },
      missingOrUnverifiedSkills: { type: [missingSkillSubSchema], default: [] },
      partiallyMatchedSkills: { type: [partialSkillSubSchema], default: [] },
      skillGaps: { type: [skillGapSubSchema], default: [] },
    },
    experienceAnalysis: {
      relevantExperience: { type: [String], default: [] },
      experienceGaps: { type: [String], default: [] },
      evidenceFromResume: { type: [String], default: [] },
    },
    educationAnalysis: {
      relevantMatches: { type: [String], default: [] },
      unmetOrUnverifiedRequirements: { type: [String], default: [] },
    },
    recommendations: {
      priorityImprovements: { type: [String], default: [] },
      resumeTailoringSuggestions: { type: [String], default: [] },
      relevantKeywordsToConsider: { type: [String], default: [] },
      suggestedProjects: { type: [String], default: [] },
    },
    summaryAssessment: {
      type: String,
      default: '',
    },
    // Backward compatibility fields
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    unverifiedSkills: {
      type: [String],
      default: [],
    },
    tailoringRecommendations: {
      type: [String],
      default: [],
    },
    disclaimer: {
      type: String,
      default:
        'Match score indicates semantic keyword and experience alignment. It does not represent guaranteed interview or hiring probability.',
    },
    providerMetadata: {
      provider: { type: String, default: 'Google Gemini' },
      model: { type: String, default: 'gemini-2.5-flash' },
      latencyMs: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
  }
);

jobAnalysisSchema.index({ userId: 1, createdAt: -1 });
jobAnalysisSchema.index({ resumeId: 1, createdAt: -1 });

jobAnalysisSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

export const JobAnalysis =
  mongoose.models.JobAnalysis || mongoose.model('JobAnalysis', jobAnalysisSchema);

// Alias JobMatch to JobAnalysis for flexible naming
export const JobMatch = JobAnalysis;

export default JobAnalysis;
