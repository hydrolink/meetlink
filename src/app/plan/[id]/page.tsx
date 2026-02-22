"use client";

import { use, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  BarChart2,
  CalendarDays,
  Grid,
  Info,
  Loader2,
  Settings,
  Users,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CalendarView } from "@/components/calendar-view";
import { ParticipantList } from "@/components/participant-list";
import { ResultsHeatmap } from "@/components/results-heatmap";
import { ShareButton } from "@/components/share-button";
import { SlotGridSelector } from "@/components/slot-grid-selector";
import { useTMAUser } from "@/components/tma-provider";
import { loadSession, saveSession, formatDateFull } from "@/lib/utils";
import type {
  GetAvailabilityResponse,
  LocalParticipantSession,
  PlanDetail,
  ResultsResponse,
} from "@/types";

type ViewTab = "grid" | "heatmap" | "calendar";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const tmaUser = useTMAUser();

  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  const [session, setSession] = useState<LocalParticipantSession | null | undefined>(undefined);
  const [myAvailability, setMyAvailability] = useState<Map<string, boolean>>(new Map());

  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  const [activeTab, setActiveTab] = useState<ViewTab>("grid");
  const [showResults, setShowResults] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());

  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function fetchPlan() {
      try {
        const res = await fetch(`/api/plans/${id}`);
        if (!res.ok) {
          if (res.status === 404) {
            toast.error("Plan not found");
            router.push("/");
            return;
          }
          throw new Error("Failed to load plan");
        }
        setPlan(await res.json());
      } catch {
        toast.error("Could not load plan");
      } finally {
        setPlanLoading(false);
      }
    }

    fetchPlan();
  }, [id, router]);

  useEffect(() => {
    setSession(loadSession(id));
    if (tmaUser?.firstName) setJoinName(tmaUser.firstName);
  }, [id, tmaUser]);

  useEffect(() => {
    const token = session?.token;
    if (!token) return;

    async function fetchMyAvailability() {
      try {
        const res = await fetch(`/api/plans/${id}/availability`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const data: GetAvailabilityResponse = await res.json();
        const avMap = new Map<string, boolean>();
        for (const s of data.slots) avMap.set(s.slotKey, s.available);
        setMyAvailability(avMap);
      } catch {
        // Non-critical - user can still paint availability.
      }
    }

    fetchMyAvailability();
  }, [id, session]);

  const fetchResults = useCallback(async () => {
    setResultsLoading(true);
    try {
      const res = await fetch(`/api/plans/${id}/results`);
      if (!res.ok) throw new Error("Failed to load results");
      setResults(await res.json());
    } catch {
      toast.error("Could not load results");
    } finally {
      setResultsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (showResults) fetchResults();
  }, [showResults, fetchResults]);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!joinName.trim()) {
      toast.error("Please enter your name");
      return;
    }

    setJoining(true);
    try {
      const res = await fetch(`/api/plans/${id}/participants`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: joinName.trim(),
          telegramUserId: tmaUser?.id?.toString(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Could not join plan");
      }

      const { participantId, token } = await res.json();
      const newSession: LocalParticipantSession = {
        planId: id,
        participantId,
        token,
        displayName: joinName.trim(),
        isHost: false,
      };

      const existingSession = loadSession(id);
      if (existingSession?.hostToken) newSession.hostToken = existingSession.hostToken;

      saveSession(id, newSession);
      setSession(newSession);
      toast.success("Joined successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setJoining(false);
    }
  }

  async function handleSaveAvailability(updates: Array<{ slotKey: string; available: boolean }>) {
    if (!session?.token) return;

    const res = await fetch(`/api/plans/${id}/availability`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.token}`,
      },
      body: JSON.stringify({ slots: updates }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error ?? "Save failed");
    }

    setMyAvailability((prev) => {
      const next = new Map(prev);
      for (const update of updates) next.set(update.slotKey, update.available);
      return next;
    });
  }

  function handleToggleParticipant(participantId: string) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(participantId)) next.delete(participantId);
      else next.add(participantId);
      return next;
    });
  }

  function handleSelectAll() {
    if (!results) return;
    setSelectedParticipantIds(new Set(results.participants.map((p) => p.id)));
  }

  function handleDeselectAll() {
    setSelectedParticipantIds(new Set());
  }

  if (planLoading || session === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) return null;

  if (!session || (!session.participantId && !session.isHost)) {
    return (
      <div className="space-y-6 py-1">
        <header className="surface-card px-5 py-5 sm:px-6">
          <div className="flex items-start gap-3">
            <Link
              href="/"
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-2xl font-bold">{plan.title}</h1>
              {plan.description && <p className="text-sm text-muted-foreground">{plan.description}</p>}
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
                <span className="subtle-panel flex items-center gap-1.5 px-2.5 py-1.5">
                  <CalendarDays className="h-3.5 w-3.5" />
                  {formatDateFull(plan.startDate)} - {formatDateFull(plan.endDate)}
                </span>
                <span className="subtle-panel flex items-center gap-1.5 px-2.5 py-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {plan.participantCount} joined
                </span>
              </div>
            </div>
          </div>
        </header>

        <Card className="surface-card">
          <CardContent className="pt-6">
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="joinName">Your name</Label>
                <Input
                  id="joinName"
                  placeholder="How should we call you?"
                  value={joinName}
                  onChange={(e) => setJoinName(e.target.value)}
                  autoFocus
                  maxLength={50}
                  required
                />
              </div>
              <Button
                type="submit"
                className="h-11 w-full"
                disabled={joining || !joinName.trim()}
              >
                {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join and Mark Availability"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground">Timezone: {plan.timezone}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 py-1">
      <header className="surface-card px-5 py-5 sm:px-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Link
              href="/"
              className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border/80 bg-background/80 text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Back to home"
            >
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="min-w-0 space-y-2">
              <h1 className="truncate text-2xl font-bold">{plan.title}</h1>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{plan.slotMinutes} min slots</Badge>
                <Badge variant="outline">{plan.timezone}</Badge>
              </div>
              {plan.description && (
                <p className="flex items-start gap-2 text-sm text-muted-foreground">
                  <Info className="mt-0.5 h-4 w-4 shrink-0" />
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          {session.isHost && (
            <Link href={`/plan/${id}/edit`}>
              <Button variant="outline" size="icon" aria-label="Edit plan">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-border/80 bg-background/72 p-1">
        <button
          type="button"
          className={`h-10 cursor-pointer rounded-xl text-sm font-semibold transition-colors ${
            !showResults
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setShowResults(false)}
        >
          <span className="inline-flex items-center gap-1.5">
            <Grid className="h-4 w-4" />
            My Availability
          </span>
        </button>
        <button
          type="button"
          className={`h-10 cursor-pointer rounded-xl text-sm font-semibold transition-colors ${
            showResults
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
          onClick={() => setShowResults(true)}
        >
          <span className="inline-flex items-center gap-1.5">
            <BarChart2 className="h-4 w-4" />
            Results
            {plan.participantCount > 0 && (
              <Badge variant={showResults ? "secondary" : "outline"} className="ml-1 py-0.5">
                {plan.participantCount}
              </Badge>
            )}
          </span>
        </button>
      </div>

      {!showResults && (
        <div className="space-y-4">
          {session.isHost && !session.participantId && (
            <Card className="surface-card">
              <CardContent className="space-y-3 pt-5">
                <p className="text-sm font-semibold">Add your host availability</p>
                <form onSubmit={handleJoin} className="flex flex-col gap-2 sm:flex-row">
                  <Input
                    placeholder="Your display name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={50}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={joining || !joinName.trim()} className="sm:w-28">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <Card className="surface-card">
            <CardContent className="pt-5">
              <SlotGridSelector
                slots={plan.slots}
                timezone={plan.timezone}
                initialAvailability={myAvailability}
                onSave={handleSaveAvailability}
                disabled={!session.participantId}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {showResults && (
        <div className="space-y-4">
          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results ? (
            <>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={activeTab === "heatmap" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("heatmap")}
                >
                  <Grid className="h-3.5 w-3.5" />
                  Heatmap
                </Button>
                <Button
                  variant={activeTab === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("calendar")}
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Best Times
                </Button>
              </div>

              <Card className="surface-card">
                <CardContent className="pt-5">
                  {activeTab === "heatmap" && (
                    <ResultsHeatmap
                      slots={plan.slots}
                      results={results.slots}
                      participants={results.participants}
                      totalParticipants={results.totalParticipants}
                      selectedParticipantIds={
                        selectedParticipantIds.size > 0 ? selectedParticipantIds : undefined
                      }
                      timezone={plan.timezone}
                    />
                  )}

                  {activeTab === "calendar" && (
                    <CalendarView
                      results={
                        selectedParticipantIds.size > 0
                          ? results.slots.map((slot) => ({
                              ...slot,
                              availableCount: slot.availableParticipantIds.filter((participantId) =>
                                selectedParticipantIds.has(participantId)
                              ).length,
                              availableParticipantIds: slot.availableParticipantIds.filter((participantId) =>
                                selectedParticipantIds.has(participantId)
                              ),
                            }))
                          : results.slots
                      }
                      participants={results.participants}
                      totalParticipants={
                        selectedParticipantIds.size > 0
                          ? selectedParticipantIds.size
                          : results.totalParticipants
                      }
                    />
                  )}
                </CardContent>
              </Card>

              {!plan.hideParticipants && results.participants.length > 0 && (
                <Card className="surface-card">
                  <CardContent className="pt-5">
                    <ParticipantList
                      participants={results.participants}
                      selectedIds={selectedParticipantIds}
                      onToggle={handleToggleParticipant}
                      onSelectAll={handleSelectAll}
                      onDeselectAll={handleDeselectAll}
                      isPrivacyMode={plan.hideParticipants}
                    />
                  </CardContent>
                </Card>
              )}
            </>
          ) : null}
        </div>
      )}

      <ShareButton planId={id} planTitle={plan.title} variant="outline" className="w-full" />
    </div>
  );
}
