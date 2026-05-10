"use client";

import { Flame, BrainCircuit, Trophy, Timer } from "lucide-react";
import { LiveUpdates } from "@/components/live-updates";
import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/lib/store";

const cards = [
  { label: "Study Streak", value: "18 days", icon: Flame, tone: "from-pink-500/30 to-purple-500/10" },
  { label: "AI Productivity", value: "87/100", icon: BrainCircuit, tone: "from-cyan-500/30 to-blue-500/10" },
  { label: "XP Points", value: "12,480", icon: Trophy, tone: "from-purple-500/30 to-fuchsia-500/10" },
  { label: "Focus Time", value: "42h", icon: Timer, tone: "from-indigo-500/30 to-cyan-500/10" }
];

export default function DashboardPage() {
  const user = useAppStore((s) => s.user);
  const [stats, setStats] = useState<{ streak: number; xp: number; productivity: number; prep: number }>({
    streak: 0,
    xp: 0,
    productivity: 0,
    prep: 0
  });

  useEffect(() => {
    api
      .get("/analytics")
      .then((res) => {
        const a = res.data?.analytics;
        setStats({
          streak: user?.studyStreak || 0,
          xp: user?.xp || 0,
          productivity: a?.productivityScore || 0,
          prep: a?.preparedScore || 0
        });
      })
      .catch(() => {
        setStats({
          streak: user?.studyStreak || 0,
          xp: user?.xp || 0,
          productivity: 0,
          prep: 0
        });
      });
  }, [user?.studyStreak, user?.xp]);

  const dynamicCards = useMemo(
    () => [
      { ...cards[0], value: `${stats.streak} days` },
      { ...cards[1], value: `${stats.productivity}/100` },
      { ...cards[2], value: `${stats.xp.toLocaleString()}` },
      { ...cards[3], value: `${stats.prep}%` }
    ],
    [stats]
  );

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="bg-gradient-to-r from-purple-300 via-cyan-300 to-pink-300 bg-clip-text text-3xl font-semibold text-transparent">
        AI Study Analytics Dashboard
      </h1>
      <p className="mt-2 text-zinc-300">
        Study streak, productivity, confidence trend, mastery and revision consistency.
      </p>
      <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        {dynamicCards.map((card) => (
          <div key={card.label} className={`glass rounded-2xl bg-gradient-to-br ${card.tone} p-6 transition hover:-translate-y-1`}>
            <card.icon className="h-5 w-5 text-cyan-300" />
            <p className="mt-4 text-sm text-zinc-400">{card.label}</p>
            <p className="mt-2 text-3xl font-bold text-cyan-200">{card.value}</p>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-medium">Adaptive Revision Intelligence</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Weak detected: Routing Concepts, Subnetting. Personalized revision generated with smart quiz and flashcards.
          </p>
        </div>
        <div className="glass rounded-2xl p-6">
          <h2 className="text-lg font-medium">Mood-based Learning Assistant</h2>
          <p className="mt-2 text-sm text-zinc-300">
            Current mode: Focused Sprint. AI recommends 25-minute deep work and confidence booster recap.
          </p>
        </div>
        <LiveUpdates userId={user?.id} />
      </div>
    </section>
  );
}
