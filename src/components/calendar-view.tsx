"use client";

import { useMemo } from "react";
import { Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn, formatDateFull, formatTime12h } from "@/lib/utils";
import { getTopSlots, groupSlotsByDate, intensityToColor, slotIntensity } from "@/lib/results";
import type { SlotResult, ParticipantInfo } from "@/types";

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
  const topSlotKeys = useMemo(() => new Set(topSlots.map((s) => s.slotKey)), [topSlots]);

  const grouped = useMemo(() => groupSlotsByDate(topSlots), [topSlots]);
  const sortedDates = useMemo(() => Array.from(grouped.keys()).sort(), [grouped]);

  if (topSlots.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground text-sm">
        No availability data yet. Participants need to fill in their schedules first.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Trophy className="h-4 w-4 text-amber-500" />
        <p className="text-sm font-medium">
          Best {topSlots.length} slot{topSlots.length !== 1 ? "s" : ""}
        </p>
        <Badge variant="secondary" className="text-xs">
          {totalParticipants} participant{totalParticipants !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-4">
        {sortedDates.map((date) => {
          const daySlots = grouped.get(date)!;
          return (
            <div key={date}>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                {formatDateFull(date)}
              </h3>
              <div className="space-y-1.5">
                {daySlots
                  .sort((a, b) => a.localTime.localeCompare(b.localTime))
                  .map((slot, idx) => {
                    const intensity = slotIntensity(slot, totalParticipants);
                    const isTop = idx === 0 && slot === topSlots[0];
                    const availableNames = slot.availableParticipantIds
                      .map((pid) => participants.find((p) => p.id === pid)?.displayName)
                      .filter(Boolean) as string[];

                    return (
                      <div
                        key={slot.slotKey}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-colors",
                          isTop && "border-amber-300 bg-amber-50"
                        )}
                      >
                        {/* Rank badge */}
                        <div className="shrink-0 text-center">
                          {isTop ? (
                            <Trophy className="h-4 w-4 text-amber-500" />
                          ) : (
                            <span
                              className="w-5 h-5 rounded-full inline-flex items-center justify-center text-xs font-bold text-white"
                              style={{ backgroundColor: intensityToColor(intensity) }}
                            >
                              {results.filter((r) => r.availableCount > slot.availableCount).length + 1}
                            </span>
                          )}
                        </div>

                        {/* Time */}
                        <div className="shrink-0">
                          <p className="font-semibold text-sm">{formatTime12h(slot.localTime)}</p>
                        </div>

                        {/* Bar */}
                        <div className="flex-1 min-w-0">
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all"
                              style={{
                                width: `${Math.round(intensity * 100)}%`,
                                backgroundColor: intensityToColor(intensity),
                              }}
                            />
                          </div>
                          {availableNames.length > 0 && participants[0]?.displayName && (
                            <p className="text-xs text-muted-foreground mt-0.5 truncate">
                              {availableNames.slice(0, 3).join(", ")}
                              {availableNames.length > 3 && ` +${availableNames.length - 3} more`}
                            </p>
                          )}
                        </div>

                        {/* Count */}
                        <div className="shrink-0 text-right">
                          <p className="font-bold text-sm">{slot.availableCount}</p>
                          <p className="text-xs text-muted-foreground">
                            / {totalParticipants}
                          </p>
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
