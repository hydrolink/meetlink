"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertTriangle, ArrowLeft, Loader2 } from "lucide-react";
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
    <div className="space-y-6 py-1">
      <header className="surface-card px-5 py-5 sm:px-6">
        <div className="flex items-start gap-3">
          <Link
            href={`/plan/${id}`}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Back to plan"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="space-y-1.5">
            <p className="section-label">Manage</p>
            <h1 className="text-2xl font-bold">Edit Plan</h1>
            <p className="text-sm text-muted-foreground">Changes apply to all participants immediately.</p>
          </div>
        </div>
      </header>

      <form onSubmit={handleSave} className="space-y-5">
        <Card className="surface-card">
          <CardContent className="space-y-4 pt-6">
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
                placeholder="Optional description"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardContent className="space-y-4 pt-6">
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
              <p className="text-xs text-muted-foreground">Start date is fixed at {plan?.startDate}.</p>
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

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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

              {slotGranularityChanged && (
                <div className="rounded-xl border border-amber-300 bg-amber-50/90 px-3 py-2 text-xs text-amber-800">
                  <p className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    Changing granularity regenerates slot keys. Existing responses may not map perfectly.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="surface-card">
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold">Limit participants</p>
                <p className="text-xs text-muted-foreground">Cap total respondents for this poll</p>
              </div>
              <Switch checked={limitParticipants} onCheckedChange={setLimitParticipants} />
            </div>

            {limitParticipants && (
              <div className="space-y-1.5 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
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

            <div className="flex items-center justify-between gap-4 rounded-xl border border-border/70 bg-background/70 px-3.5 py-3">
              <div>
                <p className="text-sm font-semibold">Privacy mode</p>
                <p className="text-xs text-muted-foreground">Hide participant names</p>
              </div>
              <Switch checked={hideParticipants} onCheckedChange={setHideParticipants} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="h-12 w-full" disabled={saving}>
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
        </Button>
      </form>
    </div>
  );
}
