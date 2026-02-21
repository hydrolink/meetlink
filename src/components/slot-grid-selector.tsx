"use client";

import { useState, useRef, useCallback, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateHeader, formatTime12h } from "@/lib/utils";
import type { SlotInfo } from "@/types";

interface SlotGridSelectorProps {
  slots: SlotInfo[];
  timezone: string;
  initialAvailability?: Map<string, boolean>; // slotKey → available
  onSave: (updates: Array<{ slotKey: string; available: boolean }>) => Promise<void>;
  disabled?: boolean;
}

/** Builds the grid structure: sorted unique dates/times, and date→time→slotKey lookup */
function buildGrid(slots: SlotInfo[]) {
  const datesSet = new Set<string>();
  const timesSet = new Set<string>();
  const grid = new Map<string, Map<string, string>>(); // date → time → slotKey

  for (const slot of slots) {
    datesSet.add(slot.localDate);
    timesSet.add(slot.localTime);
    if (!grid.has(slot.localDate)) grid.set(slot.localDate, new Map());
    grid.get(slot.localDate)!.set(slot.localTime, slot.slotKey);
  }

  const dates = Array.from(datesSet).sort();
  const times = Array.from(timesSet).sort();
  return { dates, times, grid };
}

export function SlotGridSelector({
  slots,
  timezone,
  initialAvailability,
  onSave,
  disabled = false,
}: SlotGridSelectorProps) {
  const [localAvailability, setLocalAvailability] = useState<Map<string, boolean>>(
    () => new Map(initialAvailability ?? [])
  );
  const [saving, setSaving] = useState(false);

  const isDragging = useRef(false);
  const paintMode = useRef<boolean>(true); // true = paint available, false = clear
  const dirtySlots = useRef<Map<string, boolean>>(new Map());

  const { dates, times, grid } = useMemo(() => buildGrid(slots), [slots]);

  const selectedCount = useMemo(
    () => Array.from(localAvailability.values()).filter(Boolean).length,
    [localAvailability]
  );

  const applyPaint = useCallback(
    (slotKey: string) => {
      const newValue = paintMode.current;
      setLocalAvailability((prev) => {
        if (prev.get(slotKey) === newValue) return prev;
        const next = new Map(prev);
        next.set(slotKey, newValue);
        return next;
      });
      dirtySlots.current.set(slotKey, newValue);
    },
    []
  );

  const commitDirty = useCallback(async () => {
    if (dirtySlots.current.size === 0) return;
    const updates = Array.from(dirtySlots.current.entries()).map(([slotKey, available]) => ({
      slotKey,
      available,
    }));
    dirtySlots.current.clear();

    setSaving(true);
    try {
      await onSave(updates);
    } catch {
      // Revert optimistic update on error
      setLocalAvailability(new Map(initialAvailability ?? []));
    } finally {
      setSaving(false);
    }
  }, [onSave, initialAvailability]);

  function handlePointerDown(slotKey: string, e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    paintMode.current = !(localAvailability.get(slotKey) ?? false);
    applyPaint(slotKey);
  }

  function handlePointerEnter(slotKey: string, e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || disabled) return;
    if (!(e.buttons & 1)) {
      // Button released outside — clean up
      isDragging.current = false;
      commitDirty();
      return;
    }
    applyPaint(slotKey);
  }

  function handlePointerUp() {
    // Always commit even if isDragging is already false (edge case: pointer released outside)
    const wasDragging = isDragging.current;
    isDragging.current = false;
    if (wasDragging || dirtySlots.current.size > 0) {
      commitDirty();
    }
  }

  async function handleClearAll() {
    const updates = slots.map((s) => ({ slotKey: s.slotKey, available: false }));
    setLocalAvailability(new Map());
    dirtySlots.current.clear();
    setSaving(true);
    try {
      await onSave(updates);
    } catch {
      setLocalAvailability(new Map(initialAvailability ?? []));
    } finally {
      setSaving(false);
    }
  }

  if (dates.length === 0 || times.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">No time slots available</div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">
            Timezone: <span className="font-medium text-foreground">{timezone}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {selectedCount} slot{selectedCount !== 1 ? "s" : ""} selected
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearAll}
          disabled={disabled || saving || selectedCount === 0}
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1" />
          Clear all
        </Button>
      </div>

      {/* You are editing YOUR availability */}
      <div className="bg-primary/5 border border-primary/20 rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <p className="text-xs font-medium text-primary">
          You are editing YOUR availability — tap or drag to toggle
        </p>
        {saving && (
          <span className="ml-auto text-xs text-muted-foreground">Saving...</span>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-green-400 inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-gray-200 inline-block" />
          Unavailable
        </span>
      </div>

      {/* Grid container with horizontal scroll */}
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
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {/* Corner cell */}
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
                      className={cn(
                        "bg-muted/20 border-b",
                        di < dates.length - 1 && "border-r"
                      )}
                    />
                  );
                }

                const isAvailable = localAvailability.get(slotKey) ?? false;

                return (
                  <div
                    key={slotKey}
                    className={cn(
                      "border-b cursor-pointer transition-colors",
                      di < dates.length - 1 && "border-r",
                      isAvailable
                        ? "bg-green-400 hover:bg-green-500 active:bg-green-600"
                        : "bg-gray-100 hover:bg-gray-200 active:bg-gray-300",
                      disabled && "cursor-not-allowed opacity-60",
                      ti === times.length - 1 && "border-b-0"
                    )}
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => handlePointerDown(slotKey, e)}
                    onPointerEnter={(e) => handlePointerEnter(slotKey, e)}
                    onPointerUp={handlePointerUp}
                    role="checkbox"
                    aria-checked={isAvailable}
                    aria-label={`${date} ${time} — ${isAvailable ? "available" : "unavailable"}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        paintMode.current = !isAvailable;
                        applyPaint(slotKey);
                        commitDirty();
                      }
                    }}
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
