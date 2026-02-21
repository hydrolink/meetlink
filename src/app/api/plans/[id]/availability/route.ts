import { db } from "@/db";
import { plans, availability } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { requireParticipantAuth } from "@/lib/auth";
import { generateSlots } from "@/lib/slots";
import type { UpsertAvailabilityRequest, GetAvailabilityResponse } from "@/types";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const participant = await requireParticipantAuth(request, id);
    if (participant instanceof Response) return participant;

    const body: UpsertAvailabilityRequest = await request.json();

    if (!Array.isArray(body.slots) || body.slots.length === 0) {
      return Response.json({ error: "slots array is required and must not be empty" }, { status: 400 });
    }

    if (body.slots.length > 10_000) {
      return Response.json({ error: "Too many slots in a single request (max 10,000)" }, { status: 400 });
    }

    // Fetch plan to validate slot keys
    const plan = await db
      .select()
      .from(plans)
      .where(eq(plans.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!plan) {
      return Response.json({ error: "Plan not found" }, { status: 404 });
    }

    // Validate all provided slotKeys against the plan's actual generated slots
    // This prevents phantom slot injection that could corrupt aggregation
    const validSlots = new Set(
      generateSlots({
        startDate: plan.startDate,
        endDate: plan.endDate,
        timezone: plan.timezone,
        dayStartTime: plan.dayStartTime,
        dayEndTime: plan.dayEndTime,
        slotMinutes: plan.slotMinutes,
        workingDays: JSON.parse(plan.workingDays),
      }).map((s) => s.slotKey)
    );

    const invalidKeys = body.slots.filter((s) => !validSlots.has(s.slotKey));
    if (invalidKeys.length > 0) {
      return Response.json(
        { error: `Invalid slot keys provided: ${invalidKeys.slice(0, 3).map((s) => s.slotKey).join(", ")}` },
        { status: 400 }
      );
    }

    // Batch upsert with conflict resolution
    await db
      .insert(availability)
      .values(
        body.slots.map((s) => ({
          participantId: participant.id,
          slotKey: s.slotKey,
          available: s.available,
        }))
      )
      .onConflictDoUpdate({
        target: [availability.participantId, availability.slotKey],
        set: { available: sql`excluded.available` },
      });

    return Response.json({ updated: body.slots.length });
  } catch (error) {
    console.error("POST /api/plans/[id]/availability error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const participant = await requireParticipantAuth(request, id);
    if (participant instanceof Response) return participant;

    const rows = await db
      .select({
        slotKey: availability.slotKey,
        available: availability.available,
      })
      .from(availability)
      .where(eq(availability.participantId, participant.id));

    const response: GetAvailabilityResponse = {
      participantId: participant.id,
      slots: rows,
    };

    return Response.json(response);
  } catch (error) {
    console.error("GET /api/plans/[id]/availability error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
