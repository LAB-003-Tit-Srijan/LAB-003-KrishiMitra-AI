import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { ChatSessionModel, MessageModel } from "../models/LearningModels";
import {
  generateLectureBoundAnswer,
  streamLectureBoundAnswer
} from "../services/gemini.service";
import { retrieveContext } from "../services/rag.service";
import { requireLectureAiFeature } from "../utils/educational-policy";
import { recordStudyActivity } from "../utils/study-stats";

const chatSchema = z.object({
  lectureId: z.string().min(1),
  chatSessionId: z.string().optional(),
  question: z.string().min(3)
});

export async function askTutor(req: AuthenticatedRequest, res: Response) {
  const payload = chatSchema.parse(req.body);

  const ok = await requireLectureAiFeature(req, res, payload.lectureId, "tutor");
  if (!ok) return;

  const { context, references, focusTimestampSec } = await retrieveContext(
    payload.lectureId,
    payload.question
  );

  let sessionId = payload.chatSessionId;
  if (!sessionId) {
    const session = await ChatSessionModel.create({
      userId: req.user!.id,
      lectureId: payload.lectureId,
      title: payload.question.slice(0, 60)
    });
    sessionId = session.id;
  }

  const answer = await generateLectureBoundAnswer({
    question: payload.question,
    context,
    focusTimestampSec
  });

  await MessageModel.create({ chatSessionId: sessionId, role: "user", content: payload.question });
  await MessageModel.create({
    chatSessionId: sessionId,
    role: "assistant",
    content: answer,
    references
  });

  const stats = await recordStudyActivity(req.user!.id, { xpDelta: 5, minutesDelta: 1 });
  const io = req.app.get("io") as import("socket.io").Server | undefined;
  if (stats && io) {
    io.to(`user:${req.user!.id}`).emit("analytics:update", { userStats: stats });
  }

  return res.json({ chatSessionId: sessionId, answer, references, focusTimestampSec });
}

export async function askTutorStream(req: AuthenticatedRequest, res: Response) {
  const payload = chatSchema.parse(req.body);
  const socketId = String(req.body?.socketId || "");
  if (!socketId) return res.status(400).json({ message: "socketId is required" });

  const ok = await requireLectureAiFeature(req, res, payload.lectureId, "tutor_stream");
  if (!ok) return;

  const io = req.app.get("io") as import("socket.io").Server;
  const { context, references, focusTimestampSec } = await retrieveContext(
    payload.lectureId,
    payload.question
  );

  let sessionId = payload.chatSessionId;
  if (!sessionId) {
    const session = await ChatSessionModel.create({
      userId: req.user!.id,
      lectureId: payload.lectureId,
      title: payload.question.slice(0, 60)
    });
    sessionId = session.id;
  }

  let full = "";
  try {
    for await (const delta of streamLectureBoundAnswer({
      question: payload.question,
      context,
      focusTimestampSec
    })) {
      full += delta;
      io.to(socketId).emit("tutor:chunk", { token: delta, done: false });
    }
  } catch (e) {
    console.error(e);
    io.to(socketId).emit("tutor:chunk", {
      token: "",
      done: true,
      error: "Stream failed. Try again or use non-streaming chat.",
      references
    });
    return res.status(500).json({ message: "Stream failed" });
  }

  io.to(socketId).emit("tutor:chunk", { token: "", done: true, references, focusTimestampSec });

  await MessageModel.create({ chatSessionId: sessionId, role: "user", content: payload.question });
  await MessageModel.create({
    chatSessionId: sessionId,
    role: "assistant",
    content: full || "(empty response)",
    references
  });

  const stats = await recordStudyActivity(req.user!.id, { xpDelta: 5, minutesDelta: 1 });
  if (stats) {
    io.to(`user:${req.user!.id}`).emit("analytics:update", { userStats: stats });
  }

  return res.json({ status: "streamed", chatSessionId: sessionId, references, focusTimestampSec });
}

const voiceSchema = z.object({
  lectureId: z.string().min(1),
  transcript: z.string().min(3),
  chatSessionId: z.string().optional()
});

/** Client-side Web Speech API produces text; same RAG flow as POST /chat/ask */
export async function askFromVoiceTranscript(req: AuthenticatedRequest, res: Response) {
  const v = voiceSchema.parse(req.body);

  const allowed = await requireLectureAiFeature(req, res, v.lectureId, "voice_tutor");
  if (!allowed) return;

  req.body = {
    lectureId: v.lectureId,
    chatSessionId: v.chatSessionId,
    question: `[Voice transcript] ${v.transcript}`
  };
  return askTutor(req, res);
}
