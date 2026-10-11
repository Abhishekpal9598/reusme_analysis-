import mongoose from 'mongoose';

const dimensionScoreSchema = new mongoose.Schema(
  {
    score: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },
    explanation: {
      type: String,
      default: '',
    },
    evidence: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const strengthImprovementItemSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    evidence: {
      type: [String],
      default: [],
    },
  },
  { _id: false }
);

const bulletRewriteSchema = new mongoose.Schema(
  {
    originalBullet: {
      type: String,
      required: true,
    },
    suggestedBullet: {
      type: String,
      required: true,
    },
    rationale: {
      type: String,
      required: true,
    },
  },
  { _id: false }
);

const resumeAnalysisSchema = new mongoose.Schema(
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
    overallScore: {
      type: Number,
      required: [true, 'Overall score is required'],
      min: [0, 'Overall score cannot be less than 0'],
      max: [100, 'Overall score cannot exceed 100'],
    },
    // Detailed 5-dimension rubric scores
    dimensionScores: {
      impact: { type: dimensionScoreSchema },
      brevity: { type: dimensionScoreSchema },
      actionVerbs: { type: dimensionScoreSchema },
      skillsCoverage: { type: dimensionScoreSchema },
      atsReadability: { type: dimensionScoreSchema },
    },
    // Backward-compatible category score mapping
    categoryScores: {
      impactAndMetrics: { type: Number, min: 0, max: 100, default: 0 },
      brevityAndFormatting: { type: Number, min: 0, max: 100, default: 0 },
      actionVerbsAndStyle: { type: Number, min: 0, max: 100, default: 0 },
      skillsCoverage: { type: Number, min: 0, max: 100, default: 0 },
      atsReadability: { type: Number, min: 0, max: 100, default: 0 },
    },
    summaryFeedback: {
      type: String,
      required: [true, 'Summary feedback is required'],
      minlength: [10, 'Summary feedback must be at least 10 characters'],
    },
    strengths: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    improvementAreas: {
      type: [strengthImprovementItemSchema],
      default: [],
    },
    weaknesses: {
      type: [String],
      default: [],
    },
    bulletRewrites: {
      type: [bulletRewriteSchema],
      default: [],
    },
    bulletImprovements: [
      {
        originalBullet: { type: String, required: true },
        issueCritique: { type: String, required: true },
        recommendedRewrite: { type: String, required: true },
        impactExplanation: { type: String, default: '' },
      },
    ],
    recommendations: {
      type: [String],
      default: [],
    },
    identifiedSkills: {
      technical: { type: [String], default: [] },
      soft: { type: [String], default: [] },
      toolsAndFrameworks: { type: [String], default: [] },
    },
    providerMetadata: {
      provider: { type: String, default: 'Google Gemini' },
      model: { type: String, default: 'gemini-2.5-flash' },
      latencyMs: { type: Number, default: 0 },
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
  }
);

resumeAnalysisSchema.index({ userId: 1, createdAt: -1 });
resumeAnalysisSchema.index({ resumeId: 1, createdAt: -1 });

resumeAnalysisSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

export const ResumeAnalysis =
  mongoose.models.ResumeAnalysis || mongoose.model('ResumeAnalysis', resumeAnalysisSchema);

export default ResumeAnalysis;
