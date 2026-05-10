import { Router } from "express";
import {
  forgotPassword,
  login,
  me,
  refresh,
  resetPassword,
  signup
} from "../controllers/auth.controller";
import { askFromVoiceTranscript, askTutor, askTutorStream } from "../controllers/chat.controller";
import {
  createLecture,
  getLectureById,
  ingestYoutube,
  listLectures,
  uploadLectureFile
} from "../controllers/lecture.controller";
import { getAnalytics } from "../controllers/analytics.controller";
import {
  adaptiveQuiz,
  generateMindMap,
  imageQuestion,
  interviewQuestions,
  liveAssistant,
  translateContent
} from "../controllers/features/extended-features.controller";
import {
  generateFlashcards,
  generateQuiz,
  generateRecommendations,
  generateRevisionPlan,
  generateSummary,
  generateTimeline,
  submitQuiz
} from "../controllers/features/learning.controller";
import {
  listNotifications,
  markNotificationRead
} from "../controllers/features/notification.controller";
import { listDueFlashcards, reviewFlashcard } from "../controllers/srs.controller";
import { reportWatchTime } from "../controllers/study-session.controller";
import { authMiddleware } from "../middleware/auth";
import { upload } from "../middleware/upload";

export const appRouter = Router();

appRouter.post("/auth/signup", signup);
appRouter.post("/auth/login", login);
appRouter.post("/auth/refresh", refresh);
appRouter.post("/auth/forgot-password", forgotPassword);
appRouter.post("/auth/reset-password", resetPassword);
appRouter.get("/auth/me", authMiddleware, me);
appRouter.post("/lectures/youtube", authMiddleware, ingestYoutube);
appRouter.get("/lectures", authMiddleware, listLectures);
appRouter.get("/lectures/:id", authMiddleware, getLectureById);
appRouter.post("/lectures", authMiddleware, createLecture);
appRouter.post("/lectures/upload", authMiddleware, upload.single("file"), uploadLectureFile);
appRouter.post("/chat/ask", authMiddleware, askTutor);
appRouter.post("/chat/ask-stream", authMiddleware, askTutorStream);
appRouter.post("/chat/from-voice-transcript", authMiddleware, askFromVoiceTranscript);
appRouter.get("/analytics", authMiddleware, getAnalytics);
appRouter.post("/study/watch-time", authMiddleware, reportWatchTime);
appRouter.post("/revision/generate", authMiddleware, generateRevisionPlan);
appRouter.post("/learning/summary", authMiddleware, generateSummary);
appRouter.post("/quiz/generate", authMiddleware, generateQuiz);
appRouter.post("/quiz/generate-adaptive", authMiddleware, adaptiveQuiz);
appRouter.post("/learning/recommendations", authMiddleware, generateRecommendations);
appRouter.post("/learning/mindmap", authMiddleware, generateMindMap);
appRouter.post("/learning/translate", authMiddleware, translateContent);
appRouter.post("/learning/interview-questions", authMiddleware, interviewQuestions);
appRouter.post("/learning/live-assistant", authMiddleware, liveAssistant);
appRouter.post("/learning/image-qa", authMiddleware, imageQuestion);
appRouter.post("/flashcards/generate", authMiddleware, generateFlashcards);
appRouter.get("/srs/due", authMiddleware, listDueFlashcards);
appRouter.post("/srs/review", authMiddleware, reviewFlashcard);
appRouter.post("/quiz/submit", authMiddleware, submitQuiz);
appRouter.get("/timeline", authMiddleware, generateTimeline);
appRouter.get("/notifications", authMiddleware, listNotifications);
appRouter.patch("/notifications/:id/read", authMiddleware, markNotificationRead);
