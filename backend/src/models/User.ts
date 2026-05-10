import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  plan: "free" | "pro" | "institution";
  studyStreak: number;
  xp: number;
  minutesStudiedTotal: number;
  /** Raw video/player watch time (seconds), separate from chat/quiz minute estimates */
  watchSecondsTotal: number;
  lastStudyDay?: Date;
  resetTokenHash?: string;
  resetTokenExpiresAt?: Date;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    plan: { type: String, enum: ["free", "pro", "institution"], default: "free" },
    studyStreak: { type: Number, default: 0 },
    xp: { type: Number, default: 0 },
    minutesStudiedTotal: { type: Number, default: 0 },
    watchSecondsTotal: { type: Number, default: 0 },
    lastStudyDay: Date,
    resetTokenHash: String,
    resetTokenExpiresAt: Date
  },
  { timestamps: true }
);

UserSchema.methods.comparePassword = function comparePassword(password: string) {
  return bcrypt.compare(password, this.passwordHash);
};

export const UserModel = mongoose.model<IUser>("User", UserSchema);
