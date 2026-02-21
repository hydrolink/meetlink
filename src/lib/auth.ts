import { createHmac } from "crypto";
import { db } from "@/db";
import { plans, participants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Extracts Bearer token from Authorization header.
 * Returns null if missing or malformed.
 */
export function extractBearerToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7).trim() || null;
}

/**
 * Validates a participant token for a given plan.
 * Returns the participant row if valid, null otherwise.
 */
export async function validateParticipantToken(
  planId: string,
  token: string
): Promise<(typeof participants.$inferSelect) | null> {
  const results = await db
    .select()
    .from(participants)
    .where(and(eq(participants.planId, planId), eq(participants.token, token)))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Validates a host token for a given plan.
 * Returns the plan row if valid, null otherwise.
 */
export async function validateHostToken(
  planId: string,
  hostToken: string
): Promise<(typeof plans.$inferSelect) | null> {
  const results = await db
    .select()
    .from(plans)
    .where(and(eq(plans.id, planId), eq(plans.hostToken, hostToken)))
    .limit(1);
  return results[0] ?? null;
}

/**
 * Auth middleware for participant-protected routes.
 * Returns participant row or a 401/403 Response.
 */
export async function requireParticipantAuth(
  request: Request,
  planId: string
): Promise<(typeof participants.$inferSelect) | Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return Response.json({ error: "Missing authorization token" }, { status: 401 });
  }
  const participant = await validateParticipantToken(planId, token);
  if (!participant) {
    return Response.json({ error: "Invalid token" }, { status: 403 });
  }
  return participant;
}

/**
 * Auth middleware for host-protected routes.
 * Returns plan row or a 401/403 Response.
 */
export async function requireHostAuth(
  request: Request,
  planId: string
): Promise<(typeof plans.$inferSelect) | Response> {
  const token = extractBearerToken(request);
  if (!token) {
    return Response.json({ error: "Missing authorization token" }, { status: 401 });
  }
  const plan = await validateHostToken(planId, token);
  if (!plan) {
    return Response.json({ error: "Invalid host token" }, { status: 403 });
  }
  return plan;
}

/**
 * Validates Telegram WebApp initData using HMAC-SHA256.
 * Should be called server-side when telegramInitData is provided.
 * Reference: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(initData: string, botToken: string): boolean {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return false;

    params.delete("hash");
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");

    const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
    const expectedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    return expectedHash === hash;
  } catch {
    return false;
  }
}
