// Shared "does this activity have an end, and is it the same day as the
// start" logic for every place that displays an activity's date/time
// (ActivityCard.js, ActivityViewerScreen.js, ProfileViewScreen.js). Each of
// those already formats dates in its own genuinely different style (en-US
// short vs. en-GB verbose-with-"Onwards" vs. bare en-GB numeric) — this
// utility deliberately doesn't try to own a single fixed output string for
// all of them. It only owns the range-combining logic; each call site keeps
// its own existing Intl formatting calls and just branches on `isRange`/
// `sameDay`.
export function getActivitySchedule(dateTime, endDateTime) {
  const start = new Date(dateTime);
  const end = endDateTime ? new Date(endDateTime) : null;
  const isRange = !!end;
  const sameDay = isRange && start.toDateString() === end.toDateString();
  return { start, end, isRange, sameDay };
}

// Extracts a Date's own local calendar date as 'YYYY-MM-DD', for building
// the `${date}T${time}` strings CreateActivityScreen submits.
//
// Not `d.toISOString().split('T')[0]` — that shifts to UTC first, while the
// time half of the same string is built from local components
// (`d.toTimeString()`). For anyone ahead of UTC late in the day (or, with
// this backend's TIME_ZONE='UTC' database, really any non-UTC timezone past
// a certain local hour), the date and time halves end up computed on two
// different timezone bases — the emitted string can silently not match what
// was actually picked on screen. Matters even more once there are two
// independent date/time pairs (start and end) being compared against each
// other (end > start) — a bug that used to be a display glitch becomes an
// intermittent validation bug near local midnight.
export function localDateString(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
