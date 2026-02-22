"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  Eye,
  Loader2,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { TimezoneSelector } from "@/components/timezone-selector";
import { countSlots } from "@/lib/slots";
import { saveSession, getBrowserTimezone } from "@/lib/utils";
import { DAYS_OF_WEEK, SLOT_GRANULARITY_OPTIONS } from "@/lib/constants";
import { useTMAUser } from "@/components/tma-provider";
import type { CreatePlanRequest } from "@/types";

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

function getDatePlusWeeks(weeks: number): string {
  const d = new Date();
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

export function CreatePlanForm() {
  const router = useRouter();
  const tmaUser = useTMAUser();
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState(getBrowserTimezone());
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getDatePlusWeeks(1));
  const [dayStartTime, setDayStartTime] = useState("09:00");
  const [dayEndTime, setDayEndTime] = useState("17:00");
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(30);
  const [workingDays, setWorkingDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>(undefined);
  const [limitParticipants, setLimitParticipants] = useState(false);
  const [hideParticipants, setHideParticipants] = useState(false);

  const slotCount = useMemo(() => {
    if (!startDate || !endDate || startDate > endDate) return 0;
    if (!dayStartTime || !dayEndTime || dayStartTime >= dayEndTime) return 0;
    if (workingDays.length === 0) return 0;
    try {
      return countSlots({
        startDate,
        endDate,
        timezone,
        dayStartTime,
        dayEndTime,
        slotMinutes,
        workingDays,
      });
    } catch {
      return 0;
    }
  }, [startDate, endDate, timezone, dayStartTime, dayEndTime, slotMinutes, workingDays]);

  function toggleDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!title.trim()) {
      toast.error("Please enter a plan title");
      return;
    }
    if (endDate < startDate) {
      toast.error("End date must be on or after start date");
      return;
    }
    if (workingDays.length === 0) {
      toast.error("Please select at least one working day");
      return;
    }
    if (slotCount === 0) {
      toast.error("No time slots generated - check your date range and time window");
      return;
    }

    setLoading(true);

    try {
      const body: CreatePlanRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        timezone,
        startDate,
        endDate,
        dayStartTime,
        dayEndTime,
        slotMinutes,
        workingDays,
        maxParticipants: limitParticipants ? maxParticipants : undefined,
        hideParticipants,
        createdByTelegramId: tmaUser?.id?.toString(),
      };

      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Failed to create plan");
      }

      const { id, hostToken } = await res.json();

      saveSession(id, {
        planId: id,
        participantId: "",
        token: "",
        displayName: tmaUser?.firstName ?? "Host",
        isHost: true,
        hostToken,
      });

      toast.success("Plan created!");
      router.push(`/plan/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="surface-card">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <p className="section-label">Basics</p>
            <h2 className="text-lg font-semibold">Plan details</h2>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="title">Plan title *</Label>
            <Input
              id="title"
              placeholder="e.g. Weekly product sync"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="description">Description (optional)</Label>
            <Input
              id="description"
              placeholder="Any context or notes for participants"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={300}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Date range</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="startDate">From</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={getTodayStr()}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">To</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Days of the week</Label>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK.map((d) => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => toggleDay(d.value)}
                  className={`min-h-10 min-w-11 cursor-pointer rounded-full px-3.5 text-sm font-semibold transition-colors ${
                    workingDays.includes(d.value)
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/75"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardContent className="space-y-4 pt-6">
          <div className="flex items-center gap-2">
            <Clock3 className="h-4 w-4 text-primary" />
            <h2 className="text-base font-semibold">Time window</h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="dayStartTime">From</Label>
              <Input
                id="dayStartTime"
                type="time"
                value={dayStartTime}
                onChange={(e) => setDayStartTime(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="dayEndTime">To</Label>
              <Input
                id="dayEndTime"
                type="time"
                value={dayEndTime}
                onChange={(e) => setDayEndTime(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Timezone</Label>
            <TimezoneSelector value={timezone} onChange={setTimezone} className="w-full" />
          </div>

          <div className="space-y-2">
            <Label>Slot granularity</Label>
            <div className="grid grid-cols-3 gap-2">
              {SLOT_GRANULARITY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setSlotMinutes(opt.value as 15 | 30 | 60)}
                  className={`h-10 cursor-pointer rounded-xl border text-sm font-semibold transition-colors ${
                    slotMinutes === opt.value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border/80 bg-background/85 text-foreground hover:bg-muted"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="subtle-panel px-3.5 py-3 text-sm text-muted-foreground">
            This plan will generate <span className="font-semibold text-foreground">{slotCount.toLocaleString()}</span>{" "}
            time slot{slotCount === 1 ? "" : "s"}.
          </div>
        </CardContent>
      </Card>

      <Card className="surface-card">
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1">
            <h2 className="text-base font-semibold">Participation options</h2>
            <p className="text-sm text-muted-foreground">
              Configure participant limits and visibility before publishing.
            </p>
          </div>

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Limit participants</p>
                <p className="text-xs text-muted-foreground">Cap total respondents</p>
              </div>
            </div>
            <Switch checked={limitParticipants} onCheckedChange={setLimitParticipants} />
          </div>

          {limitParticipants && (
            <div className="space-y-1.5 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
              <Label htmlFor="maxParticipants">Maximum participants</Label>
              <Input
                id="maxParticipants"
                type="number"
                min={2}
                max={500}
                placeholder="e.g. 20"
                value={maxParticipants ?? ""}
                onChange={(e) =>
                  setMaxParticipants(e.target.value ? Number(e.target.value) : undefined)
                }
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <div>
                <p className="text-sm font-semibold">Privacy mode</p>
                <p className="text-xs text-muted-foreground">Hide participant names from others</p>
              </div>
            </div>
            <Switch checked={hideParticipants} onCheckedChange={setHideParticipants} />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" className="h-12 w-full text-base" disabled={loading || slotCount === 0}>
        {loading ? (
          <Loader2 className="h-5 w-5 animate-spin" />
        ) : (
          <>
            Publish Plan
            <ChevronRight className="h-5 w-5" />
          </>
        )}
      </Button>
    </form>
  );
}
