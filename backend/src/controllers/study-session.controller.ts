import { Response } from "express";
import { z } from "zod";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserModel } from "../models/User";
import { recordStudyActivity } from "../utils/study-stats";

const schema = z.object({
  seconds: z.number().min(1).max(7200)
});

/**
 * Client-reported watch segment (e.g. player heartbeat every 30s while tab focused).
 */
export async function reportWatchTime(req: AuthenticatedRequest, res: Response) {
  const { seconds } = schema.parse(req.body);
  await UserModel.updateOne({ _id: req.user!.id }, { $inc: { watchSecondsTotal: Math.floor(seconds) } });

  const minutesDelta = Math.floor(seconds / 60);
  let userStats = null;
  if (minutesDelta > 0) {
    userStats = await recordStudyActivity(req.user!.id, { minutesDelta, xpDelta: 0 });
  }

  const io = req.app.get("io") as import("socket.io").Server | undefined;
  if (userStats && io) {
    io.to(`user:${req.user!.id}`).emit("analytics:update", { userStats });
  }

  return res.json({ ok: true, creditedMinutes: minutesDelta });
}
