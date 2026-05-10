import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { FlashcardModel } from "../models/LearningModels";

const gradeSchema = z.enum(["again", "hard", "good", "easy"]);

function computeNext(
  grade: z.infer<typeof gradeSchema>,
  ease: number,
  reps: number,
  interval: number
): {
  srsEase: number;
  srsRepetitions: number;
  srsIntervalDays: number;
  srsNextReview: Date;
  srsLastReview: Date;
} {
  let e = ease;
  let r = reps;
  let i = interval;

  if (grade === "again") {
    r = 0;
    i = 0;
    e = Math.max(1.3, e - 0.2);
  } else if (grade === "hard") {
    i = Math.max(1, Math.round((i || 1) * 1.2));
    e = Math.max(1.3, e - 0.05);
    r += 1;
  } else if (grade === "good") {
    if (r === 0) i = 1;
    else if (r === 1) i = 6;
    else i = Math.max(1, Math.round(i * e));
    r += 1;
  } else {
    e = Math.min(3, e + 0.15);
    i = Math.max(1, Math.round((i || 1) * e));
    r += 1;
  }

  const next = new Date();
  next.setUTCDate(next.getUTCDate() + i);
  return {
    srsEase: e,
    srsRepetitions: r,
    srsIntervalDays: i,
    srsNextReview: next,
    srsLastReview: new Date()
  };
}

export async function listDueFlashcards(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.query.lectureId || "");
  const now = new Date();
  const q: Record<string, unknown> = {
    userId: req.user!.id,
    $or: [{ srsNextReview: { $lte: now } }, { srsNextReview: { $exists: false } }]
  };
  if (lectureId) q.lectureId = lectureId;

  const cards = await FlashcardModel.find(q).sort({ updatedAt: 1 }).limit(30).lean();
  return res.json(cards);
}

export async function reviewFlashcard(req: AuthenticatedRequest, res: Response) {
  const body = z
    .object({
      flashcardId: z.string().min(1),
      grade: gradeSchema
    })
    .parse(req.body);

  const card = await FlashcardModel.findOne({ _id: body.flashcardId, userId: req.user!.id }).lean();
  if (!card) return res.status(404).json({ message: "Flashcard not found" });

  const ease = Number((card as { srsEase?: number }).srsEase ?? 2.5);
  const reps = Number((card as { srsRepetitions?: number }).srsRepetitions ?? 0);
  const interval = Number((card as { srsIntervalDays?: number }).srsIntervalDays ?? 0);

  const next = computeNext(body.grade, ease, reps, interval);

  const updated = await FlashcardModel.findOneAndUpdate(
    { _id: body.flashcardId, userId: req.user!.id },
    { $set: next },
    { new: true }
  );

  return res.json(updated);
}
