"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateFull, formatTime12h } from "@/lib/utils";
import { getTopSlots, groupSlotsByDate, intensityToColor, slotIntensity } from "@/lib/results";
import type { ParticipantInfo, SlotResult } from "@/types";

interface CalendarViewProps {
  results: SlotResult[];
  participants: ParticipantInfo[];
  totalParticipants: number;
  topN?: number;
}

export function CalendarView({
  results,
  participants,
  totalParticipants,
  topN = 10,
}: CalendarViewProps) {
  const topSlots = useMemo(() => getTopSlots(results, topN), [results, topN]);
  const grouped = useMemo(() => groupSlotsByDate(topSlots), [topSlots]);
  const sortedDates = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  if (topSlots.length === 0) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        No availability data yet. Participants need to fill in their schedules first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-semibold">
          Best {topSlots.length} slot{topSlots.length !== 1 ? "s" : ""}
        </p>
        <Badge variant="secondary">
          {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-4">
        {sortedDates.map((date) => {
          const daySlots = grouped.get(date);
          if (!daySlots) return null;

          return (
            <div key={date} className="space-y-2">
              <h3 className="section-label">{formatDateFull(date)}</h3>

              <div className="space-y-2">
                {daySlots
                  .sort((a, b) => a.localTime.localeCompare(b.localTime))
                  .map((slot, index) => {
                    const intensity = slotIntensity(slot, totalParticipants);
                    const isTop = index === 0 && slot === topSlots[0];
                    const availableNames = slot.availableParticipantIds
                      .map((participantId) => participants.find((p) => p.id === participantId)?.displayName)
                      .filter(Boolean) as string[];

                    return (
                      <div
                        key={slot.slotKey}
                        className={cn(
                          "rounded-xl border px-3 py-2.5 transition-colors",
                          isTop ? "border-amber-300 bg-amber-50" : "border-border/75 bg-background/65"
                        )}
                      >
                        <div className="flex items-center gap-3">
                          <div className="shrink-0 text-center">
                            {isTop ? (
                              <Trophy className="h-4 w-4 text-amber-500" />
                            ) : (
                              <span
                                className="inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white"
                                style={{ backgroundColor: intensityToColor(intensity) }}
                              >
                                {index + 1}
                              </span>
                            )}
                          </div>

                          <div className="shrink-0">
                            <p className="text-sm font-semibold">{formatTime12h(slot.localTime)}</p>
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="h-2 overflow-hidden rounded-full bg-muted">
                              <div
                                className="h-full rounded-full transition-all"
                                style={{
                                  width: `${Math.round(intensity * 100)}%`,
                                  backgroundColor: intensityToColor(intensity),
                                }}
                              />
                            </div>
                            {availableNames.length > 0 && (
                              <p className="mt-1 truncate text-xs text-muted-foreground">
                                {availableNames.slice(0, 3).join(", ")}
                                {availableNames.length > 3 && ` +${availableNames.length - 3} more`}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 text-right">
                            <p className="text-sm font-bold">{slot.availableCount}</p>
                            <p className="text-xs text-muted-foreground">/ {totalParticipants}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
