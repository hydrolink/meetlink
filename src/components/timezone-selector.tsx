"use client";

import { useMemo, useState } from "react";
import { Check, ChevronDown, Search } from "lucide-react";
import { cn, getGroupedTimezones, getTimezoneOffset } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface TimezoneSelectorProps {
  value: string;
  onChange: (tz: string) => void;
  className?: string;
}

export function TimezoneSelector({ value, onChange, className }: TimezoneSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const grouped = useMemo(() => getGroupedTimezones(), []);

  const filtered = useMemo(() => {
    if (!search.trim()) return grouped;
    const q = search.toLowerCase();
    const result: Record<string, string[]> = {};
    for (const [region, zones] of Object.entries(grouped)) {
      const matches = zones.filter(
        (zone) => zone.toLowerCase().includes(q) || region.toLowerCase().includes(q)
      );
      if (matches.length > 0) result[region] = matches;
    }
    return result;
  }, [grouped, search]);

  const offset = getTimezoneOffset(value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("h-10 w-full justify-between font-medium", className)}
        >
          <span className="truncate">{value}</span>
          <span className="ml-2 shrink-0 text-xs text-muted-foreground">{offset}</span>
          <ChevronDown className="ml-1 h-4 w-4 shrink-0 opacity-65" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[min(92vw,360px)] rounded-2xl border-border/85 p-0" align="start" sideOffset={6}>
        <div className="flex items-center gap-2 border-b border-border/75 px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search timezones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-72 overflow-y-auto py-1">
          {Object.entries(filtered).map(([region, zones]) => (
            <div key={region}>
              <div className="sticky top-0 z-10 bg-popover px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                {region}
              </div>
              {zones.map((zone) => (
                <button
                  key={zone}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/75",
                    value === zone && "bg-accent/75"
                  )}
                  onClick={() => {
                    onChange(zone);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check className={cn("h-4 w-4 shrink-0", value === zone ? "opacity-100" : "opacity-0")} />
                  <span className="truncate">{zone.split("/").pop()?.replace(/_/g, " ")}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {getTimezoneOffset(zone)}
                  </span>
                </button>
              ))}
            </div>
          ))}

          {Object.keys(filtered).length === 0 && (
            <p className="px-3 py-7 text-center text-sm text-muted-foreground">No timezones found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
