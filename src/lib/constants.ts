// Shared constants used across multiple components

export const DAYS_OF_WEEK = [
  { label: "Sun", value: 0 },
  { label: "Mon", value: 1 },
  { label: "Tue", value: 2 },
  { label: "Wed", value: 3 },
  { label: "Thu", value: 4 },
  { label: "Fri", value: 5 },
  { label: "Sat", value: 6 },
] as const;

export const SLOT_GRANULARITY_OPTIONS = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
] as const;

export const DEFAULT_WORKING_DAYS = [1, 2, 3, 4, 5]; // Mon–Fri
export const DEFAULT_DAY_START = "09:00";
export const DEFAULT_DAY_END = "17:00";
export const DEFAULT_SLOT_MINUTES = 30;
export const MAX_SLOT_COUNT = 50_000;
