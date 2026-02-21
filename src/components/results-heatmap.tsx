"use client";

import { useMemo, useState } from "react";
import { cn, formatDateHeader, formatTime12h } from "@/lib/utils";
import { filterSlotResults, intensityToColor, slotIntensity } from "@/lib/results";
import type { SlotResult, ParticipantInfo } from "@/types";
import type { SlotInfo } from "@/types";

interface ResultsHeatmapProps {
  slots: SlotInfo[];
  results: SlotResult[];
  participants: ParticipantInfo[];
  totalParticipants: number;
  selectedParticipantIds?: Set<string>;
  timezone: string;
}

/** Builds a date→time→SlotResult lookup for heatmap rendering */
function buildResultGrid(results: SlotResult[]) {
  const map = new Map<string, Map<string, SlotResult>>();
  for (const r of results) {
    if (!map.has(r.localDate)) map.set(r.localDate, new Map());
    map.get(r.localDate)!.set(r.localTime, r);
  }
  return map;
}

export function ResultsHeatmap({
  slots,
  results,
  participants,
  totalParticipants,
  selectedParticipantIds,
  timezone,
}: ResultsHeatmapProps) {
  const [hoveredSlot, setHoveredSlot] = useState<SlotResult | null>(null);

  const displayResults = useMemo(() => {
    if (!selectedParticipantIds || selectedParticipantIds.size === 0) return results;
    return filterSlotResults(results, selectedParticipantIds);
  }, [results, selectedParticipantIds]);

  const effectiveTotal = selectedParticipantIds?.size
    ? selectedParticipantIds.size
    : totalParticipants;

  const resultMap = useMemo(() => buildResultGrid(displayResults), [displayResults]);

  const dates = useMemo(
    () => Array.from(new Set(slots.map((s) => s.localDate))).sort(),
    [slots]
  );
  const times = useMemo(
    () => Array.from(new Set(slots.map((s) => s.localTime))).sort(),
    [slots]
  );

  const grid = useMemo(() => {
    const g = new Map<string, Map<string, string>>();
    for (const s of slots) {
      if (!g.has(s.localDate)) g.set(s.localDate, new Map());
      g.get(s.localDate)!.set(s.localTime, s.slotKey);
    }
    return g;
  }, [slots]);

  if (dates.length === 0) {
    return <div className="text-center py-8 text-muted-foreground text-sm">No results yet</div>;
  }

  return (
    <div className="space-y-3">
      {/* Timezone indicator */}
      <p className="text-xs text-muted-foreground">
        Timezone: <span className="font-medium text-foreground">{timezone}</span>
      </p>

      {/* Hovered slot tooltip */}
      {hoveredSlot && (
        <div className="bg-popover border rounded-lg px-3 py-2 text-xs shadow-sm">
          <span className="font-semibold">
            {hoveredSlot.localDate} {hoveredSlot.localTime}
          </span>
          {" — "}
          <span className="text-primary font-semibold">{hoveredSlot.availableCount}</span>
          {" / "}
          {effectiveTotal} available
          {hoveredSlot.availableCount > 0 && participants.length > 0 && (
            <span className="text-muted-foreground ml-1">
              (
              {hoveredSlot.availableParticipantIds
                .map((pid) => participants.find((p) => p.id === pid)?.displayName)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ")}
              {hoveredSlot.availableParticipantIds.length > 3 ? "…" : ""}
              )
            </span>
          )}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>0</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <span
            key={v}
            className="w-5 h-3 rounded-sm inline-block"
            style={{ backgroundColor: intensityToColor(v) }}
          />
        ))}
        <span>
          {effectiveTotal > 0 ? effectiveTotal : "?"}{" "}
          {effectiveTotal === 1 ? "person" : "people"}
        </span>
      </div>

      {/* Heatmap grid */}
      <div
        className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border"
        style={{ touchAction: "pan-y" }}
      >
        <div
          className="select-none"
          style={{
            display: "grid",
            gridTemplateColumns: `56px repeat(${dates.length}, minmax(44px, 60px))`,
            gridTemplateRows: `auto repeat(${times.length}, 36px)`,
            minWidth: `${56 + dates.length * 44}px`,
          }}
        >
          {/* Corner */}
          <div className="sticky left-0 z-20 bg-background border-b border-r" />

          {/* Date headers */}
          {dates.map((date, i) => (
            <div
              key={date}
              className={cn(
                "text-center text-xs font-medium py-2 px-1 bg-background border-b sticky top-0 z-10",
                i < dates.length - 1 && "border-r"
              )}
            >
              {formatDateHeader(date)}
            </div>
          ))}

          {/* Time rows */}
          {times.map((time, ti) => (
            <>
              {/* Time label */}
              <div
                key={`label-${time}`}
                className="sticky left-0 z-10 bg-background border-r border-b flex items-center justify-end pr-2 text-xs text-muted-foreground"
              >
                {formatTime12h(time)}
              </div>

              {/* Cells */}
              {dates.map((date, di) => {
                const slotKey = grid.get(date)?.get(time);
                if (!slotKey) {
                  return (
                    <div
                      key={`empty-${date}-${time}`}
                      className={cn("bg-muted/20 border-b", di < dates.length - 1 && "border-r")}
                    />
                  );
                }

                const result = resultMap.get(date)?.get(time);
                const intensity = result ? slotIntensity(result, effectiveTotal) : 0;

                return (
                  <div
                    key={slotKey}
                    className={cn(
                      "border-b cursor-pointer transition-colors relative",
                      di < dates.length - 1 && "border-r",
                      ti === times.length - 1 && "border-b-0"
                    )}
                    style={{ backgroundColor: intensityToColor(intensity) }}
                    onPointerEnter={() => setHoveredSlot(result ?? null)}
                    onPointerLeave={() => setHoveredSlot(null)}
                    onFocus={() => setHoveredSlot(result ?? null)}
                    onBlur={() => setHoveredSlot(null)}
                    tabIndex={0}
                    role="cell"
                    aria-label={`${date} ${time}: ${result?.availableCount ?? 0} of ${effectiveTotal} available`}
                  />
                );
              })}
            </>
          ))}
        </div>
      </div>
    </div>
  );
}
