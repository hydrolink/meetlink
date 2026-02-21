import { db } from "@/db";
import { plans, participants } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { generateSlots } from "@/lib/slots";
import { requireHostAuth } from "@/lib/auth";
import type { PlanDetail } from "@/types";

export async function GET(
  _request: Request,
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

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(participants)
      .where(eq(participants.planId, id));

    const parsedWorkingDays = JSON.parse(plan.workingDays) as number[];

    const slots = generateSlots({
      startDate: plan.startDate,
      endDate: plan.endDate,
      timezone: plan.timezone,
      dayStartTime: plan.dayStartTime,
      dayEndTime: plan.dayEndTime,
      slotMinutes: plan.slotMinutes,
      workingDays: parsedWorkingDays,
    });

    // IMPORTANT: Never expose hostToken in GET responses
    const { hostToken: _hostToken, ...planWithoutToken } = plan;

    const response: PlanDetail = {
      ...planWithoutToken,
      workingDays: parsedWorkingDays,
      slots,
      participantCount: countResult.count,
    };

    return Response.json(response);
  } catch (error) {
    console.error("GET /api/plans/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const plan = await requireHostAuth(request, id);
    if (plan instanceof Response) return plan;

    const body = await request.json();

    // Only allow specific fields to be updated
    const allowedUpdates: Partial<typeof plans.$inferInsert> = {};
    let slotGranularityChanged = false;

    if (body.title !== undefined) allowedUpdates.title = String(body.title).trim();
    if (body.description !== undefined)
      allowedUpdates.description = body.description ? String(body.description).trim() : null;
    if (body.endDate !== undefined) allowedUpdates.endDate = body.endDate;
    if (body.dayStartTime !== undefined) allowedUpdates.dayStartTime = body.dayStartTime;
    if (body.dayEndTime !== undefined) allowedUpdates.dayEndTime = body.dayEndTime;
    if (body.maxParticipants !== undefined)
      allowedUpdates.maxParticipants = body.maxParticipants ?? null;
    if (body.hideParticipants !== undefined)
      allowedUpdates.hideParticipants = body.hideParticipants;
    if (body.workingDays !== undefined)
      allowedUpdates.workingDays = JSON.stringify(body.workingDays);

    if (body.slotMinutes !== undefined && body.slotMinutes !== plan.slotMinutes) {
      if (![15, 30, 60].includes(body.slotMinutes)) {
        return Response.json({ error: "Invalid slot granularity" }, { status: 400 });
      }
      allowedUpdates.slotMinutes = body.slotMinutes;
      slotGranularityChanged = true;
    }

    if (Object.keys(allowedUpdates).length === 0) {
      return Response.json({ error: "No valid fields to update" }, { status: 400 });
    }

    await db.update(plans).set(allowedUpdates).where(eq(plans.id, id));

    return Response.json({
      updated: true,
      warning: slotGranularityChanged
        ? "Slot granularity changed — existing availability responses may no longer align with new slots."
        : undefined,
    });
  } catch (error) {
    console.error("PATCH /api/plans/[id] error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
