import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth";
import {
  AnalyticsModel,
  QuizAttemptModel,
  RevisionHistoryModel,
  TopicConfidenceModel
} from "../models/LearningModels";
import { UserModel } from "../models/User";

export async function getAnalytics(req: AuthenticatedRequest, res: Response) {
  const [analytics, confidence, attempts, revisions, user] = await Promise.all([
    AnalyticsModel.findOne({ userId: req.user!.id }),
    TopicConfidenceModel.find({ userId: req.user!.id }).sort({ updatedAt: -1 }).limit(10),
    QuizAttemptModel.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(20),
    RevisionHistoryModel.find({ userId: req.user!.id }).sort({ createdAt: -1 }).limit(10),
    UserModel.findById(req.user!.id)
      .select("xp studyStreak minutesStudiedTotal lastStudyDay watchSecondsTotal")
      .lean()
  ]);

  return res.json({
    analytics,
    confidence,
    quizAttempts: attempts,
    revisions,
    userStats: user
      ? {
          xp: user.xp,
          studyStreak: user.studyStreak,
          minutesStudiedTotal: user.minutesStudiedTotal ?? 0,
          watchSecondsTotal: (user as { watchSecondsTotal?: number }).watchSecondsTotal ?? 0,
          lastStudyDay: user.lastStudyDay
        }
      : null
  });
}
