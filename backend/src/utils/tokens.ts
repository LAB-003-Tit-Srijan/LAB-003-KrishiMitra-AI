import jwt from "jsonwebtoken";
import { env } from "../config/env";

export function signAccessToken(id: string, email: string) {
  return jwt.sign({ email }, env.jwtAccessSecret, { subject: id, expiresIn: "15m" });
}

export function signRefreshToken(id: string, email: string) {
  return jwt.sign({ email }, env.jwtRefreshSecret, { subject: id, expiresIn: "7d" });
}
