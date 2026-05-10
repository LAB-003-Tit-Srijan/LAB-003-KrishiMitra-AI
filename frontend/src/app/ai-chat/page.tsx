"use client";

import { EducationalInsightBadge, EducationalSoftWarning } from "@/components/educational-insight-banner";
import { api } from "@/lib/api";
import type { EducationalInsight } from "@/lib/educational";
import { clientEffectiveTier, tierAllows } from "@/lib/educational";
import { useEffect, useMemo, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function AIChatPage() {
  const [q, setQ] = useState("");
  const [insight, setInsight] = useState<EducationalInsight | null>(null);
  const [lectureId, setLectureId] = useState("");
  const [lectures, setLectures] = useState<Array<{ _id: string; title: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [refs, setRefs] = useState<Array<{ text: string; startSec: number; endSec: number }>>([]);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const quickPrompts = useMemo(
    () => ["Explain routing protocols simply", "Give me a quiz on OSI layers", "Summarize subnetting"],
    []
  );

  useEffect(() => {
    api.get("/lectures").then((res) => {
      setLectures(res.data);
      if (res.data?.[0]?._id) setLectureId(res.data[0]._id);
    });
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080");
    socket.on("tutor:chunk", (payload: {
      token?: string;
      done?: boolean;
      references?: Array<{ text: string; startSec: number; endSec: number }>;
      error?: string;
    }) => {
      if (payload.error) {
        setLoading(false);
        setAnswer((prev) => `${prev}\n[${payload.error}]`);
        return;
      }
      if (payload.done) {
        setLoading(false);
        if (payload.references?.length) setRefs(payload.references);
        return;
      }
      if (payload.token) {
        setAnswer((prev) => prev + payload.token);
      }
    });
    socketRef.current = socket;
    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!lectureId) {
      setInsight(null);
      return;
    }
    api.get(`/lectures/${lectureId}`).then((res) => {
      setInsight((res.data?.educationalInsight as EducationalInsight) ?? null);
    });
  }, [lectureId]);

  const tutorOk = tierAllows(clientEffectiveTier(insight), "tutor");

  async function streamAnswer() {
    if (!tutorOk || !q.trim() || !lectureId || !socketRef.current?.id) return;
    setAnswer("");
    setRefs([]);
    setLoading(true);
    await api.post("/chat/ask-stream", {
      lectureId,
      question: q,
      socketId: socketRef.current.id
    });
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Context-Aware AI Tutor</h1>
      <EducationalSoftWarning insight={insight} className="mt-4" />
      <div className="glass mt-6 rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <EducationalInsightBadge insight={insight} />
        </div>
        <div className="mb-4 flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-white/20 px-3 py-1 text-sm text-zinc-300"
              onClick={() => setQ(prompt)}
            >
              {prompt}
            </button>
          ))}
        </div>
        <select
          value={lectureId}
          onChange={(e) => setLectureId(e.target.value)}
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 p-3"
        >
          <option value="">Select lecture</option>
          {lectures.map((l) => (
            <option key={l._id} value={l._id}>
              {l.title}
            </option>
          ))}
        </select>
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="min-h-40 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Ask from lecture context..."
        />
        {!tutorOk && (
          <p className="mt-2 text-sm text-zinc-500">
            Tutor chat is unavailable for this classification. Open the Learn page for playback and summaries.
          </p>
        )}
        <button
          className="mt-4 rounded-xl bg-purple-600 px-5 py-2.5 disabled:opacity-40"
          onClick={streamAnswer}
          disabled={loading || !tutorOk}
        >
          {loading ? "Streaming..." : "Stream Answer"}
        </button>
        {answer && <div className="mt-4 rounded-xl border border-white/10 bg-white/5 p-4 text-sm">{answer}</div>}
        {refs.length > 0 && (
          <div className="mt-3 text-xs text-zinc-400">
            <p className="font-medium text-zinc-300">References</p>
            <ul className="mt-2 space-y-1">
              {refs.slice(0, 6).map((r, i) => (
                <li key={i}>
                  {Math.floor(r.startSec / 60)}:{String(Math.floor(r.startSec % 60)).padStart(2, "0")} —{" "}
                  {r.text.slice(0, 140)}
                  …
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
