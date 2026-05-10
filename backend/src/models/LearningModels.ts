import mongoose, { Schema, Types } from "mongoose";

const TranscriptSchema = new Schema(
  {
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    chunks: [{ text: String, startSec: Number, endSec: Number, embeddingId: String }]
  },
  { timestamps: true }
);

const ChatSessionSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    title: { type: String, required: true }
  },
  { timestamps: true }
);

const MessageSchema = new Schema(
  {
    chatSessionId: { type: Schema.Types.ObjectId, ref: "ChatSession", index: true, required: true },
    role: { type: String, enum: ["user", "assistant"], required: true },
    content: { type: String, required: true },
    references: [{ text: String, startSec: Number, endSec: Number }]
  },
  { timestamps: true }
);

const QuizAttemptSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    topic: { type: String, required: true },
    score: { type: Number, required: true },
    total: { type: Number, required: true }
  },
  { timestamps: true }
);

const TopicConfidenceSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    topic: { type: String, required: true },
    confidenceScore: { type: Number, min: 0, max: 100, required: true },
    masteryTrend: [{ date: Date, value: Number }]
  },
  { timestamps: true }
);

const RevisionHistorySchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    weakTopics: [{ type: String }],
    generatedPlan: { type: String, required: true }
  },
  { timestamps: true }
);

const FlashcardSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", index: true, required: true },
    lectureId: { type: Schema.Types.ObjectId, ref: "Lecture", index: true, required: true },
    front: { type: String, required: true },
    back: { type: String, required: true },
    topic: { type: String, required: true },
    srsEase: { type: Number, default: 2.5 },
    srsIntervalDays: { type: Number, default: 0 },
    srsRepetitions: { type: Number, default: 0 },
    srsNextReview: Date,
    srsLastReview: Date
  },
  { timestamps: true }
);

const AnalyticsSchema = new Schema(
  {
    userId: { type: Types.ObjectId, ref: "User", index: true, required: true },
    learningHours: { type: Number, default: 0 },
    productivityScore: { type: Number, default: 0 },
    revisionConsistency: { type: Number, default: 0 },
    preparedScore: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const TranscriptModel = mongoose.model("Transcript", TranscriptSchema);
export const ChatSessionModel = mongoose.model("ChatSession", ChatSessionSchema);
export const MessageModel = mongoose.model("Message", MessageSchema);
export const QuizAttemptModel = mongoose.model("QuizAttempt", QuizAttemptSchema);
export const TopicConfidenceModel = mongoose.model("TopicConfidence", TopicConfidenceSchema);
export const RevisionHistoryModel = mongoose.model("RevisionHistory", RevisionHistorySchema);
export const FlashcardModel = mongoose.model("Flashcard", FlashcardSchema);
export const AnalyticsModel = mongoose.model("Analytics", AnalyticsSchema);
