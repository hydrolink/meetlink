import { db } from "@/db";
import { plans, participants, availability } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { generateSlots } from "@/lib/slots";
import type { ResultsResponse, SlotResult, ParticipantInfo } from "@/types";

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

    // Fetch all participants for this plan
    const planParticipants = await db
      .select()
      .from(participants)
      .where(eq(participants.planId, id));

    // Use a JOIN to avoid the inArray(>1000) SQLite limit
    // This fetches all availability for any participant in this plan
    const allAvailability = await db
      .select({
        participantId: availability.participantId,
        slotKey: availability.slotKey,
      })
      .from(availability)
      .innerJoin(participants, eq(availability.participantId, participants.id))
      .where(and(eq(participants.planId, id), eq(availability.available, true)));

    // Aggregate: Map<slotKey, Set<participantId>>
    const slotMap = new Map<string, Set<string>>();
    for (const row of allAvailability) {
      if (!slotMap.has(row.slotKey)) slotMap.set(row.slotKey, new Set());
      slotMap.get(row.slotKey)!.add(row.participantId);
    }

    // Generate all valid slots and annotate with participant counts
    const parsedWorkingDays = JSON.parse(plan.workingDays) as number[];
    const allSlots = generateSlots({
      startDate: plan.startDate,
      endDate: plan.endDate,
      timezone: plan.timezone,
      dayStartTime: plan.dayStartTime,
      dayEndTime: plan.dayEndTime,
      slotMinutes: plan.slotMinutes,
      workingDays: parsedWorkingDays,
    });

    const slotResults: SlotResult[] = allSlots.map((slot) => {
      const participantSet = slotMap.get(slot.slotKey) ?? new Set();
      return {
        slotKey: slot.slotKey,
        localDate: slot.localDate,
        localTime: slot.localTime,
        availableCount: participantSet.size,
        availableParticipantIds: Array.from(participantSet),
      };
    });

    // Build participant list (respecting privacy mode)
    const participantList: ParticipantInfo[] = planParticipants.map((p) => ({
      id: p.id,
      displayName: plan.hideParticipants ? "" : p.displayName,
      telegramUserId: plan.hideParticipants ? null : p.telegramUserId,
    }));

    const response: ResultsResponse = {
      slots: slotResults,
      participants: participantList,
      totalParticipants: planParticipants.length,
    };

    return Response.json(response);
  } catch (error) {
    console.error("GET /api/plans/[id]/results error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
