import crypto from "crypto";
import { env } from "../config/env.js";

function addMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

function addDays(date, days) {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

export function generateSessionTokens(now = new Date()) {
  return {
    accessToken: crypto.randomBytes(32).toString("hex"),
    refreshToken: crypto.randomBytes(48).toString("hex"),
    accessExpiresAt: addMinutes(now, env.token.accessTokenTtlMinutes),
    refreshExpiresAt: addDays(now, env.token.refreshTokenTtlDays),
  };
}

export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

