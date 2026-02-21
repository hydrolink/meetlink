"use client";

import { useState, useMemo } from "react";
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
        (z) => z.toLowerCase().includes(q) || region.toLowerCase().includes(q)
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
          className={cn("justify-between font-normal", className)}
        >
          <span className="truncate">{value}</span>
          <span className="text-muted-foreground ml-2 shrink-0 text-xs">{offset}</span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start" sideOffset={4}>
        {/* Search */}
        <div className="flex items-center border-b px-3 py-2 gap-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            placeholder="Search timezones..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            autoFocus
          />
        </div>

        {/* Zone list */}
        <div className="max-h-64 overflow-y-auto">
          {Object.entries(filtered).map(([region, zones]) => (
            <div key={region}>
              <div className="px-3 py-1 text-xs font-semibold text-muted-foreground sticky top-0 bg-popover">
                {region}
              </div>
              {zones.map((zone) => (
                <button
                  key={zone}
                  className={cn(
                    "w-full flex items-center gap-2 px-3 py-1.5 text-sm hover:bg-accent cursor-pointer text-left",
                    value === zone && "bg-accent"
                  )}
                  onClick={() => {
                    onChange(zone);
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <Check
                    className={cn("h-4 w-4 shrink-0", value === zone ? "opacity-100" : "opacity-0")}
                  />
                  <span className="truncate">{zone.split("/").pop()?.replace(/_/g, " ")}</span>
                  <span className="ml-auto text-xs text-muted-foreground shrink-0">
                    {getTimezoneOffset(zone)}
                  </span>
                </button>
              ))}
            </div>
          ))}
          {Object.keys(filtered).length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">No timezones found</p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
