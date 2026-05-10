"use client";

import { FormEvent, useState } from "react";
import { api, setAccessToken } from "@/lib/api";
import { useAppStore } from "@/lib/store";
import { useRouter } from "next/navigation";

type Mode = "login" | "signup" | "forgot" | "reset";

export function AuthForm({ mode }: { mode: Mode }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [token, setToken] = useState("");
  const [message, setMessage] = useState("");
  const setTokenStore = useAppStore((s) => s.setAccessToken);
  const setRefreshToken = useAppStore((s) => s.setRefreshToken);
  const setUser = useAppStore((s) => s.setUser);
  const router = useRouter();

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    try {
      if (mode === "login") {
        const { data } = await api.post("/auth/login", { email, password });
        setAccessToken(data.accessToken);
        setTokenStore(data.accessToken);
        setRefreshToken(data.refreshToken);
        setUser(data.user);
        localStorage.setItem("neurolearn_access_token", data.accessToken);
        localStorage.setItem("neurolearn_refresh_token", data.refreshToken);
        document.cookie = `neurolearn_access_token=${data.accessToken}; Path=/; Max-Age=86400; SameSite=Lax`;
        setMessage("Logged in successfully");
        router.push("/dashboard");
      }
      if (mode === "signup") {
        const { data } = await api.post("/auth/signup", { name, email, password });
        setAccessToken(data.accessToken);
        setTokenStore(data.accessToken);
        setRefreshToken(data.refreshToken);
        setUser(data.user);
        localStorage.setItem("neurolearn_access_token", data.accessToken);
        localStorage.setItem("neurolearn_refresh_token", data.refreshToken);
        document.cookie = `neurolearn_access_token=${data.accessToken}; Path=/; Max-Age=86400; SameSite=Lax`;
        setMessage("Account created");
        router.push("/dashboard");
      }
      if (mode === "forgot") {
        const { data } = await api.post("/auth/forgot-password", { email });
        setMessage(data.message || "Reset instructions sent");
      }
      if (mode === "reset") {
        const { data } = await api.post("/auth/reset-password", { token, password });
        setMessage(data.message || "Password reset complete");
      }
    } catch (err: any) {
      setMessage(err?.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <form onSubmit={onSubmit} className="glass mx-auto mt-10 max-w-md rounded-2xl p-6">
      <h1 className="text-2xl font-semibold capitalize">{mode.replace("-", " ")}</h1>
      {(mode === "signup" || mode === "login" || mode === "forgot") && (
        <input
          className="mt-4 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      )}
      {mode === "signup" && (
        <input
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      )}
      {(mode === "login" || mode === "signup" || mode === "reset") && (
        <input
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      )}
      {mode === "reset" && (
        <input
          className="mt-3 w-full rounded-xl border border-white/10 bg-white/5 p-3"
          placeholder="Reset token"
          value={token}
          onChange={(e) => setToken(e.target.value)}
        />
      )}
      <button className="mt-4 w-full rounded-xl bg-purple-600 py-2.5 font-medium">Continue</button>
      {message && <p className="mt-3 text-sm text-cyan-300">{message}</p>}
    </form>
  );
}
