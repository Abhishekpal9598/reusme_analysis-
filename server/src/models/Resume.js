import mongoose from 'mongoose';

const resumeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
    },
    originalFileName: {
      type: String,
      required: [true, 'Original file name is required'],
      trim: true,
      maxlength: [255, 'File name cannot exceed 255 characters'],
    },
    fileFormat: {
      type: String,
      required: [true, 'File format is required'],
      enum: {
        values: ['pdf', 'docx', 'txt'],
        message: '{VALUE} is not a supported file format (use pdf, docx, or txt)',
      },
    },
    fileSize: {
      type: Number,
      required: [true, 'File size is required'],
      max: [5242880, 'File size cannot exceed 5MB (5,242,880 bytes)'],
    },
    rawText: {
      type: String,
      required: [true, 'Extracted raw text is required'],
      minlength: [20, 'Resume text must contain at least 20 characters'],
      maxlength: [500000, 'Resume text cannot exceed 500,000 characters'],
    },
    wordCount: {
      type: Number,
      default: 0,
    },
    characterCount: {
      type: Number,
      default: 0,
    },
    parsedSections: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    parsingStatus: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for user chronological queries
resumeSchema.index({ userId: 1, createdAt: -1 });

resumeSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.__v;
  obj.id = obj._id.toString();
  return obj;
};

export const Resume = mongoose.models.Resume || mongoose.model('Resume', resumeSchema);
export default Resume;
