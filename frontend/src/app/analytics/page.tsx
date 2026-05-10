"use client";

import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";

type UserStats = {
  xp: number;
  studyStreak: number;
  minutesStudiedTotal: number;
  watchSecondsTotal?: number;
  lastStudyDay?: string;
};

export default function AnalyticsPage() {
  const [data, setData] = useState<Array<{ topic: string; score: number }>>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);

  useEffect(() => {
    api.get("/analytics").then((res) => {
      const confidence = (res.data?.confidence || []) as Array<{ topic: string; confidenceScore: number }>;
      setData(confidence.map((item) => ({ topic: item.topic, score: item.confidenceScore })));
      setUserStats(res.data?.userStats || null);
    });
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Confidence & Mastery Analytics</h1>

      {userStats && (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">XP</p>
            <p className="mt-1 text-3xl font-semibold text-cyan-400">{userStats.xp}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Streak (days)</p>
            <p className="mt-1 text-3xl font-semibold text-purple-400">{userStats.studyStreak}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Study minutes</p>
            <p className="mt-1 text-3xl font-semibold text-amber-400">{userStats.minutesStudiedTotal}</p>
          </div>
          <div className="glass rounded-2xl p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-500">Player watch (hours)</p>
            <p className="mt-1 text-3xl font-semibold text-emerald-400">
              {((userStats.watchSecondsTotal ?? 0) / 3600).toFixed(1)}
            </p>
          </div>
        </div>
      )}

      <div className="glass mt-8 h-[420px] rounded-2xl p-6">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="rgba(255,255,255,.15)" />
            <PolarAngleAxis dataKey="topic" stroke="#A1A1AA" />
            <Radar dataKey="score" stroke="#06B6D4" fill="#7C3AED" fillOpacity={0.45} />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
