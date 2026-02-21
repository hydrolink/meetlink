"use client";

import { useState } from "react";
import { Users, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
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
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        No participants yet
      </div>
    );
  }

  const allSelected = selectedIds.size === participants.length;
  const noneSelected = selectedIds.size === 0;
  const displayedParticipants = expanded ? participants : participants.slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">
            {participants.length} participant{participants.length !== 1 ? "s" : ""}
          </span>
          {!noneSelected && selectedIds.size < participants.length && (
            <Badge variant="secondary" className="text-xs">
              Filtering: {selectedIds.size}
            </Badge>
          )}
        </div>

        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7 px-2"
            onClick={allSelected ? onDeselectAll : onSelectAll}
          >
            {allSelected ? "Deselect all" : "Select all"}
          </Button>
        </div>
      </div>

      {isPrivacyMode && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2">
          <EyeOff className="h-3.5 w-3.5 shrink-0" />
          Names hidden by host
        </div>
      )}

      <div className="space-y-1">
        {displayedParticipants.map((p) => (
          <label
            key={p.id}
            className={cn(
              "flex items-center gap-3 p-2.5 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors",
              selectedIds.has(p.id) && "bg-primary/5"
            )}
          >
            <Checkbox
              checked={selectedIds.has(p.id)}
              onCheckedChange={() => onToggle(p.id)}
              className="shrink-0"
            />
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                {isPrivacyMode
                  ? "?"
                  : (p.displayName || "?").charAt(0).toUpperCase()}
              </div>
              <span className="text-sm truncate">
                {isPrivacyMode ? "Anonymous" : p.displayName || "Unknown"}
              </span>
              {p.telegramUserId && !isPrivacyMode && (
                <Eye className="h-3 w-3 text-muted-foreground shrink-0" aria-label="Telegram user" />
              )}
            </div>
          </label>
        ))}
      </div>

      {participants.length > 6 && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Show less" : `Show ${participants.length - 6} more`}
        </Button>
      )}
    </div>
  );
}
