"use client";

import { Fragment, useMemo, useState } from "react";
import { cn, formatDateHeader, formatTime12h } from "@/lib/utils";
import { filterSlotResults, intensityToColor, slotIntensity } from "@/lib/results";
import type { ParticipantInfo, SlotInfo, SlotResult } from "@/types";

interface ResultsHeatmapProps {
  slots: SlotInfo[];
  results: SlotResult[];
  participants: ParticipantInfo[];
  totalParticipants: number;
  selectedParticipantIds?: Set<string>;
  timezone: string;
}

function buildResultGrid(results: SlotResult[]) {
  const map = new Map<string, Map<string, SlotResult>>();
  for (const result of results) {
    if (!map.has(result.localDate)) map.set(result.localDate, new Map());
    map.get(result.localDate)?.set(result.localTime, result);
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

  const effectiveTotal = selectedParticipantIds?.size ? selectedParticipantIds.size : totalParticipants;

  const resultMap = useMemo(() => buildResultGrid(displayResults), [displayResults]);

  const dates = useMemo(() => Array.from(new Set(slots.map((slot) => slot.localDate))).sort(), [slots]);
  const times = useMemo(() => Array.from(new Set(slots.map((slot) => slot.localTime))).sort(), [slots]);

  const grid = useMemo(() => {
    const map = new Map<string, Map<string, string>>();
    for (const slot of slots) {
      if (!map.has(slot.localDate)) map.set(slot.localDate, new Map());
      map.get(slot.localDate)?.set(slot.localTime, slot.slotKey);
    }
    return map;
  }, [slots]);

  if (dates.length === 0) {
    return <div className="py-8 text-center text-sm text-muted-foreground">No results yet</div>;
  }

  return (
    <div className="space-y-3.5">
      <p className="text-xs text-muted-foreground">
        Timezone: <span className="font-semibold text-foreground">{timezone}</span>
      </p>

      {hoveredSlot && (
        <div className="rounded-xl border border-border/80 bg-popover px-3 py-2 text-xs shadow-sm">
          <span className="font-semibold">
            {hoveredSlot.localDate} {formatTime12h(hoveredSlot.localTime)}
          </span>
          {" - "}
          <span className="font-semibold text-primary">{hoveredSlot.availableCount}</span>
          {" / "}
          {effectiveTotal} available
          {hoveredSlot.availableCount > 0 && participants.length > 0 && (
            <span className="ml-1 text-muted-foreground">
              (
              {hoveredSlot.availableParticipantIds
                .map((participantId) => participants.find((p) => p.id === participantId)?.displayName)
                .filter(Boolean)
                .slice(0, 3)
                .join(", ")}
              {hoveredSlot.availableParticipantIds.length > 3 ? "..." : ""})
            </span>
          )}
        </div>
      )}

      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <span>0</span>
        {[0, 0.25, 0.5, 0.75, 1].map((value) => (
          <span
            key={value}
            className="inline-block h-3 w-5 rounded-sm"
            style={{ backgroundColor: intensityToColor(value) }}
          />
        ))}
        <span>
          {effectiveTotal > 0 ? effectiveTotal : "?"} {effectiveTotal === 1 ? "person" : "people"}
        </span>
      </div>

      <div className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-xl border border-border/75" style={{ touchAction: "pan-y" }}>
        <div
          className="select-none"
          style={{
            display: "grid",
            gridTemplateColumns: `58px repeat(${dates.length}, minmax(46px, 62px))`,
            gridTemplateRows: `auto repeat(${times.length}, 36px)`,
            minWidth: `${58 + dates.length * 46}px`,
          }}
        >
          <div className="sticky left-0 z-20 border-b border-r bg-background" />

          {dates.map((date, index) => (
            <div
              key={date}
              className={cn(
                "sticky top-0 z-10 border-b bg-background px-1 py-2 text-center text-xs font-semibold",
                index < dates.length - 1 && "border-r"
              )}
            >
              {formatDateHeader(date)}
            </div>
          ))}

          {times.map((time, rowIndex) => (
            <Fragment key={time}>
              <div className="sticky left-0 z-10 flex items-center justify-end border-b border-r bg-background pr-2 text-xs text-muted-foreground">
                {formatTime12h(time)}
              </div>

              {dates.map((date, columnIndex) => {
                const slotKey = grid.get(date)?.get(time);
                if (!slotKey) {
                  return (
                    <div
                      key={`empty-${date}-${time}`}
                      className={cn("border-b bg-muted/20", columnIndex < dates.length - 1 && "border-r")}
                    />
                  );
                }

                const result = resultMap.get(date)?.get(time);
                const intensity = result ? slotIntensity(result, effectiveTotal) : 0;

                return (
                  <div
                    key={slotKey}
                    className={cn(
                      "relative cursor-pointer border-b transition-opacity hover:opacity-95",
                      columnIndex < dates.length - 1 && "border-r",
                      rowIndex === times.length - 1 && "border-b-0"
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
            </Fragment>
          ))}
        </div>
      </div>
    </div>
  );
}
