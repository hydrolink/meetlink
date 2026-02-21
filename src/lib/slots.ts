import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { eachDayOfInterval, format, getDay, parseISO } from "date-fns";
import type { SlotInfo } from "@/types";

export interface PlanSlotParams {
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  timezone: string; // IANA
  dayStartTime: string; // "HH:MM"
  dayEndTime: string; // "HH:MM"
  slotMinutes: number; // 15 | 30 | 60
  workingDays: number[]; // 0=Sun, 0-6
}

/**
 * Generates all valid slot keys for a plan.
 *
 * Algorithm:
 * 1. Enumerate every calendar day in [startDate, endDate]
 * 2. Filter out days whose DOW is not in workingDays
 * 3. For each valid day, iterate times from dayStartTime to < dayEndTime
 * 4. Convert each (localDate, localTime) to UTC via fromZonedTime
 * 5. Return slotKey as "YYYY-MM-DDTHH:MM" in UTC
 *
 * Why store UTC:
 * - Eliminates DST ambiguity (spring forward gap, fall back overlap)
 * - Comparison/aggregation operations work correctly across participants
 */
export function generateSlots(plan: PlanSlotParams): SlotInfo[] {
  const { startDate, endDate, timezone, dayStartTime, dayEndTime, slotMinutes, workingDays } =
    plan;

  const workingDaysSet = new Set(workingDays);
  const [startH, startM] = dayStartTime.split(":").map(Number);
  const [endH, endM] = dayEndTime.split(":").map(Number);

  const days = eachDayOfInterval({
    start: parseISO(startDate),
    end: parseISO(endDate),
  }).filter((day) => workingDaysSet.has(getDay(day)));

  const slots: SlotInfo[] = [];

  for (const day of days) {
    const localDateStr = format(day, "yyyy-MM-dd");
    const dow = getDay(day);

    let h = startH;
    let m = startM;

    while (h < endH || (h === endH && m < endM)) {
      const localTime = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      const utcDate = fromZonedTime(`${localDateStr}T${localTime}:00`, timezone);
      slots.push({
        slotKey: formatSlotKey(utcDate),
        localDate: localDateStr,
        localTime,
        dayOfWeek: dow,
      });

      const total = h * 60 + m + slotMinutes;
      h = Math.floor(total / 60);
      m = total % 60;
    }
  }

  return slots;
}

/**
 * Formats a Date object as slotKey: "YYYY-MM-DDTHH:MM" in UTC.
 * Seconds are omitted to keep keys compact and consistent.
 */
export function formatSlotKey(date: Date): string {
  const y = date.getUTCFullYear();
  const mo = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const h = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  return `${y}-${mo}-${d}T${h}:${mi}`;
}

/**
 * Parses a slotKey back to a UTC Date.
 */
export function parseSlotKey(slotKey: string): Date {
  return new Date(slotKey + ":00Z");
}

/**
 * Converts a UTC slotKey to display time in a given IANA timezone.
 */
export function slotKeyToLocalTime(
  slotKey: string,
  timezone: string
): { localDate: string; localTime: string; dayOfWeek: number } {
  const utcDate = parseSlotKey(slotKey);
  const local = toZonedTime(utcDate, timezone);
  return {
    localDate: format(local, "yyyy-MM-dd"),
    localTime: format(local, "HH:mm"),
    dayOfWeek: local.getDay(),
  };
}

/**
 * Returns the count of slots without building the full array.
 * Useful for the plan creation preview.
 */
export function countSlots(plan: PlanSlotParams): number {
  return generateSlots(plan).length;
}
