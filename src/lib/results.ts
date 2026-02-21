import type { SlotResult } from "@/types";

/**
 * Re-filters slot results to only count selected participants.
 * Runs entirely in the browser for the participant filter interaction.
 */
export function filterSlotResults(
  slots: SlotResult[],
  selectedParticipantIds: Set<string>
): SlotResult[] {
  if (selectedParticipantIds.size === 0) return slots;

  return slots.map((slot) => {
    const filtered = slot.availableParticipantIds.filter((id) =>
      selectedParticipantIds.has(id)
    );
    return {
      ...slot,
      availableCount: filtered.length,
      availableParticipantIds: filtered,
    };
  });
}

/**
 * Returns the top N slots sorted by availableCount descending.
 * Tiebreak: earlier slotKey wins (sooner is better).
 */
export function getTopSlots(slots: SlotResult[], n: number = 10): SlotResult[] {
  return [...slots]
    .filter((s) => s.availableCount > 0)
    .sort((a, b) => {
      if (b.availableCount !== a.availableCount) return b.availableCount - a.availableCount;
      return a.slotKey.localeCompare(b.slotKey);
    })
    .slice(0, n);
}

/**
 * Computes heatmap intensity (0.0-1.0) for a slot.
 */
export function slotIntensity(slot: SlotResult, totalParticipants: number): number {
  if (totalParticipants === 0) return 0;
  return slot.availableCount / totalParticipants;
}

/**
 * Groups slot results by localDate for calendar rendering.
 */
export function groupSlotsByDate(slots: SlotResult[]): Map<string, SlotResult[]> {
  const grouped = new Map<string, SlotResult[]>();
  for (const slot of slots) {
    if (!grouped.has(slot.localDate)) grouped.set(slot.localDate, []);
    grouped.get(slot.localDate)!.push(slot);
  }
  return grouped;
}

/**
 * Returns heatmap CSS color based on intensity (0.0-1.0).
 * 0 = light cream, 1 = warm amber.
 */
export function intensityToColor(intensity: number): string {
  if (intensity === 0) return "hsl(38 36% 89%)";

  // Interpolate from warm beige to toasted amber.
  const hue = Math.round(42 - intensity * 14); // 42 -> 28
  const saturation = Math.round(42 + intensity * 28); // 42 -> 70
  const lightness = Math.round(86 - intensity * 40); // 86 -> 46
  return `hsl(${hue} ${saturation}% ${lightness}%)`;
}
