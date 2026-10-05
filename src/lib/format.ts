// All times are shown in UTC because no time zone was supplied in the brief.
const TZ = "UTC";

export function fmtDateTime(iso: string | Date): string {
  const d = new Date(iso);
  const day = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "short" }).format(d);
  return `${day}, ${fmtTime(d)}`;
}

export function fmtTime(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function fmtDay(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-GB", { timeZone: TZ, day: "numeric", month: "long", year: "numeric" }).format(
    new Date(iso),
  );
}

/** "16h 15m", "2d 3h", "12m" */
export function duration(fromIso: string | Date, toIso: string | Date): string {
  const ms = Math.max(0, new Date(toIso).getTime() - new Date(fromIso).getTime());
  const mins = Math.round(ms / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ${String(mins % 60).padStart(2, "0")}m`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h`;
}

/** Value for <input type="datetime-local"> in UTC. */
export function toInputValue(iso: string | Date): string {
  return new Date(iso).toISOString().slice(0, 16);
}

export function fromInputValue(value: string): Date {
  return new Date(`${value}:00Z`);
}
