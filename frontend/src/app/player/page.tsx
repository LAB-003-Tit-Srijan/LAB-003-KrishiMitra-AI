"use client";

import { EducationalInsightBadge, EducationalSoftWarning } from "@/components/educational-insight-banner";
import { SmartPlayer } from "@/components/player/smart-player";
import { api } from "@/lib/api";
import type { EducationalInsight } from "@/lib/educational";
import { clientEffectiveTier, tierAllows } from "@/lib/educational";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

type Lecture = {
  _id: string;
  title: string;
  sourceUrl?: string;
};

function TutorSidebar({
  lectureId,
  insight
}: {
  lectureId: string;
  insight: EducationalInsight | null;
}) {
  const [q, setQ] = useState("");
  const [out, setOut] = useState("");
  const [refs, setRefs] = useState<
    Array<{
      text: string;
      startSec: number;
      endSec: number;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket: Socket = io(
      process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080",
      {
        transports: ["websocket"]
      }
    );

    socket.on(
      "tutor:chunk",
      (payload: {
        token?: string;
        done?: boolean;
        references?: typeof refs;
        error?: string;
      }) => {
        if (payload.error) {
          setLoading(false);

          setOut((prev) => `${prev}\n[${payload.error}]`);

          return;
        }

        if (payload.done) {
          setLoading(false);

          if (payload.references?.length) {
            setRefs(payload.references);
          }

          return;
        }

        if (payload.token) {
          setOut((prev) => prev + payload.token);
        }
      }
    );

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  const tier = clientEffectiveTier(insight);

  const tutorOk = tierAllows(tier, "tutor");

  async function streamAnswer() {
    if (
      !tutorOk ||
      !q.trim() ||
      !lectureId ||
      !socketRef.current?.id
    ) {
      return;
    }

    setOut("");
    setRefs([]);
    setLoading(true);

    try {
      await api.post("/chat/ask-stream", {
        lectureId,
        question: q,
        socketId: socketRef.current.id
      });
    } catch {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-full min-h-[320px] flex-col gap-3">
      <h3 className="text-lg font-medium text-zinc-100">
        AI tutor
      </h3>

      {!tutorOk && (
        <p className="rounded-lg border border-white/10 bg-white/5 px-2 py-2 text-xs text-zinc-400">
          AI tutor is limited for this material.
          Playback and transcript remain available;
          use AI summary for a concise overview.
        </p>
      )}

      <p className="text-xs text-zinc-500">
        Tip: try “Explain 12:40” or
        “what happens at 1:05:00?”
      </p>

      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask from lecture context…"
        className="min-h-28 flex-1 resize-none rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-zinc-200"
      />

      <button
        type="button"
        disabled={loading || !lectureId || !tutorOk}
        onClick={streamAnswer}
        className="rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? "Streaming…" : "Stream answer"}
      </button>

      {out && (
        <div className="max-h-52 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-sm leading-relaxed text-zinc-200">
          {out}
        </div>
      )}

      {refs.length > 0 && (
        <div className="text-xs text-zinc-400">
          <p className="mb-1 font-medium text-zinc-300">
            References
          </p>

          <ul className="space-y-1">
            {refs.slice(0, 5).map((r, i) => (
              <li key={i}>
                {Math.floor(r.startSec / 60)}:
                {String(
                  Math.floor(r.startSec % 60)
                ).padStart(2, "0")}
                {" — "}
                {r.text.slice(0, 120)}…
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default function PlayerPage() {
  const [lectures, setLectures] = useState<Lecture[]>([]);

  const [insight, setInsight] =
    useState<EducationalInsight | null>(null);

  const [lectureId, setLectureId] = useState("");

  const [videoUrl, setVideoUrl] = useState(
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
  );

  const [transcript, setTranscript] = useState<
    Array<{
      id: string;
      text: string;
      startSec: number;
      endSec: number;
    }>
  >([]);

  const [timeline, setTimeline] = useState<
    Array<{
      id: string;
      timestamp: number;
      label: string;
      importance: number;
    }>
  >([]);

  const [summary, setSummary] = useState("");

  const [quizJson, setQuizJson] = useState("");

  const [reco, setReco] = useState("");

  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    api
      .get("/lectures")
      .then((res) => {
        setLectures(res.data || []);

        if (res.data?.[0]?._id) {
          setLectureId(res.data[0]._id);
        }
      })
      .catch((err) => {
        console.error(err);
      });
  }, []);

  useEffect(() => {
    if (!lectureId) {
      setInsight(null);
      return;
    }

    Promise.all([
      api.get(`/lectures/${lectureId}`),
      api.get(`/timeline?lectureId=${lectureId}`)
    ])
      .then(([lectureRes, timelineRes]) => {
        const lecture = lectureRes.data?.lecture;

        setInsight(
          (lectureRes.data
            ?.educationalInsight as EducationalInsight) ??
            null
        );

        const chunks =
          lectureRes.data?.transcript?.chunks || [];

        setVideoUrl(
          lecture?.sourceUrl ||
            "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4"
        );

        setTranscript(
          chunks.map(
            (
              c: {
                embeddingId?: string;
                text: string;
                startSec: number;
                endSec: number;
              },
              idx: number
            ) => ({
              id: c.embeddingId || String(idx),
              text: c.text,
              startSec: c.startSec,
              endSec: c.endSec
            })
          )
        );

        setTimeline(timelineRes.data || []);
      })
      .catch((err) => {
        console.error(err);
      });

    setSummary("");
    setQuizJson("");
    setReco("");
  }, [lectureId]);

  useEffect(() => {
    if (!lectureId) return;

    const tick = () => {
      api
        .post("/study/watch-time", {
          seconds: 45
        })
        .catch(() => {});
    };

    const id = window.setInterval(tick, 45000);

    tick();

    return () => {
      window.clearInterval(id);
    };
  }, [lectureId]);

  const tier = clientEffectiveTier(insight);

  const quizOk = tierAllows(tier, "quiz");

  const recoOk = tierAllows(tier, "reco");

  async function run(
    action: "summary" | "quiz" | "reco"
  ) {
    if (!lectureId) return;

    setBusy(action);

    try {
      if (action === "summary") {
        const { data } = await api.post(
          "/learning/summary",
          {
            lectureId
          }
        );

        setSummary(data.summary || "");
      } else if (action === "quiz") {
        const { data } = await api.post(
          "/quiz/generate",
          {
            lectureId
          }
        );

        setQuizJson(
          JSON.stringify(
            data.questions || [],
            null,
            2
          )
        );
      } else {
        const { data } = await api.post(
          "/learning/recommendations",
          {
            lectureId
          }
        );

        setReco(data.recommendations || "");
      }
    } catch {
      //
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <section className="mx-auto max-w-7xl space-y-4 px-6 pt-10">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex-1 space-y-3">
            <EducationalSoftWarning insight={insight} />

            <div className="flex flex-wrap items-center gap-3">
              <label className="text-sm text-zinc-400">
                Lecture
              </label>

              <EducationalInsightBadge insight={insight} />
            </div>

            <select
              value={lectureId}
              onChange={(e) =>
                setLectureId(e.target.value)
              }
              className="glass mt-1 w-full max-w-xl rounded-xl border border-white/10 bg-white/5 p-3"
            >
              <option value="">
                Select lecture
              </option>

              {lectures.map((l) => (
                <option
                  key={l._id}
                  value={l._id}
                >
                  {l.title}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!lectureId || busy !== null}
              onClick={() => run("summary")}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              {busy === "summary"
                ? "…"
                : "AI summary"}
            </button>

            <button
              type="button"
              disabled={
                !lectureId ||
                busy !== null ||
                !quizOk
              }
              title={
                !quizOk
                  ? "Quiz generation needs strongly educational content."
                  : undefined
              }
              onClick={() => run("quiz")}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              {busy === "quiz"
                ? "…"
                : "Generate quiz"}
            </button>

            <button
              type="button"
              disabled={
                !lectureId ||
                busy !== null ||
                !recoOk
              }
              title={
                !recoOk
                  ? "Adaptive study plan needs strongly educational content."
                  : undefined
              }
              onClick={() => run("reco")}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm hover:bg-white/10 disabled:opacity-40"
            >
              {busy === "reco"
                ? "…"
                : "Study plan"}
            </button>
          </div>
        </div>

        {(summary || quizJson || reco) && (
          <div className="glass grid gap-4 rounded-2xl p-4 lg:grid-cols-3">
            {summary && (
              <div className="lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-cyan-400">
                  Summary
                </p>

                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">
                  {summary}
                </pre>
              </div>
            )}

            {quizJson && (
              <div className="lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-purple-400">
                  Quiz (JSON)
                </p>

                <pre className="mt-2 max-h-56 overflow-auto text-xs text-zinc-300">
                  {quizJson}
                </pre>
              </div>
            )}

            {reco && (
              <div className="lg:col-span-1">
                <p className="text-xs font-medium uppercase tracking-wide text-amber-400">
                  Recommendations
                </p>

                <pre className="mt-2 max-h-56 overflow-auto whitespace-pre-wrap text-xs text-zinc-300">
                  {reco}
                </pre>
              </div>
            )}
          </div>
        )}
      </section>

      <SmartPlayer
        videoUrl={videoUrl}
        transcript={transcript}
        timeline={timeline}
        notebookLayout
        chatSlot={
          <TutorSidebar
            lectureId={lectureId}
            insight={insight}
          />
        }
      />
    </div>
  );
}