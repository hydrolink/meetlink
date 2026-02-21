import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";
import type { LocalParticipantSession } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ─── Session Management (client-side only) ────────────────────────────────────
const SESSION_KEY_PREFIX = "meetlink_session_";

export function saveSession(planId: string, session: LocalParticipantSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY_PREFIX + planId, JSON.stringify(session));
}

export function loadSession(planId: string): LocalParticipantSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY_PREFIX + planId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearSession(planId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SESSION_KEY_PREFIX + planId);
}

// ─── Date Formatting ──────────────────────────────────────────────────────────

export function formatDateHeader(localDate: string): string {
  try {
    const d = parseISO(localDate);
    return format(d, "EEE d"); // e.g. "Mon 3"
  } catch {
    return localDate;
  }
}

export function formatDateFull(localDate: string): string {
  try {
    const d = parseISO(localDate);
    return format(d, "EEE, MMM d"); // e.g. "Mon, Jan 3"
  } catch {
    return localDate;
  }
}

export function formatMonthYear(localDate: string): string {
  try {
    const d = parseISO(localDate);
    return format(d, "MMMM yyyy"); // e.g. "January 2025"
  } catch {
    return localDate;
  }
}

export function formatTime12h(time24: string): string {
  const [h, m] = time24.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

// ─── Timezone Utilities ───────────────────────────────────────────────────────

export function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "UTC";
  }
}

export function getGroupedTimezones(): Record<string, string[]> {
  try {
    const allZones: string[] = Intl.supportedValuesOf("timeZone");
    const groups: Record<string, string[]> = {};
    for (const zone of allZones) {
      const region = zone.split("/")[0];
      if (!groups[region]) groups[region] = [];
      groups[region].push(zone);
    }
    return groups;
  } catch {
    // Fallback for environments that don't support Intl.supportedValuesOf
    return { UTC: ["UTC"] };
  }
}

export function getTimezoneOffset(timezone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en", {
      timeZone: timezone,
      timeZoneName: "shortOffset",
    });
    const parts = formatter.formatToParts(new Date());
    const offset = parts.find((p) => p.type === "timeZoneName")?.value ?? "";
    return offset;
  } catch {
    return "";
  }
}

// ─── Misc ─────────────────────────────────────────────────────────────────────

export function generateJoinCode(planId: string): string {
  // Short 6-char join code derived from plan ID for display purposes
  return planId.slice(-6).toUpperCase();
}

export function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard) {
    return navigator.clipboard.writeText(text);
  }
  // Fallback for older browsers
  const el = document.createElement("textarea");
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand("copy");
  document.body.removeChild(el);
  return Promise.resolve();
}
