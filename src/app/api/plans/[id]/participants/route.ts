import { nanoid } from "nanoid";
import { db } from "@/db";
import { plans, participants } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import type { JoinPlanRequest, JoinPlanResponse } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    const body: JoinPlanRequest = await request.json();

    if (!body.displayName?.trim()) {
      return Response.json({ error: "Display name is required" }, { status: 400 });
    }

    // Check participant cap
    if (plan.maxParticipants) {
      const [{ count }] = await db
        .select({ count: sql<number>`count(*)` })
        .from(participants)
        .where(eq(participants.planId, id));

      if (count >= plan.maxParticipants) {
        return Response.json({ error: "This plan has reached its participant limit" }, { status: 409 });
      }
    }

    // If Telegram user provided, check for existing session (idempotent join)
    if (body.telegramUserId) {
      const existing = await db
        .select()
        .from(participants)
        .where(
          and(
            eq(participants.planId, id),
            eq(participants.telegramUserId, body.telegramUserId)
          )
        )
        .limit(1)
        .then((r) => r[0]);

      if (existing) {
        const response: JoinPlanResponse = {
          participantId: existing.id,
          token: existing.token,
          planId: id,
        };
        return Response.json(response);
      }
    }

    const participantId = nanoid();
    const token = nanoid();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(participants).values({
      id: participantId,
      planId: id,
      displayName: body.displayName.trim(),
      telegramUserId: body.telegramUserId ?? null,
      token,
      createdAt: now,
    });

    const response: JoinPlanResponse = { participantId, token, planId: id };
    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/plans/[id]/participants error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
