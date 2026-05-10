"use client";

import ReactPlayer from "react-player/lazy";
import type { ReactNode } from "react";
import { useMemo, useRef } from "react";

function isYoutubeUrl(url: string) {
  return /youtube\.com|youtu\.be/i.test(url);
}

type TranscriptChunk = {
  id: string;
  text: string;
  startSec: number;
  endSec: number;
};

function formatTs(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function SmartPlayer({
  videoUrl,
  transcript,
  timeline,
  chatSlot,
  notebookLayout = false
}: {
  videoUrl: string;
  transcript: TranscriptChunk[];
  timeline: Array<{ id: string; timestamp: number; label: string; importance: number }>;
  /** NotebookLM-style: video left, chat right, transcript strip below */
  chatSlot?: ReactNode;
  notebookLayout?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<ReactPlayer | null>(null);
  const topTimeline = useMemo(() => timeline.slice(0, 8), [timeline]);

  function jumpTo(sec: number) {
    if (isYoutubeUrl(videoUrl)) {
      playerRef.current?.seekTo(sec, "seconds");
      return;
    }
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
    videoRef.current.play().catch(() => {});
  }

  const transcriptButtons = transcript.map((chunk) => (
    <button
      key={chunk.id}
      type="button"
      onClick={() => jumpTo(chunk.startSec)}
      className="block min-w-[220px] max-w-xs shrink-0 rounded-lg border border-white/10 bg-white/5 p-3 text-left text-sm text-zinc-200 hover:border-purple-400/70 md:max-w-none md:min-w-0 md:w-full"
    >
      <span className="mb-1 block text-xs text-cyan-400/90">{formatTs(chunk.startSec)}</span>
      {chunk.text}
    </button>
  ));

  if (notebookLayout && chatSlot) {
    return (
      <section className="mx-auto max-w-7xl space-y-6 px-6 py-10">
        <div className="grid gap-6 lg:grid-cols-[1.25fr_380px] lg:items-start">
          <div className="glass rounded-2xl p-4">
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              {isYoutubeUrl(videoUrl) ? (
                <ReactPlayer ref={playerRef} url={videoUrl} controls width="100%" height="100%" />
              ) : (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="aspect-video h-full w-full rounded-xl bg-black"
                />
              )}
            </div>
            <div className="mt-4 grid gap-2">
              {topTimeline.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => jumpTo(m.timestamp)}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-cyan-400/60"
                >
                  {formatTs(m.timestamp)} — {m.label}
                </button>
              ))}
            </div>
          </div>
          <aside className="glass flex max-h-[min(85vh,920px)] flex-col rounded-2xl p-4">{chatSlot}</aside>
        </div>
        <div className="glass rounded-2xl p-4">
          <h2 className="mb-3 text-lg font-medium">Transcript timeline</h2>
          <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:max-h-[280px] md:grid-cols-2 md:overflow-y-auto lg:grid-cols-3">
            {transcriptButtons}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-6 py-10 lg:grid-cols-[1.25fr_.75fr]">
      <div className="glass rounded-2xl p-4">
        <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
          {isYoutubeUrl(videoUrl) ? (
            <ReactPlayer ref={playerRef} url={videoUrl} controls width="100%" height="100%" />
          ) : (
            <video ref={videoRef} src={videoUrl} controls className="aspect-video h-full w-full rounded-xl bg-black" />
          )}
        </div>
        <div className="mt-4 grid gap-2">
          {topTimeline.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => jumpTo(m.timestamp)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition hover:border-cyan-400/60"
            >
              {formatTs(m.timestamp)} — {m.label}
            </button>
          ))}
        </div>
      </div>
      <aside className="glass rounded-2xl p-4">
        <h2 className="text-lg font-medium">Transcript Sync</h2>
        <div className="mt-3 max-h-[520px] space-y-2 overflow-auto pr-1">{transcriptButtons}</div>
      </aside>
    </section>
  );
}
