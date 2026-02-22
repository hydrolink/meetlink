"use client";

import { useState } from "react";
import { Eye, EyeOff, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import type { ParticipantInfo } from "@/types";

interface ParticipantListProps {
  participants: ParticipantInfo[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  isPrivacyMode?: boolean;
}

export function ParticipantList({
  participants,
  selectedIds,
  onToggle,
  onSelectAll,
  onDeselectAll,
  isPrivacyMode = false,
}: ParticipantListProps) {
  const [expanded, setExpanded] = useState(false);

  if (participants.length === 0) {
    return <div className="py-4 text-center text-sm text-muted-foreground">No participants yet</div>;
  }

  const allSelected = selectedIds.size === participants.length;
  const noneSelected = selectedIds.size === 0;
  const displayedParticipants = expanded ? participants : participants.slice(0, 6);

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold">
            {participants.length} participant{participants.length !== 1 ? "s" : ""}
          </span>
          {!noneSelected && selectedIds.size < participants.length && (
            <Badge variant="secondary">Filtering: {selectedIds.size}</Badge>
          )}
        </div>

        <Button variant="ghost" size="sm" className="h-8" onClick={allSelected ? onDeselectAll : onSelectAll}>
          {allSelected ? "Deselect all" : "Select all"}
        </Button>
      </div>

      {isPrivacyMode && (
        <div className="subtle-panel flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground">
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
          Names are hidden by the host.
        </div>
      )}

      <div className="space-y-1.5">
        {displayedParticipants.map((participant) => (
          <label
            key={participant.id}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-xl border border-transparent px-3 py-2.5 transition-colors hover:bg-muted/55",
              selectedIds.has(participant.id) && "border-primary/20 bg-primary/7"
            )}
          >
            <Checkbox
              checked={selectedIds.has(participant.id)}
              onCheckedChange={() => onToggle(participant.id)}
              className="shrink-0"
            />

            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/12 text-xs font-semibold text-primary">
                {isPrivacyMode ? "?" : (participant.displayName || "?").charAt(0).toUpperCase()}
              </div>
              <span className="truncate text-sm">
                {isPrivacyMode ? "Anonymous" : participant.displayName || "Unknown"}
              </span>
              {participant.telegramUserId && !isPrivacyMode && (
                <Eye className="h-3 w-3 shrink-0 text-muted-foreground" aria-label="Telegram user" />
              )}
            </div>
          </label>
        ))}
      </div>

      {participants.length > 6 && (
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setExpanded(!expanded)}>
          {expanded ? "Show less" : `Show ${participants.length - 6} more`}
        </Button>
      )}
    </div>
  );
}
