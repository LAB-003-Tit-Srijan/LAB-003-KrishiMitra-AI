"use client";

import { EducationalInsightBadge, EducationalSoftWarning } from "@/components/educational-insight-banner";
import { api } from "@/lib/api";
import type { EducationalInsight } from "@/lib/educational";
import { clientEffectiveTier, tierAllows } from "@/lib/educational";
import { useEffect, useState } from "react";

export default function RevisionHubPage() {
  const [lectureId, setLectureId] = useState("");
  const [insight, setInsight] = useState<EducationalInsight | null>(null);
  const [lectures, setLectures] = useState<Array<{ _id: string; title: string }>>([]);
  const [topic, setTopic] = useState("Routing");
  const [plan, setPlan] = useState("");
  const [flashcards, setFlashcards] = useState<Array<{ front: string; back: string }>>([]);

  useEffect(() => {
    api.get("/lectures").then((res) => {
      setLectures(res.data);
      if (res.data?.[0]?._id) setLectureId(res.data[0]._id);
    });
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

  const tier = clientEffectiveTier(insight);
  const planOk = tierAllows(tier, "revision");
  const cardsOk = tierAllows(tier, "flashcards");

  async function generatePlan() {
    if (!lectureId) return;
    const { data } = await api.post("/revision/generate", { lectureId, weakTopics: [topic] });
    setPlan(data.generatedPlan || "");
  }

  async function generateCards() {
    if (!lectureId) return;
    const { data } = await api.post("/flashcards/generate", { lectureId, topic });
    setFlashcards(data || []);
  }

  return (
    <section className="mx-auto max-w-6xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Revision Hub</h1>
      <EducationalSoftWarning insight={insight} className="mt-4" />
      <div className="glass mt-6 rounded-2xl p-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <EducationalInsightBadge insight={insight} />
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <select
            value={lectureId}
            onChange={(e) => setLectureId(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
          >
            <option value="">Select lecture</option>
            {lectures.map((l) => (
              <option key={l._id} value={l._id}>
                {l.title}
              </option>
            ))}
          </select>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 p-3"
            placeholder="Weak topic"
          />
          <div className="flex gap-3">
            <button
              className="rounded-xl bg-purple-600 px-4 py-2 disabled:opacity-40"
              disabled={!planOk}
              title={!planOk ? "Adaptive revision needs strongly educational content." : undefined}
              onClick={generatePlan}
            >
              Generate Plan
            </button>
            <button
              className="rounded-xl bg-cyan-600 px-4 py-2 disabled:opacity-40"
              disabled={!cardsOk}
              title={!cardsOk ? "Flashcard generation needs strongly educational content." : undefined}
              onClick={generateCards}
            >
              Flashcards
            </button>
          </div>
        </div>
      </div>
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {["Personalized Roadmap", "Targeted Quiz", "Flashcards", "Micro Notes"].map((item) => (
          <article key={item} className="glass rounded-2xl p-6">
            <h2 className="text-lg font-medium">{item}</h2>
            <p className="mt-2 text-sm text-zinc-300">Auto-generated from weak topic signals and confidence drops.</p>
          </article>
        ))}
      </div>
      {plan && (
        <article className="glass mt-6 rounded-2xl p-6">
          <h2 className="text-lg font-medium">Generated Plan</h2>
          <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">{plan}</p>
        </article>
      )}
      {flashcards.length > 0 && (
        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {flashcards.map((card, idx) => (
            <article key={`${card.front}-${idx}`} className="glass rounded-xl p-4">
              <p className="text-sm text-cyan-300">{card.front}</p>
              <p className="mt-2 text-sm text-zinc-300">{card.back}</p>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
