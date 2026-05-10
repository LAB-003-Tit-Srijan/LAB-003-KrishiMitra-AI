import { Response } from "express";
import pdf from "pdf-parse";
import { z } from "zod";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middleware/auth";
import type { EducationalInsight } from "../models/Lecture";
import { LectureModel } from "../models/Lecture";
import { insightFromLecture } from "../utils/educational-policy";
import { TranscriptModel } from "../models/LearningModels";
import { uploadToCloudinary } from "../services/cloudinary.service";
import { upsertTranscriptChunks } from "../services/rag.service";
import { classifyEducationalContent } from "../services/gemini.service";
import {
  extractYoutubeVideoId,
  fetchYoutubeOEmbed,
  fetchYoutubeTranscriptPlan
} from "../services/youtube.service";

const uploadSchema = z.object({
  title: z.string().min(3),
  sourceType: z.enum(["video", "pdf", "docx", "transcript", "youtube"]),
  sourceUrl: z.string().url().optional(),
  transcript: z.string().min(20)
});

const SOURCES_WITH_EDUCATIONAL_CLASSIFICATION = ["youtube", "pdf", "docx", "transcript", "video"] as const;

async function buildEducationalInsight(
  title: string,
  transcriptExcerpt: string,
  description?: string
): Promise<EducationalInsight> {
  if (!env.geminiApiKey) {
    return {
      classification: "PARTIALLY_EDUCATIONAL",
      confidence: 0,
      reasoning: "GEMINI_API_KEY is not configured; educational classification was skipped."
    };
  }
  try {
    return await classifyEducationalContent({
      title,
      transcriptExcerpt,
      description
    });
  } catch (e) {
    console.error(e);
    const msg = String((e as Error)?.message || e).slice(0, 500);
    return {
      classification: "PARTIALLY_EDUCATIONAL",
      confidence: 25,
      reasoning: `Classification failed: ${msg}`
    };
  }
}

export async function createLecture(req: AuthenticatedRequest, res: Response) {
  const payload = uploadSchema.parse(req.body);

  let educationalInsight: EducationalInsight | undefined;
  if ((SOURCES_WITH_EDUCATIONAL_CLASSIFICATION as readonly string[]).includes(payload.sourceType)) {
    educationalInsight = await buildEducationalInsight(
      payload.title,
      payload.transcript,
      payload.sourceUrl ? `Source: ${payload.sourceUrl}` : undefined
    );
  }

  const lecture = await LectureModel.create({
    userId: req.user!.id,
    title: payload.title,
    sourceType: payload.sourceType,
    sourceUrl: payload.sourceUrl,
    transcript: payload.transcript,
    ...(educationalInsight && {
      educationalClassification: educationalInsight.classification,
      educationalConfidence: educationalInsight.confidence,
      educationalReasoning: educationalInsight.reasoning
    })
  });

  await processLectureTranscript(lecture.id, payload.transcript);
  lecture.status = "processed";
  await lecture.save();

  return res.status(201).json(
    educationalInsight ? { lecture, educationalInsight } : { lecture }
  );
}

const youtubeIngestSchema = z.object({
  youtubeUrl: z.string().min(1),
  title: z.string().min(3).optional()
});

/**
 * Ingest a public YouTube video: metadata (oEmbed), timed transcript, chunking, Mongo + Pinecone.
 */
export async function ingestYoutube(req: AuthenticatedRequest, res: Response) {
  const payload = youtubeIngestSchema.parse(req.body);
  const videoId = extractYoutubeVideoId(payload.youtubeUrl);
  if (!videoId) {
    return res.status(400).json({ message: "Invalid or unsupported YouTube URL." });
  }

  let meta: { title: string; thumbnailUrl: string; channelTitle?: string };
  try {
    meta = await fetchYoutubeOEmbed(videoId);
  } catch {
    return res.status(400).json({ message: "Video not found or metadata unavailable." });
  }

  let plan: Awaited<ReturnType<typeof fetchYoutubeTranscriptPlan>>;
  try {
    plan = await fetchYoutubeTranscriptPlan(videoId);
  } catch (e) {
    const err = e as { message?: string };
    if (err?.message === "empty_transcript") {
      return res.status(400).json({ message: "Transcript is empty." });
    }
    return res.status(400).json({
      message:
        "Could not fetch captions. The video may have no transcript, captions disabled, or restricted access."
    });
  }

  if (plan.fullText.trim().length < 20) {
    return res.status(400).json({ message: "Transcript content too short after processing." });
  }

  const title = payload.title?.trim() || meta.title;

  const educationalInsight = await buildEducationalInsight(
    title,
    plan.fullText,
    meta.channelTitle ? `Channel: ${meta.channelTitle}` : undefined
  );

  const lecture = await LectureModel.create({
    userId: req.user!.id,
    title,
    sourceType: "youtube",
    sourceUrl: `https://www.youtube.com/watch?v=${videoId}`,
    thumbnailUrl: meta.thumbnailUrl,
    channelTitle: meta.channelTitle,
    transcript: plan.fullText,
    durationSec: plan.durationSec,
    educationalClassification: educationalInsight.classification,
    educationalConfidence: educationalInsight.confidence,
    educationalReasoning: educationalInsight.reasoning
  });

  await persistLectureTranscriptChunks(
    lecture.id,
    plan.chunks.map((c) => ({
      text: c.text,
      startSec: c.startSec,
      endSec: c.endSec
    }))
  );

  lecture.status = "processed";
  await lecture.save();

  return res.status(201).json({
    lecture,
    educationalInsight,
    video: {
      title,
      thumbnail: meta.thumbnailUrl,
      durationSec: plan.durationSec,
      transcript: plan.fullText
    }
  });
}

