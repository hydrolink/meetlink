"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { loadSession } from "@/lib/utils";
import { DAYS_OF_WEEK, SLOT_GRANULARITY_OPTIONS } from "@/lib/constants";
import type { PlanDetail } from "@/types";

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hostToken, setHostToken] = useState<string | null>(null);

  // Form state (initialized from plan)
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [endDate, setEndDate] = useState("");
  const [dayStartTime, setDayStartTime] = useState("");
  const [dayEndTime, setDayEndTime] = useState("");
  const [slotMinutes, setSlotMinutes] = useState<15 | 30 | 60>(30);
  const [workingDays, setWorkingDays] = useState<number[]>([]);
  const [maxParticipants, setMaxParticipants] = useState<number | undefined>();
  const [limitParticipants, setLimitParticipants] = useState(false);
  const [hideParticipants, setHideParticipants] = useState(false);

  useEffect(() => {
    const session = loadSession(id);
    if (!session?.hostToken) {
      toast.error("Only the host can edit this plan");
      router.push(`/plan/${id}`);
      return;
    }
    setHostToken(session.hostToken);

    async function fetchPlan() {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) throw new Error("Plan not found");
        const data: PlanDetail = await res.json();
        setPlan(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        setEndDate(data.endDate);
        setDayStartTime(data.dayStartTime);
        setDayEndTime(data.dayEndTime);
        setSlotMinutes(data.slotMinutes as 15 | 30 | 60);
        setWorkingDays(data.workingDays);
        setMaxParticipants(data.maxParticipants ?? undefined);
        setLimitParticipants(!!data.maxParticipants);
        setHideParticipants(data.hideParticipants);
      } catch {
        toast.error("Could not load plan");
        router.push(`/plan/${id}`);
      } finally {
        setLoading(false);
      }
    }
    fetchPlan();
  }, [id, router]);

  function toggleDay(day: number) {
    setWorkingDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  const slotGranularityChanged = plan && slotMinutes !== plan.slotMinutes;

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!hostToken) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/plans/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${hostToken}`,
        },
        body: JSON.stringify({
          title,
          description: description || null,
          endDate,
          dayStartTime,
          dayEndTime,
          slotMinutes,
          workingDays,
          maxParticipants: limitParticipants ? maxParticipants : null,
          hideParticipants,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Save failed");
      }

      const data = await res.json();
      if (data.warning) toast.warning(data.warning);
      else toast.success("Plan updated!");

      router.push(`/plan/${id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href={`/plan/${id}`}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Back to plan"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-xl font-bold">Edit Plan</h1>
          <p className="text-xs text-muted-foreground">Changes apply to all participants</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description..."
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="endDate">Extend end date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={plan?.startDate}
                required
              />
              <p className="text-xs text-muted-foreground">Start date: {plan?.startDate} (cannot change)</p>
            </div>

            <div className="space-y-2">
              <Label>Days of the week</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS_OF_WEEK.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => toggleDay(d.value)}
                    className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                      workingDays.includes(d.value)
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="dayStartTime">Day start</Label>
                <Input
                  id="dayStartTime"
                  type="time"
                  value={dayStartTime}
                  onChange={(e) => setDayStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="dayEndTime">Day end</Label>
                <Input
                  id="dayEndTime"
                  type="time"
                  value={dayEndTime}
                  onChange={(e) => setDayEndTime(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slot granularity</Label>
              <div className="flex gap-2">
                {SLOT_GRANULARITY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setSlotMinutes(opt.value as 15 | 30 | 60)}
                    className={`flex-1 py-2 rounded-md text-sm font-medium border transition-colors ${
                      slotMinutes === opt.value
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-background border-border hover:bg-muted"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {slotGranularityChanged && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Changing slot granularity will regenerate all time slots. Existing responses may not align with new slots.</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Limit participants</p>
                <p className="text-xs text-muted-foreground">Cap the number of respondents</p>
              </div>
              <Switch checked={limitParticipants} onCheckedChange={setLimitParticipants} />
            </div>

            {limitParticipants && (
              <div className="pl-4 space-y-1.5">
                <Label htmlFor="maxParticipants">Maximum</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={1}
                  value={maxParticipants ?? ""}
                  onChange={(e) =>
                    setMaxParticipants(e.target.value ? Number(e.target.value) : undefined)
                  }
                />
              </div>
            )}

            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Privacy mode</p>
                <p className="text-xs text-muted-foreground">Hide participant names</p>
              </div>
              <Switch checked={hideParticipants} onCheckedChange={setHideParticipants} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full h-11" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
