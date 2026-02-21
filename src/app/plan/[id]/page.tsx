"use client";

import { use, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  Users,
  BarChart2,
  Grid,
  CalendarDays,
  Loader2,
  Settings,
  Info,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SlotGridSelector } from "@/components/slot-grid-selector";
import { ResultsHeatmap } from "@/components/results-heatmap";
import { CalendarView } from "@/components/calendar-view";
import { ParticipantList } from "@/components/participant-list";
import { ShareButton } from "@/components/share-button";
import { loadSession, saveSession, formatDateFull } from "@/lib/utils";
import { useTMAUser } from "@/components/tma-provider";
import type { PlanDetail, ResultsResponse, LocalParticipantSession, GetAvailabilityResponse } from "@/types";

type ViewTab = "grid" | "heatmap" | "calendar";

export default function PlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const tmaUser = useTMAUser();

  // Plan data
  const [plan, setPlan] = useState<PlanDetail | null>(null);
  const [planLoading, setPlanLoading] = useState(true);

  // Session: undefined=unchecked, null=no session, object=has session
  const [session, setSession] = useState<LocalParticipantSession | null | undefined>(undefined);

  // Availability for current user
  const [myAvailability, setMyAvailability] = useState<Map<string, boolean>>(new Map());

  // Results
  const [results, setResults] = useState<ResultsResponse | null>(null);
  const [resultsLoading, setResultsLoading] = useState(false);

  // UI state
  const [activeTab, setActiveTab] = useState<ViewTab>("grid");
  const [showResults, setShowResults] = useState(false);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<Set<string>>(new Set());

  // Join form state
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);

  // Load plan data
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

  // Check localStorage for existing session
  useEffect(() => {
    setSession(loadSession(id));
    // Pre-fill Telegram name
    if (tmaUser?.firstName) setJoinName(tmaUser.firstName);
  }, [id, tmaUser]);

  // Load my availability when session is found
  useEffect(() => {
    if (!session?.token) return;

    async function fetchMyAvailability() {
      try {
        const res = await fetch(`/api/plans/${id}/availability`, {
          headers: { Authorization: `Bearer ${session!.token}` },
        });
        if (!res.ok) return;
        const data: GetAvailabilityResponse = await res.json();
        const avMap = new Map<string, boolean>();
        for (const s of data.slots) avMap.set(s.slotKey, s.available);
        setMyAvailability(avMap);
      } catch {
        // Non-critical — user can still paint
      }
    }
    fetchMyAvailability();
  }, [id, session]);

  // Load results when switching to results view
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

  // Join plan handler
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

      // If user was the host (has hostToken in storage), merge that in
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

  // Save availability handler
  async function handleSaveAvailability(
    updates: Array<{ slotKey: string; available: boolean }>
  ) {
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
  }

  // Participant filter handlers
  function handleToggleParticipant(id: string) {
    setSelectedParticipantIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // ─── Loading states ──────────────────────────────────────────────────────────

  if (planLoading || session === undefined) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!plan) return null;

  // ─── Join form (no session) ──────────────────────────────────────────────────

  if (!session || (!session.participantId && !session.isHost)) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold truncate">{plan.title}</h1>
        </div>

        {plan.description && (
          <p className="text-sm text-muted-foreground">{plan.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            {formatDateFull(plan.startDate)} – {formatDateFull(plan.endDate)}
          </span>
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {plan.participantCount} joined
          </span>
        </div>

        <Card>
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
                className="w-full h-11"
                disabled={joining || !joinName.trim()}
              >
                {joining ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Join & Mark Availability"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          Timezone: {plan.timezone}
        </p>
      </div>
    );
  }

  // ─── Main plan view ──────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <Link href="/" className="text-muted-foreground hover:text-foreground mt-1 shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight truncate">{plan.title}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {plan.slotMinutes} min slots
              </Badge>
              <span className="text-xs text-muted-foreground">{plan.timezone}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {session.isHost && (
            <Link href={`/plan/${id}/edit`}>
              <Button variant="ghost" size="icon" aria-label="Edit plan">
                <Settings className="h-4 w-4" />
              </Button>
            </Link>
          )}
        </div>
      </div>

      {plan.description && (
        <p className="text-sm text-muted-foreground flex items-start gap-1.5">
          <Info className="h-4 w-4 shrink-0 mt-0.5" />
          {plan.description}
        </p>
      )}

      {/* Toggle: Availability vs Results */}
      <div className="flex rounded-lg border overflow-hidden">
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            !showResults ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          onClick={() => setShowResults(false)}
        >
          <Grid className="h-4 w-4" />
          My Availability
        </button>
        <button
          className={`flex-1 py-2.5 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
            showResults ? "bg-primary text-primary-foreground" : "hover:bg-muted"
          }`}
          onClick={() => setShowResults(true)}
        >
          <BarChart2 className="h-4 w-4" />
          Results
          {plan.participantCount > 0 && (
            <Badge
              variant={showResults ? "secondary" : "outline"}
              className="text-xs ml-1 py-0 px-1 h-4"
            >
              {plan.participantCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Availability editing */}
      {!showResults && (
        <>
          {/* Host hasn't joined as participant yet — show inline join prompt */}
          {session.isHost && !session.participantId && (
            <Card>
              <CardContent className="pt-4 pb-4">
                <p className="text-sm font-medium mb-3">
                  Add your own availability as host
                </p>
                <form onSubmit={handleJoin} className="flex gap-2">
                  <Input
                    placeholder="Your display name"
                    value={joinName}
                    onChange={(e) => setJoinName(e.target.value)}
                    maxLength={50}
                    className="flex-1"
                  />
                  <Button type="submit" disabled={joining || !joinName.trim()} size="sm">
                    {joining ? <Loader2 className="h-4 w-4 animate-spin" /> : "Join"}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          <SlotGridSelector
            slots={plan.slots}
            timezone={plan.timezone}
            initialAvailability={myAvailability}
            onSave={handleSaveAvailability}
            disabled={!session.participantId}
          />
        </>
      )}

      {/* Results */}
      {showResults && (
        <div className="space-y-5">
          {resultsLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : results ? (
            <>
              {/* View tabs */}
              <div className="flex gap-1.5">
                <Button
                  variant={activeTab === "heatmap" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("heatmap")}
                  className="gap-1.5"
                >
                  <Grid className="h-3.5 w-3.5" />
                  Heatmap
                </Button>
                <Button
                  variant={activeTab === "calendar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveTab("calendar")}
                  className="gap-1.5"
                >
                  <CalendarDays className="h-3.5 w-3.5" />
                  Best Times
                </Button>
              </div>

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
                      ? results.slots.map((s) => ({
                          ...s,
                          availableCount: s.availableParticipantIds.filter((pid) =>
                            selectedParticipantIds.has(pid)
                          ).length,
                          availableParticipantIds: s.availableParticipantIds.filter((pid) =>
                            selectedParticipantIds.has(pid)
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

              {/* Participant filter */}
              {!plan.hideParticipants && results.participants.length > 0 && (
                <Card>
                  <CardContent className="pt-4">
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

      {/* Share button */}
      <div className="pt-2">
        <ShareButton planId={id} planTitle={plan.title} variant="outline" className="w-full" />
      </div>
    </div>
  );
}
