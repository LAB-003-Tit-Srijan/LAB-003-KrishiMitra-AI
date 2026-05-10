"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { LandingParticles } from "./landing-particles";

export function Hero() {
  return (
    <section className="relative overflow-hidden px-6 py-28">
      <LandingParticles />
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_20%,rgba(124,58,237,.35),transparent_35%),radial-gradient(circle_at_80%_30%,rgba(6,182,212,.25),transparent_35%)]" />
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p className="mb-4 text-cyan-300">Your Adaptive AI Learning Companion</p>
          <h1 className="bg-gradient-to-r from-purple-400 via-cyan-300 to-pink-400 bg-clip-text text-5xl font-bold text-transparent lg:text-6xl">
           Revise 2-Hour Lectures in Just 5 Minutes
          </h1>
          <p className="mt-6 max-w-xl text-zinc-300">
            NeuroLearn AI understands lectures, detects weak concepts, and builds personalized
            revision journeys with confidence analytics.
          </p>
          <div className="mt-8 flex gap-4">
            <Link href="/dashboard" className="rounded-xl bg-purple-600 px-6 py-3 font-semibold shadow-neon">
              Start Learning
            </Link>
            <Link href="/workspace" className="glass rounded-xl px-6 py-3">
              Open AI Workspace
            </Link>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="glass neon-border rounded-3xl p-8"
        >
          <div className="mb-4 text-sm text-zinc-300">AI Confidence Meter</div>
          <div className="space-y-3">
            {[
              ["OSI Model", "92%"],
              ["Routing", "45%"],
              ["Subnetting", "38%"]
            ].map((item) => (
              <div key={item[0]} className="rounded-xl bg-white/5 p-4">
                <div className="flex items-center justify-between text-sm">
                  <span>{item[0]}</span>
                  <span className="text-cyan-300">{item[1]}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