export async function listLectures(req: AuthenticatedRequest, res: Response) {
  const data = await LectureModel.find({ userId: req.user!.id }).sort({ createdAt: -1 });
  return res.json(data);
}

export async function getLectureById(req: AuthenticatedRequest, res: Response) {
  const lectureId = String(req.params.id || "");
  const lecture = await LectureModel.findOne({ _id: lectureId, userId: req.user!.id });
  if (!lecture) return res.status(404).json({ message: "Lecture not found" });
  const transcript = await TranscriptModel.findOne({ lectureId: lecture.id });
  return res.json({
    lecture,
    transcript: transcript?.toObject() || null,
    educationalInsight: insightFromLecture(lecture)
  });
}

export async function uploadLectureFile(req: AuthenticatedRequest, res: Response) {
  const file = req.file;
  const title = String(req.body?.title || file?.originalname || "Untitled Lecture");
  const sourceType = String(req.body?.sourceType || "transcript") as
    | "video"
    | "pdf"
    | "docx"
    | "transcript";
  if (!file) return res.status(400).json({ message: "file is required" });

  let transcript = "";
  let sourceUrl = "";

  if (sourceType === "pdf") {
    const parsed = await pdf(file.buffer);
    transcript = parsed.text;
  } else if (sourceType === "transcript" || sourceType === "docx") {
    transcript = file.buffer.toString("utf8");
  } else if (sourceType === "video") {
    const b64 = `data:video/mp4;base64,${file.buffer.toString("base64")}`;
    sourceUrl = await uploadToCloudinary(b64, "video");
    transcript = String(req.body?.transcript || "");
  }

  if (transcript.trim().length < 20) {
    return res.status(400).json({ message: "Transcript content too short after processing" });
  }

  let educationalInsight: EducationalInsight | undefined;
  if ((SOURCES_WITH_EDUCATIONAL_CLASSIFICATION as readonly string[]).includes(sourceType)) {
    educationalInsight = await buildEducationalInsight(
      title,
      transcript,
      `Uploaded file type: ${sourceType}`
    );
  }

  const lecture = await LectureModel.create({
    userId: req.user!.id,
    title,
    sourceType,
    sourceUrl,
    transcript,
    ...(educationalInsight && {
      educationalClassification: educationalInsight.classification,
      educationalConfidence: educationalInsight.confidence,
      educationalReasoning: educationalInsight.reasoning
    })
  });
  await processLectureTranscript(lecture.id, transcript);
  lecture.status = "processed";
  await lecture.save();
  return res.status(201).json(
    educationalInsight ? { lecture, educationalInsight } : { lecture }
  );
}

async function persistLectureTranscriptChunks(
  lectureId: string,
  chunks: Array<{ text: string; startSec: number; endSec: number }>
) {
  const withIds = chunks.map((c, idx) => ({
    id: `${lectureId}-${idx}`,
    text: c.text,
    startSec: c.startSec,
    endSec: c.endSec
  }));

  await TranscriptModel.findOneAndDelete({ lectureId });
  await TranscriptModel.create({
    lectureId,
    chunks: withIds.map((c) => ({ ...c, embeddingId: c.id }))
  });
  await upsertTranscriptChunks(lectureId, withIds);
}

async function processLectureTranscript(lectureId: string, transcript: string) {
  const chunks = transcript
    .split(/\n{2,}/)
    .filter(Boolean)
    .map((text, idx) => ({
      text,
      startSec: idx * 30,
      endSec: idx * 30 + 30
    }));
  await persistLectureTranscriptChunks(lectureId, chunks);
}
