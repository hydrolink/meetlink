"use client";

import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateHeader, formatTime12h } from "@/lib/utils";
import type { SlotInfo } from "@/types";

interface SlotGridSelectorProps {
  slots: SlotInfo[];
  timezone: string;
  initialAvailability?: Map<string, boolean>; // slotKey -> available
  onSave: (updates: Array<{ slotKey: string; available: boolean }>) => Promise<void>;
  disabled?: boolean;
}

/** Builds the grid structure: sorted unique dates/times, and date -> time -> slotKey lookup */
function buildGrid(slots: SlotInfo[]) {
  const datesSet = new Set<string>();
  const timesSet = new Set<string>();
  const grid = new Map<string, Map<string, string>>(); // date -> time -> slotKey

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
  const [isTouchDragging, setIsTouchDragging] = useState(false);

  const isDragging = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const lastPaintedSlotKey = useRef<string | null>(null);
  const paintMode = useRef<boolean>(true); // true = paint available, false = clear
  const dirtySlots = useRef<Map<string, boolean>>(new Map());

  const { dates, times, grid } = useMemo(() => buildGrid(slots), [slots]);

  const selectedCount = useMemo(
    () => Array.from(localAvailability.values()).filter(Boolean).length,
    [localAvailability]
  );

  const applyPaint = useCallback((slotKey: string) => {
    const newValue = paintMode.current;

    setLocalAvailability((prev) => {
      if (prev.get(slotKey) === newValue) return prev;
      const next = new Map(prev);
      next.set(slotKey, newValue);
      return next;
    });

    dirtySlots.current.set(slotKey, newValue);
  }, []);

  const applyPaintIfNeeded = useCallback(
    (slotKey: string | null) => {
      if (!slotKey || lastPaintedSlotKey.current === slotKey) return;
      lastPaintedSlotKey.current = slotKey;
      applyPaint(slotKey);
    },
    [applyPaint]
  );

  const getSlotKeyAtPoint = useCallback((clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!(element instanceof HTMLElement)) return null;
    return element.closest<HTMLElement>("[data-slot-key]")?.dataset.slotKey ?? null;
  }, []);

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

  function finishDrag(pointerId?: number) {
    if (
      pointerId !== undefined &&
      activePointerId.current !== null &&
      pointerId !== activePointerId.current
    ) {
      return;
    }

    const wasDragging = isDragging.current;
    isDragging.current = false;
    activePointerId.current = null;
    lastPaintedSlotKey.current = null;
    setIsTouchDragging(false);

    if (wasDragging || dirtySlots.current.size > 0) {
      void commitDirty();
    }
  }

  function handlePointerDown(slotKey: string, e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    e.preventDefault();

    isDragging.current = true;
    activePointerId.current = e.pointerId;
    paintMode.current = !(localAvailability.get(slotKey) ?? false);
    lastPaintedSlotKey.current = null;

    if (e.pointerType === "touch") {
      setIsTouchDragging(true);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Some browsers can fail to capture in edge cases; drag still works via bubbling.
    }

    applyPaintIfNeeded(slotKey);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging.current || disabled) return;
    if (activePointerId.current !== null && e.pointerId !== activePointerId.current) return;

    if (e.pointerType === "mouse" && !(e.buttons & 1)) {
      finishDrag(e.pointerId);
      return;
    }

    if (e.pointerType === "touch") {
      e.preventDefault();
    }

    applyPaintIfNeeded(getSlotKeyAtPoint(e.clientX, e.clientY));
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

      {/* You are editing your availability */}
      <div className="bg-primary/10 border border-primary/25 rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-primary shrink-0" />
        <p className="text-xs font-medium text-primary">
          You are editing your availability - tap once or drag across slots
        </p>
        {saving && <span className="ml-auto text-xs text-muted-foreground">Saving...</span>}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[hsl(35_78%_72%)] inline-block" />
          Available
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-sm bg-[hsl(38_44%_88%)] inline-block" />
          Unavailable
        </span>
        {isTouchDragging && <span className="ml-auto font-medium text-primary/85">Release to save</span>}
      </div>

      {/* Grid container with horizontal/vertical scroll */}
      <div
        className="overflow-x-auto overflow-y-auto max-h-[60vh] rounded-lg border bg-background/70"
        style={{ touchAction: isTouchDragging ? "none" : "pan-x pan-y" }}
      >
        <div
          className="select-none"
          style={{
            display: "grid",
            gridTemplateColumns: `56px repeat(${dates.length}, minmax(44px, 60px))`,
            gridTemplateRows: `auto repeat(${times.length}, 36px)`,
            minWidth: `${56 + dates.length * 44}px`,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => finishDrag(e.pointerId)}
          onPointerCancel={(e) => finishDrag(e.pointerId)}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") finishDrag(e.pointerId);
          }}
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
            <Fragment key={time}>
              {/* Time label */}
              <div className="sticky left-0 z-10 bg-background border-r border-b flex items-center justify-end pr-2 text-xs text-muted-foreground">
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

                const isAvailable = localAvailability.get(slotKey) ?? false;

                return (
                  <div
                    key={slotKey}
                    data-slot-key={slotKey}
                    className={cn(
                      "border-b cursor-pointer transition-colors",
                      di < dates.length - 1 && "border-r",
                      isAvailable
                        ? "bg-[hsl(35_78%_72%)] hover:bg-[hsl(34_74%_64%)] active:bg-[hsl(32_71%_56%)]"
                        : "bg-[hsl(38_44%_88%)] hover:bg-[hsl(35_42%_82%)] active:bg-[hsl(34_40%_76%)]",
                      disabled && "cursor-not-allowed opacity-60",
                      ti === times.length - 1 && "border-b-0"
                    )}
                    style={{ touchAction: "none" }}
                    onPointerDown={(e) => handlePointerDown(slotKey, e)}
                    onPointerMove={handlePointerMove}
                    onPointerUp={(e) => finishDrag(e.pointerId)}
                    onPointerCancel={(e) => finishDrag(e.pointerId)}
                    onLostPointerCapture={(e) => finishDrag(e.pointerId)}
                    role="checkbox"
                    aria-checked={isAvailable}
                    aria-label={`${date} ${time} - ${isAvailable ? "available" : "unavailable"}`}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === " " || e.key === "Enter") {
                        e.preventDefault();
                        paintMode.current = !isAvailable;
                        applyPaint(slotKey);
                        void commitDirty();
                      }
                    }}
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
