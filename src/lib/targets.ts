/**
 * Response targets and escalation.
 *
 * ASSUMPTION: no SLA was supplied by Atlas. These targets are illustrative,
 * configurable defaults. They measure one thing only: time from receipt until
 * a technician owns the request. The app calls a request "overdue against its
 * target", never "SLA breached".
 */
import { duration } from "./format";
import type { Priority } from "./triage";
import { PRIORITY_RANK, type RequestDTO } from "./view";

export const TARGET_HOURS: Record<Priority, number> = { CRITICAL: 1, HIGH: 4, NORMAL: 24, LOW: 72 };
export const DUE_SOON_AT = 0.75;

export type TargetState = "ok" | "due-soon" | "overdue" | "met" | "none";

export interface TargetInfo {
  state: TargetState;
  /** Share of the target window used so far (can exceed 1). */
  pct: number;
  /** Milliseconds past the target, 0 when not overdue. */
  overdueMs: number;
  label: string;
}

const ZERO = new Date(0);

export function targetInfo(r: RequestDTO, now: string | Date): TargetInfo {
  if (r.status === "CLOSED" || r.duplicateOfId) return { state: "none", pct: 0, overdueMs: 0, label: "" };
  if (r.technicianId) return { state: "met", pct: 1, overdueMs: 0, label: `Owner ${r.technicianId}` };
  if (r.status === "RESOLVED") return { state: "met", pct: 1, overdueMs: 0, label: "Resolved" };

  const targetMs = TARGET_HOURS[r.priority] * 3600 * 1000;
  const elapsed = Math.max(0, new Date(now).getTime() - new Date(r.receivedAt).getTime());
  const pct = elapsed / targetMs;
  if (elapsed > targetMs) {
    const overdueMs = elapsed - targetMs;
    return { state: "overdue", pct, overdueMs, label: `Overdue by ${duration(ZERO, new Date(overdueMs))}` };
  }
  const left = duration(ZERO, new Date(targetMs - elapsed));
  return { state: pct >= DUE_SOON_AT ? "due-soon" : "ok", pct, overdueMs: 0, label: `Owner due in ${left}` };
}

/** Critical and high requests that are past their target with no owner, worst first. */
export function escalations(requests: RequestDTO[], now: string | Date): { r: RequestDTO; info: TargetInfo }[] {
  return requests
    .map((r) => ({ r, info: targetInfo(r, now) }))
    .filter(({ r, info }) => info.state === "overdue" && (r.priority === "CRITICAL" || r.priority === "HIGH"))
    .sort((a, b) => PRIORITY_RANK[a.r.priority] - PRIORITY_RANK[b.r.priority] || b.info.overdueMs - a.info.overdueMs);
}
