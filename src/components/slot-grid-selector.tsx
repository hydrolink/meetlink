"use client";

import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateHeader, formatTime12h } from "@/lib/utils";
import type { SlotInfo } from "@/types";

interface SlotGridSelectorProps {
  slots: SlotInfo[];
  timezone: string;
  initialAvailability?: Map<string, boolean>;
  onSave: (updates: Array<{ slotKey: string; available: boolean }>) => Promise<void>;
  disabled?: boolean;
}

function buildGrid(slots: SlotInfo[]) {
  const datesSet = new Set<string>();
  const timesSet = new Set<string>();
  const grid = new Map<string, Map<string, string>>();

  for (const slot of slots) {
    datesSet.add(slot.localDate);
    timesSet.add(slot.localTime);
    if (!grid.has(slot.localDate)) grid.set(slot.localDate, new Map());
    grid.get(slot.localDate)?.set(slot.localTime, slot.slotKey);
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
  const [isCoarsePointer, setIsCoarsePointer] = useState(false);
  const [dragLabel, setDragLabel] = useState<"marking" | "clearing" | null>(null);

  const isDragging = useRef(false);
  const activePointerId = useRef<number | null>(null);
  const lastPaintedSlotKey = useRef<string | null>(null);
  const paintMode = useRef<boolean>(true);
  const dirtySlots = useRef<Map<string, boolean>>(new Map());
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const { dates, times, grid } = useMemo(() => buildGrid(slots), [slots]);

  const selectedCount = useMemo(
    () => Array.from(localAvailability.values()).filter(Boolean).length,
    [localAvailability]
  );

  const cellMinWidth = isCoarsePointer ? 54 : 46;
  const cellMaxWidth = isCoarsePointer ? 70 : 62;
  const rowHeight = isCoarsePointer ? 40 : 36;
  const timeColumnWidth = isCoarsePointer ? 66 : 58;

  useEffect(() => {
    const media = window.matchMedia("(pointer: coarse)");
    const update = () => setIsCoarsePointer(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

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

  const autoScrollWhileDragging = useCallback((clientX: number, clientY: number) => {
    const container = scrollContainerRef.current;
    if (!container || !isDragging.current) return;

    const rect = container.getBoundingClientRect();
    const edgeThreshold = 28;
    const scrollStep = 14;
    let dx = 0;
    let dy = 0;

    if (clientX < rect.left + edgeThreshold) dx = -scrollStep;
    else if (clientX > rect.right - edgeThreshold) dx = scrollStep;

    if (clientY < rect.top + edgeThreshold) dy = -scrollStep;
    else if (clientY > rect.bottom - edgeThreshold) dy = scrollStep;

    if (dx !== 0 || dy !== 0) container.scrollBy({ left: dx, top: dy });
  }, []);

  const commitDirty = useCallback(async () => {
    if (dirtySlots.current.size === 0) return;

    const updates = Array.from(dirtySlots.current.entries()).map(([slotKey, available]) => ({
      slotKey,
      available,
    }));

    setSaving(true);
    try {
      await onSave(updates);
      dirtySlots.current.clear();
    } catch {
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
    setDragLabel(null);

    if (wasDragging || dirtySlots.current.size > 0) void commitDirty();
  }

  function handlePointerDown(slotKey: string, e: React.PointerEvent<HTMLDivElement>) {
    if (disabled) return;

    e.preventDefault();

    isDragging.current = true;
    activePointerId.current = e.pointerId;
    paintMode.current = !(localAvailability.get(slotKey) ?? false);
    lastPaintedSlotKey.current = null;

    if (e.pointerType === "touch") setIsTouchDragging(true);
    setDragLabel(paintMode.current ? "marking" : "clearing");

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture can fail in edge cases.
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

    if (e.pointerType === "touch") e.preventDefault();

    applyPaintIfNeeded(getSlotKeyAtPoint(e.clientX, e.clientY));
    autoScrollWhileDragging(e.clientX, e.clientY);
  }

  async function handleClearAll() {
    const updates = slots.map((slot) => ({ slotKey: slot.slotKey, available: false }));

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
    return <div className="py-8 text-center text-sm text-muted-foreground">No time slots available</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5 text-xs text-muted-foreground">
          <p>
            Timezone: <span className="font-semibold text-foreground">{timezone}</span>
          </p>
          <p>
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
          <Trash2 className="h-3.5 w-3.5" />
          Clear all
        </Button>
      </div>

      <div className="rounded-xl border border-primary/25 bg-primary/8 px-3 py-2">
        <p className="text-xs font-semibold text-primary">
          Mark your availability by tapping once or dragging across slots.
          {saving ? <span className="ml-2 text-muted-foreground">Saving...</span> : null}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(34_73%_68%)]" />
          Available
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm bg-[hsl(36_36%_88%)]" />
          Unavailable
        </span>
        {isTouchDragging && (
          <span className="ml-auto font-medium text-primary/85">
            {dragLabel === "clearing" ? "Dragging to clear" : "Dragging to mark"} - release to save
          </span>
        )}
      </div>

      <div
        ref={scrollContainerRef}
        className="max-h-[60vh] overflow-x-auto overflow-y-auto rounded-xl border border-border/75 bg-background/72"
        style={{ touchAction: isTouchDragging ? "none" : "pan-x pan-y" }}
      >
        <div
          className="select-none"
          style={{
            display: "grid",
            gridTemplateColumns: `${timeColumnWidth}px repeat(${dates.length}, minmax(${cellMinWidth}px, ${cellMaxWidth}px))`,
            gridTemplateRows: `auto repeat(${times.length}, ${rowHeight}px)`,
            minWidth: `${timeColumnWidth + dates.length * cellMinWidth}px`,
          }}
          onPointerMove={handlePointerMove}
          onPointerUp={(e) => finishDrag(e.pointerId)}
          onPointerCancel={(e) => finishDrag(e.pointerId)}
          onPointerLeave={(e) => {
            if (e.pointerType === "mouse") finishDrag(e.pointerId);
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

                const isAvailable = localAvailability.get(slotKey) ?? false;

                return (
                  <div
                    key={slotKey}
                    data-slot-key={slotKey}
                    className={cn(
                      "cursor-pointer border-b transition-colors",
                      columnIndex < dates.length - 1 && "border-r",
                      isAvailable
                        ? "bg-[hsl(34_73%_68%)] hover:bg-[hsl(34_67%_60%)] active:bg-[hsl(33_66%_52%)]"
                        : "bg-[hsl(36_36%_88%)] hover:bg-[hsl(35_33%_82%)] active:bg-[hsl(35_30%_76%)]",
                      disabled && "cursor-not-allowed opacity-60",
                      rowIndex === times.length - 1 && "border-b-0"
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
