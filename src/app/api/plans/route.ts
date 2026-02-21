import { nanoid } from "nanoid";
import { db } from "@/db";
import { plans } from "@/db/schema";
import { countSlots } from "@/lib/slots";
import type { CreatePlanRequest, CreatePlanResponse } from "@/types";

export async function POST(request: Request) {
  try {
    const body: CreatePlanRequest = await request.json();

    // Basic validation
    if (!body.title?.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    if (!body.timezone) {
      return Response.json({ error: "Timezone is required" }, { status: 400 });
    }
    if (!body.startDate || !body.endDate) {
      return Response.json({ error: "Date range is required" }, { status: 400 });
    }
    if (body.startDate > body.endDate) {
      return Response.json({ error: "Start date must be before or equal to end date" }, { status: 400 });
    }
    if (!body.dayStartTime || !body.dayEndTime) {
      return Response.json({ error: "Day time window is required" }, { status: 400 });
    }
    if (body.dayStartTime >= body.dayEndTime) {
      return Response.json({ error: "Day start time must be before end time" }, { status: 400 });
    }
    if (![15, 30, 60].includes(body.slotMinutes)) {
      return Response.json({ error: "Slot granularity must be 15, 30, or 60 minutes" }, { status: 400 });
    }

    // Guard against unreasonably large plans
    const slotCount = countSlots({
      startDate: body.startDate,
      endDate: body.endDate,
      timezone: body.timezone,
      dayStartTime: body.dayStartTime,
      dayEndTime: body.dayEndTime,
      slotMinutes: body.slotMinutes,
      workingDays: body.workingDays ?? [0, 1, 2, 3, 4, 5, 6],
    });

    if (slotCount > 50_000) {
      return Response.json(
        { error: "Plan generates too many slots (max 50,000). Reduce the date range or increase slot granularity." },
        { status: 400 }
      );
    }

    const id = nanoid();
    const hostToken = nanoid();
    const now = Math.floor(Date.now() / 1000);

    await db.insert(plans).values({
      id,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      timezone: body.timezone,
      startDate: body.startDate,
      endDate: body.endDate,
      dayStartTime: body.dayStartTime,
      dayEndTime: body.dayEndTime,
      slotMinutes: body.slotMinutes,
      workingDays: JSON.stringify(body.workingDays ?? [0, 1, 2, 3, 4, 5, 6]),
      maxParticipants: body.maxParticipants ?? null,
      hideParticipants: body.hideParticipants ?? false,
      createdAt: now,
      createdByTelegramId: body.createdByTelegramId ?? null,
      hostToken,
    });

    const response: CreatePlanResponse = { id, hostToken };
    return Response.json(response, { status: 201 });
  } catch (error) {
    console.error("POST /api/plans error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
