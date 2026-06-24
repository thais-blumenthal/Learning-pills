export type Slot = "morning" | "afternoon";

export function eligibleSlots(cadence: string): Slot[] {
  if (cadence === "twice") return ["morning", "afternoon"];
  return ["morning"]; // morning + weekdays
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
