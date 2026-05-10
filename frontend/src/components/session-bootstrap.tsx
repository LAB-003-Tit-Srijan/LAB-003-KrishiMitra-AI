"use client";

import { useEffect } from "react";
import { api, bootstrapSession } from "@/lib/api";
import { useAppStore } from "@/lib/store";

export function SessionBootstrap() {
  const setUser = useAppStore((s) => s.setUser);

  useEffect(() => {
    bootstrapSession();
    api
      .get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null));
  }, [setUser]);

  return null;
}
