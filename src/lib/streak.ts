/** Local-calendar day key (year-month-day), ignoring time of day. */
function dayKey(d: Date): string {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

/**
 * Count consecutive local-calendar days with at least one completion,
 * ending today or (to avoid breaking a streak before the day's first pill)
 * yesterday. Returns 0 if neither today nor yesterday has a completion.
 */
export function computeStreak(completedDates: Date[], today: Date): number {
  const days = new Set(completedDates.map(dayKey));
  if (days.size === 0) return 0;

  // Anchor on today; if today is empty, allow yesterday.
  const cursor = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (!days.has(dayKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(dayKey(cursor))) return 0;
  }

  let streak = 0;
  while (days.has(dayKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}
