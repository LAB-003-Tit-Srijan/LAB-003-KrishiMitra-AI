"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";

export default function StudyRoomPage() {
  const [roomId, setRoomId] = useState("demo-room");
  const [displayName, setDisplayName] = useState("Learner");
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState<Array<{ socketId: string; text: string; ts: number }>>([]);
  const [presence, setPresence] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const socket = io(process.env.NEXT_PUBLIC_WS_URL || "http://localhost:8080");
    socket.on("study-room:message", (p: { socketId: string; text: string; ts: number }) => {
      setMessages((m) => [...m, p].slice(-80));
    });
    socket.on(
      "study-room:presence",
      (p: { socketId: string; displayName: string }) => {
        setPresence((prev) => [`${p.displayName} (${p.socketId.slice(0, 6)})`, ...prev].slice(0, 12));
      }
    );
    socketRef.current = socket;
    return () => socket.disconnect();
  }, []);

  function joinRoom() {
    const s = socketRef.current;
    if (!s || !roomId.trim()) return;
    s.emit("join-study-room", { roomId: roomId.trim(), displayName: displayName.trim() || "Anonymous" });
    setJoined(true);
  }

  function sendMessage() {
    const s = socketRef.current;
    if (!s || !draft.trim() || !roomId.trim()) return;
    const text = draft.trim();
    setDraft("");
    setMessages((m) => [...m, { socketId: s.id || "me", text, ts: Date.now() }].slice(-80));
    s.emit("study-room:message", { roomId: roomId.trim(), text });
  }

  return (
    <section className="mx-auto max-w-3xl px-6 py-10">
      <h1 className="text-3xl font-semibold">Collaborative study room</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Real-time presence + chat over Socket.IO. Same backend as the rest of NeuroLearn — no separate server.
      </p>

      <div className="glass mt-6 grid gap-4 rounded-2xl p-6">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="text-sm text-zinc-400">
            Room ID
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white"
            />
          </label>
          <label className="text-sm text-zinc-400">
            Display name
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 p-2 text-white"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={joinRoom}
          className="rounded-xl bg-cyan-600 px-4 py-2 text-sm font-medium"
        >
          Join room
        </button>
        {joined && <p className="text-xs text-emerald-400">Joined — keep this tab open to receive messages.</p>}
      </div>

      {presence.length > 0 && (
        <div className="glass mt-4 rounded-2xl p-4 text-sm text-zinc-300">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Recent presence</p>
          <ul className="mt-2 space-y-1">
            {presence.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="glass mt-6 flex flex-col rounded-2xl p-4">
        <div className="max-h-80 space-y-2 overflow-auto text-sm">
          {messages.length === 0 && <p className="text-zinc-500">No messages yet.</p>}
          {messages.map((m, i) => (
            <p key={`${m.ts}-${i}`} className="border-b border-white/5 pb-2">
              <span className="text-zinc-500">{new Date(m.ts).toLocaleTimeString()}</span>{" "}
              <span className="text-cyan-400">{m.socketId.slice(0, 6)}</span>: {m.text}
            </p>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Message the room…"
            className="flex-1 rounded-xl border border-white/10 bg-white/5 p-2 text-sm"
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
          />
          <button type="button" onClick={sendMessage} className="rounded-xl bg-purple-600 px-4 py-2 text-sm">
            Send
          </button>
        </div>
      </div>
    </section>
  );
}
