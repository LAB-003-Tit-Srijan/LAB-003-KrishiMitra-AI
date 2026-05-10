import "./globals.css";
import Link from "next/link";
import type { Metadata } from "next";
import { SessionBootstrap } from "@/components/session-bootstrap";

export const metadata: Metadata = {
  title: "NeuroLearn AI - Your Adaptive AI Learning Companion",
  description: "AI-native adaptive LMS with contextual tutoring and revision intelligence."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionBootstrap />
        <header className="sticky top-0 z-30 border-b border-white/10 bg-[#050816cc] backdrop-blur">
          <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            <Link href="/" className="text-lg font-semibold text-white">
              NeuroLearn <span className="text-cyan-400">AI</span>
            </Link>
            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-300">
              <Link href="/dashboard">Dashboard</Link>
              <Link href="/workspace">Workspace</Link>
              <Link href="/player">Learn</Link>
              <Link href="/study-room">Study room</Link>
              <Link href="/ai-chat">AI Chat</Link>
              <Link href="/revision-hub">Revision Hub</Link>
              <Link href="/analytics">Analytics</Link>
            </div>
          </nav>
        </header>
        <main>{children}</main>
      </body>
    </html>
  );
}
