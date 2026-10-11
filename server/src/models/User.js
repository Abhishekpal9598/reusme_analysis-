import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address'],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      minlength: [60, 'Password hash must be at least 60 characters'],
      select: false, // Do not return passwordHash in default queries
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      minlength: [2, 'Full name must be at least 2 characters'],
      maxlength: [100, 'Full name cannot exceed 100 characters'],
    },
    targetRole: {
      type: String,
      trim: true,
      maxlength: [120, 'Target role cannot exceed 120 characters'],
      default: '',
    },
    careerLevel: {
      type: String,
      enum: ['Entry', 'Mid', 'Senior', 'Lead', 'Executive'],
      default: 'Entry',
    },
  },
  {
    timestamps: true,
  }
);

// Explicit user-safe JSON serializer
userSchema.methods.toJSON = function () {
  const userObj = this.toObject();
  delete userObj.passwordHash;
  delete userObj.__v;
  userObj.id = userObj._id.toString();
  return userObj;
};

export const User = mongoose.models.User || mongoose.model('User', userSchema);
export default User;
