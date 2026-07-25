export type Slot = "morning" | "afternoon";

export function eligibleSlots(cadence: string): Slot[] {
  if (cadence === "twice") return ["morning", "afternoon"];
  return ["morning"]; // morning + weekdays
}

// Stable YYYY-MM-DD key for the calendar day of `date` in `timeZone`.
// String comparison of two keys tells you which day is earlier.
export function dayKeyInTz(date: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function isWeekendInTz(date: Date, timeZone: string): boolean {
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(date);
  return weekday === "Sat" || weekday === "Sun";
}

export function isProjectEligible(
  cadence: string,
  slot: Slot,
  now: Date,
  timeZone: string,
): boolean {
  if (!eligibleSlots(cadence).includes(slot)) return false;
  if (cadence === "weekdays" && isWeekendInTz(now, timeZone)) return false;
  return true;
}
