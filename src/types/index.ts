// ─── API Request/Response Types ───────────────────────────────────────────────

export interface CreatePlanRequest {
  title: string;
  description?: string;
  timezone: string; // IANA timezone string
  startDate: string; // "YYYY-MM-DD"
  endDate: string; // "YYYY-MM-DD"
  dayStartTime: string; // "HH:MM" 24h
  dayEndTime: string; // "HH:MM" 24h
  slotMinutes: 15 | 30 | 60;
  workingDays: number[]; // 0-6, 0=Sun (JS convention)
  maxParticipants?: number;
  hideParticipants?: boolean;
  createdByTelegramId?: string;
}

export interface CreatePlanResponse {
  id: string;
  hostToken: string; // ONLY returned at plan creation time, never again
}

export interface SlotInfo {
  slotKey: string; // "YYYY-MM-DDTHH:MM" UTC
  localDate: string; // "YYYY-MM-DD" in plan timezone
  localTime: string; // "HH:MM" in plan timezone
  dayOfWeek: number; // 0=Sun
}

export interface PlanDetail {
  id: string;
  title: string;
  description: string | null;
  timezone: string;
  startDate: string;
  endDate: string;
  dayStartTime: string;
  dayEndTime: string;
  slotMinutes: number;
  workingDays: number[];
  maxParticipants: number | null;
  hideParticipants: boolean;
  createdAt: number;
  slots: SlotInfo[];
  participantCount: number;
}

export interface JoinPlanRequest {
  displayName: string;
  telegramUserId?: string;
  telegramInitData?: string;
}

export interface JoinPlanResponse {
  participantId: string;
  token: string;
  planId: string;
}

export interface UpsertAvailabilityRequest {
  slots: Array<{
    slotKey: string;
    available: boolean;
  }>;
}

export interface SlotResult {
  slotKey: string;
  localDate: string;
  localTime: string;
  availableCount: number;
  availableParticipantIds: string[];
}

export interface ParticipantInfo {
  id: string;
  displayName: string; // Empty string if hideParticipants = true
  telegramUserId: string | null;
}

export interface ResultsResponse {
  slots: SlotResult[];
  participants: ParticipantInfo[];
  totalParticipants: number;
}

// ─── Participant Availability ─────────────────────────────────────────────────

export interface ParticipantAvailability {
  participantId: string;
  availability: Map<string, boolean>; // slotKey → available
}

export interface GetAvailabilityResponse {
  participantId: string;
  slots: Array<{ slotKey: string; available: boolean }>;
}

// ─── Client-Side State ────────────────────────────────────────────────────────

export interface LocalParticipantSession {
  planId: string;
  participantId: string;
  token: string;
  displayName: string;
  isHost: boolean;
  hostToken?: string; // Only present if user created this plan
}
