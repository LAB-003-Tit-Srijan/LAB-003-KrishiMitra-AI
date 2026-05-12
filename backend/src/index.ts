import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";
import { Server } from "socket.io";
import { connectDb } from "./config/db";
import { env } from "./config/env";
import { appRouter } from "./routes";

async function bootstrap() {
  await connectDb();
  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    cors: { origin: env.clientUrl, credentials: true }
  });
  app.set("io", io);

  console.log("CLIENT URL =", env.clientUrl);
  app.use(cors({ origin: env.clientUrl, credentials: true }));
  app.use(express.json({ limit: "10mb" }));
  app.use(rateLimit({ windowMs: 15 * 60 * 1000, limit: 250 }));
  app.get("/health", (_req, res) => res.json({ ok: true }));
  app.use("/api", appRouter);

  io.on("connection", (socket) => {
    socket.on("join-lecture", (lectureId: string) => socket.join(`lecture:${lectureId}`));
    socket.on("join-user", (userId: string) => socket.join(`user:${userId}`));

    socket.on(
      "join-study-room",
      (payload: { roomId?: string; displayName?: string }) => {
        if (!payload?.roomId) return;
        socket.join(`study-room:${payload.roomId}`);
        socket.to(`study-room:${payload.roomId}`).emit("study-room:presence", {
          socketId: socket.id,
          displayName: payload.displayName || "Anonymous",
          joined: true
        });
      }
    );
    socket.on("leave-study-room", (payload: { roomId?: string }) => {
      if (!payload?.roomId) return;
      socket.leave(`study-room:${payload.roomId}`);
    });
    socket.on("study-room:message", (payload: { roomId?: string; text?: string }) => {
      if (!payload?.roomId || !payload?.text?.trim()) return;
      socket.to(`study-room:${payload.roomId}`).emit("study-room:message", {
        socketId: socket.id,
        text: payload.text,
        ts: Date.now()
      });
    });
  });

  server.listen(env.port, () => {
    console.log(`NeuroLearn backend on :${env.port}`);
  });
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
