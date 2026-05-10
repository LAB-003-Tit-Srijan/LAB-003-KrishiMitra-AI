import { Response } from "express";
import { AuthenticatedRequest } from "../../middleware/auth";
import {
  FlashcardModel,
  QuizAttemptModel,
  RevisionHistoryModel,
  TopicConfidenceModel
} from "../../models/LearningModels";
import { NotificationModel } from "../../models/Notification";
import {
  generateBasicContentSummary,
  generateLectureBoundAnswer,
  generatePersonalizedRecommendations,
  generateQuizMcqsJson,
  generateStructuredEducationalSummary
} from "../../services/gemini.service";
import { retrieveContext } from "../../services/rag.service";
import { insightFromLecture, requireLectureAiFeature, requireLectureForSummary } from "../../utils/educational-policy";
import { recordStudyActivity } from "../../utils/study-stats";

export async function generateRevisionPlan(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.body?.lectureId || "");
  const weakTopics = (req.body?.weakTopics || []) as string[];
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const ok = await requireLectureAiFeature(req, res, lectureId, "revision_plan");
  if (!ok) return;

  const prompt = `Create a concise adaptive revision roadmap for topics: ${weakTopics.join(", ")}.
  Include: quick recap, crash course flow, confidence booster tasks.`;
  const { context } = await retrieveContext(lectureId, prompt);
  const generatedPlan = await generateLectureBoundAnswer({ question: prompt, context, focusTimestampSec: null });

  const saved = await RevisionHistoryModel.create({
    userId: req.user!.id,
    lectureId,
    weakTopics,
    generatedPlan
  });
  await NotificationModel.create({
    userId: req.user!.id,
    title: "Adaptive revision ready",
    body: "A personalized roadmap has been generated based on weak topics.",
    type: "revision"
  });
  const io = req.app.get("io") as import("socket.io").Server;
  io.to(`user:${req.user!.id}`).emit("notification:new", { type: "revision", revisionId: saved.id });
  return res.json(saved);
}

export async function generateFlashcards(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.body?.lectureId || "");
  const topic = String(req.body?.topic || "general");
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const ok = await requireLectureAiFeature(req, res, lectureId, "flashcards_generate");
  if (!ok) return;

  const { context } = await retrieveContext(lectureId, `Generate flashcards for ${topic}`);
  const raw = await generateLectureBoundAnswer({
    question: `Generate 5 short Q/A flashcards for ${topic}. Format "Q:... A:..."`,
    context,
    focusTimestampSec: null
  });

  const cards = raw
    .split("\n")
    .filter((l: string) => l.includes("Q:") && l.includes("A:"))
    .map((line: string) => {
      const [frontPart, backPart] = line.split("A:");
      return {
        userId: req.user!.id,
        lectureId,
        topic,
        front: frontPart.replace("Q:", "").trim(),
        back: (backPart || "").trim(),
        srsEase: 2.5,
        srsIntervalDays: 0,
        srsRepetitions: 0,
        srsNextReview: new Date()
      };
    })
    .filter((c: any) => c.front && c.back);

  const saved = cards.length ? await FlashcardModel.insertMany(cards) : [];
  return res.json(saved);
}

export async function submitQuiz(req: AuthenticatedRequest, res: Response) {
  const { lectureId, topic, score, total } = req.body as {
    lectureId: string;
    topic: string;
    score: number;
    total: number;
  };
  if (!lectureId || !topic) return res.status(400).json({ message: "lectureId and topic are required" });
  const attempt = await QuizAttemptModel.create({ userId: req.user!.id, lectureId, topic, score, total });
  const confidenceScore = Math.max(0, Math.min(100, Math.round((score / Math.max(1, total)) * 100)));
  const confidenceDoc = await TopicConfidenceModel.findOneAndUpdate(
    { userId: req.user!.id, lectureId, topic },
    {
      userId: req.user!.id,
      lectureId,
      topic,
      confidenceScore,
      $push: { masteryTrend: { date: new Date(), value: confidenceScore } }
    },
    { upsert: true, new: true }
  );
  await NotificationModel.create({
    userId: req.user!.id,
    title: "Quiz evaluated",
    body: `${topic} confidence updated to ${confidenceScore}%`,
    type: "quiz"
  });
  const xpGain = 10 + Math.round((score / Math.max(1, total)) * 40);
  const userStats = await recordStudyActivity(req.user!.id, { xpDelta: xpGain, minutesDelta: 5 });

  const io = req.app.get("io") as import("socket.io").Server;
  io.to(`user:${req.user!.id}`).emit("analytics:update", {
    topic,
    confidenceScore,
    confidence: confidenceDoc,
    userStats
  });
  return res.status(201).json(attempt);
}

export async function generateSummary(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.body?.lectureId || "");
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const access = await requireLectureForSummary(req, res, lectureId);
  if (!access) return;

  const { context } = await retrieveContext(
    lectureId,
    "chapter overview important concepts formulas exam notes revision"
  );
  const summary =
    access.mode === "full"
      ? await generateStructuredEducationalSummary(context)
      : await generateBasicContentSummary(context);
  return res.json({
    summary,
    summaryTier: access.mode,
    educationalInsight: insightFromLecture(access.lecture)
  });
}

export async function generateQuiz(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.body?.lectureId || "");
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const ok = await requireLectureAiFeature(req, res, lectureId, "quiz_generate");
  if (!ok) return;

  const { context } = await retrieveContext(lectureId, "multiple choice quiz grounded in lecture");
  const raw = await generateQuizMcqsJson(context);
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    try {
      const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
      parsed = JSON.parse(((fence?.[1] as string) || raw).trim());
    } catch {
      return res.status(502).json({ message: "Quiz generation returned invalid JSON." });
    }
  }
  if (!Array.isArray(parsed)) {
    return res.status(502).json({ message: "Quiz generation returned invalid JSON." });
  }
  return res.json({ questions: parsed });
}

export async function generateRecommendations(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.body?.lectureId || "");
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const ok = await requireLectureAiFeature(req, res, lectureId, "recommendations");
  if (!ok) return;

  const weak = await TopicConfidenceModel.find({
    userId: req.user!.id,
    lectureId,
    confidenceScore: { $lt: 65 }
  })
    .sort({ confidenceScore: 1 })
    .limit(12)
    .lean();

  const weakTopicsSummary =
    weak.length > 0
      ? weak.map((w) => `${w.topic}: ${w.confidenceScore}%`).join("\n")
      : "No recorded weak topics yet — assume mixed beginner understanding.";

  const { context } = await retrieveContext(lectureId, "personalized learning roadmap quiz difficulty");
  const recommendations = await generatePersonalizedRecommendations({
    weakTopicsSummary,
    lectureContext: context
  });

  return res.json({
    recommendations,
    weakTopics: weak.map((w) => ({
      topic: w.topic,
      confidenceScore: w.confidenceScore
    }))
  });
}

export async function generateTimeline(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.query.lectureId || "");
  if (!lectureId) return res.status(400).json({ message: "lectureId is required" });

  const ok = await requireLectureAiFeature(req, res, lectureId, "timeline");
  if (!ok) return;

  const { references } = await retrieveContext(
    lectureId,
    "Identify important concepts, repeated topics, coding examples, and exam-priority moments."
  );
  const timeline = references.map((ref, idx) => ({
    id: `${lectureId}-${idx}`,
    timestamp: ref.startSec,
    label: ref.text.slice(0, 90),
    importance: Math.min(100, 70 + idx * 5)
  }));
  return res.json(timeline);
}
