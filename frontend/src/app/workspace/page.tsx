"use client";

import { EducationalInsightBadge, EducationalSoftWarning } from "@/components/educational-insight-banner";
import { api } from "@/lib/api";
import type { EducationalInsight } from "@/lib/educational";
import { clientEffectiveTier, tierAllows } from "@/lib/educational";
import { useEffect, useState } from "react";

export default function WorkspacePage() {
  const [question, setQuestion] = useState("");
  const [lectures, setLectures] = useState<Array<{ _id: string; title: string }>>([]);
  const [selectedInsight, setSelectedInsight] = useState<EducationalInsight | null>(null);
  const [lectureId, setLectureId] = useState("");
  const [answer, setAnswer] = useState("");
  const [uploading, setUploading] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeBusy, setYoutubeBusy] = useState(false);
  const [youtubeError, setYoutubeError] = useState("");
  const [lastImportedInsight, setLastImportedInsight] = useState<EducationalInsight | null>(null);

  useEffect(() => {
    api.get("/lectures").then((res) => {
      setLectures(res.data);
      if (res.data?.[0]?._id) setLectureId(res.data[0]._id);
    });
  }, []);

  useEffect(() => {
    if (!lectureId) {
      setSelectedInsight(null);
      return;
    }
    api.get(`/lectures/${lectureId}`).then((res) => {
      setSelectedInsight((res.data?.educationalInsight as EducationalInsight) ?? null);
    });
  }, [lectureId]);

  const tutorOk = tierAllows(clientEffectiveTier(selectedInsight), "tutor");

  async function onUpload(file: File | null) {
    if (!file) return;
    const form = new FormData();
    form.append("file", file);
    form.append("title", file.name);
    form.append("sourceType", file.name.toLowerCase().endsWith(".pdf") ? "pdf" : "transcript");
    setUploading(true);
    try {
      const { data } = await api.post("/lectures/upload", form, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      if (data?.educationalInsight) {
        setLastImportedInsight(data.educationalInsight as EducationalInsight);
      }
      const refreshed = await api.get("/lectures");
      setLectures(refreshed.data);
      if (refreshed.data?.[0]?._id) setLectureId(refreshed.data[0]._id);
    } finally {
      setUploading(false);
    }
  }

  async function onYoutubeIngest() {
    const url = youtubeUrl.trim();
    if (!url) return;
    setYoutubeBusy(true);
    setYoutubeError("");
    try {
      const { data } = await api.post("/lectures/youtube", { youtubeUrl: url });
      setLastImportedInsight((data?.educationalInsight as EducationalInsight) ?? null);
      const refreshed = await api.get("/lectures");
      setLectures(refreshed.data);
      if (refreshed.data?.[0]?._id) setLectureId(refreshed.data[0]._id);
      setYoutubeUrl("");
    } catch (e: unknown) {
      const msg =
        typeof e === "object" && e !== null && "response" in e
          ? (e as { response?: { data?: { message?: string } } }).response?.data?.message
          : undefined;
      setYoutubeError(msg || "Could not import YouTube lecture.");
    } finally {
      setYoutubeBusy(false);
    }
  }

  async function askTutor() {
    if (!tutorOk || !lectureId || !question.trim()) return;
    const { data } = await api.post("/chat/ask", { lectureId, question });
    setAnswer(data.answer || "");
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.2fr_.8fr]">
      <div className="glass rounded-2xl p-6">
        <h1 className="text-2xl font-semibold">AI Lecture Workspace</h1>
        {lastImportedInsight && (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-zinc-400">Last import:</span>
              <EducationalInsightBadge insight={lastImportedInsight} />
            </div>
            <EducationalSoftWarning insight={lastImportedInsight} />
          </div>
        )}
        <div className="mt-6 rounded-2xl border border-dashed border-purple-400/50 p-10 text-center">
          <p>Upload transcript, PDF, DOCX, video, or paste a YouTube link below.</p>
          <input
            type="file"
            className="mx-auto mt-4 block text-sm"
            onChange={(e) => onUpload(e.target.files?.[0] || null)}
          />
          {uploading && <p className="mt-3 text-cyan-300">Processing lecture...</p>}
          <div className="mx-auto mt-8 max-w-xl text-left">
            <label className="block text-sm text-zinc-400">YouTube URL</label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row">
              <input
                type="url"
                placeholder="https://www.youtube.com/watch?v=..."
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={youtubeBusy || !youtubeUrl.trim()}
                onClick={onYoutubeIngest}
                className="rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
              >
                {youtubeBusy ? "Importing…" : "Import video"}
              </button>
            </div>
            {youtubeError && <p className="mt-2 text-sm text-red-400">{youtubeError}</p>}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <EducationalInsightBadge insight={selectedInsight} />
        </div>
        <select
          value={lectureId}
          onChange={(e) => setLectureId(e.target.value)}
          className="mt-2 w-full rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <option value="">Select lecture</option>
          {lectures.map((l) => (
            <option key={l._id} value={l._id}>
              {l.title}
            </option>
          ))}
        </select>
        <div className="mt-4 text-sm text-zinc-400">Lectures: {lectures.length}</div>
      </div>
      <div className="glass rounded-2xl p-6">
        <h2 className="text-xl font-semibold">Context-aware AI Tutor</h2>
        <EducationalSoftWarning insight={selectedInsight} className="mt-4" />
        <textarea
          className="mt-4 min-h-36 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Ask from lecture context..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button
          className="mt-4 rounded-xl bg-cyan-600 px-5 py-2.5 disabled:opacity-40"
          disabled={!tutorOk}
          onClick={askTutor}
        >
          Ask NeuroLearn AI
        </button>
        {answer && (
          <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-zinc-200">
            {answer}
          </div>
        )}
      </div>
    </section>
  );
}
