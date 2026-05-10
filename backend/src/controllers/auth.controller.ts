import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { z } from "zod";
import { env } from "../config/env";
import { AuthenticatedRequest } from "../middleware/auth";
import { UserModel } from "../models/User";
import { sendResetPasswordEmail } from "../services/email.service";
import { createResetToken, hashToken } from "../utils/crypto";
import { signAccessToken, signRefreshToken } from "../utils/tokens";

const authSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email(),
  password: z.string().min(8)
});

export async function signup(req: Request, res: Response) {
  const payload = authSchema.extend({ name: z.string().min(2) }).parse(req.body);
  const existing = await UserModel.findOne({ email: payload.email });
  if (existing) return res.status(409).json({ message: "Email already in use" });

  const passwordHash = await bcrypt.hash(payload.password, 12);
  const user = await UserModel.create({
    name: payload.name,
    email: payload.email,
    passwordHash
  });

  return res.status(201).json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    accessToken: signAccessToken(user.id, user.email),
    refreshToken: signRefreshToken(user.id, user.email)
  });
}

export async function login(req: Request, res: Response) {
  const payload = authSchema.parse(req.body);
  const user = await UserModel.findOne({ email: payload.email });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });
  const valid = await user.comparePassword(payload.password);
  if (!valid) return res.status(401).json({ message: "Invalid credentials" });

  return res.json({
    user: { id: user.id, name: user.name, email: user.email, plan: user.plan },
    accessToken: signAccessToken(user.id, user.email),
    refreshToken: signRefreshToken(user.id, user.email)
  });
}

export async function refresh(req: Request, res: Response) {
  const refreshToken = String(req.body?.refreshToken || "");
  if (!refreshToken) return res.status(400).json({ message: "refreshToken is required" });
  try {
    const payload = jwt.verify(refreshToken, env.jwtRefreshSecret) as { sub: string; email: string };
    const user = await UserModel.findById(payload.sub);
    if (!user) return res.status(401).json({ message: "Invalid refresh token" });
    return res.json({
      accessToken: signAccessToken(user.id, user.email),
      refreshToken: signRefreshToken(user.id, user.email)
    });
  } catch {
    return res.status(401).json({ message: "Invalid refresh token" });
  }
}

export async function forgotPassword(req: Request, res: Response) {
  const email = String(req.body?.email || "");
  if (!email) return res.status(400).json({ message: "email is required" });
  const user = await UserModel.findOne({ email });
  if (!user) return res.json({ message: "If this email exists, reset instructions were generated." });

  const { raw, hash } = createResetToken();
  user.resetTokenHash = hash;
  user.resetTokenExpiresAt = new Date(Date.now() + 1000 * 60 * 20);
  await user.save();
  const emailResult = await sendResetPasswordEmail(user.email, raw);

  return res.json({
    message: "Reset instructions generated",
    ...(emailResult.sent ? {} : { resetToken: raw, previewLink: emailResult.resetLink })
  });
}

export async function resetPassword(req: Request, res: Response) {
  const token = String(req.body?.token || "");
  const password = String(req.body?.password || "");
  if (!token || password.length < 8) {
    return res.status(400).json({ message: "token and valid password are required" });
  }

  const user = await UserModel.findOne({
    resetTokenHash: hashToken(token),
    resetTokenExpiresAt: { $gt: new Date() }
  });
  if (!user) return res.status(400).json({ message: "Invalid or expired reset token" });

  user.passwordHash = await bcrypt.hash(password, 12);
  user.resetTokenHash = undefined;
  user.resetTokenExpiresAt = undefined;
  await user.save();

  return res.json({ message: "Password reset successful" });
}

export async function me(req: AuthenticatedRequest, res: Response) {
  const user = await UserModel.findById(req.user?.id).select("name email plan studyStreak xp");
  if (!user) return res.status(401).json({ message: "Unauthorized" });
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    plan: user.plan,
    studyStreak: user.studyStreak,
    xp: user.xp
  });
}
