/**
 * Demo clock.
 *
 * The assessment is set at 09:00 on 1 October 2026. Rather than depend on the
 * real wall clock, the app treats "now" as 09:00 and advances it two minutes
 * for every coordinator action (so the audit trail reads 09:02, 09:04, ...).
 * Set USE_REAL_CLOCK=true to use the real time instead.
 */
export const DEMO_START = new Date("2026-10-01T09:00:00Z");
const STEP_MS = 2 * 60 * 1000;

const realClock = () => process.env.USE_REAL_CLOCK === "true";

/** The time the dashboard considers "now", given the latest audit event. */
export function currentTime(latestEvent: Date | null): Date {
  if (realClock()) return new Date();
  return latestEvent && latestEvent > DEMO_START ? latestEvent : DEMO_START;
}

/** The timestamp to stamp on the next coordinator action. */
export function nextTick(latestEvent: Date | null): Date {
  if (realClock()) return new Date();
  return new Date(currentTime(latestEvent).getTime() + STEP_MS);
}
