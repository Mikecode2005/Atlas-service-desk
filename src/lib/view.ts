/** Pure view-model helpers shared by server and client code. */
import { fmtDateTime } from "./format";
import type { Priority } from "./triage";

export type Status =
  | "NEW"
  | "TRIAGED"
  | "ASSIGNED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "WAITING"
  | "NEEDS_INFO"
  | "RESOLVED"
  | "CLOSED";

export interface EventDTO {
  id: number;
  type: string;
  description: string;
  createdAt: string;
}

export interface RequestDTO {
  id: string;
  customerId: string;
  channel: string;
  message: string;
  receivedAt: string;
  category: string;
  intent: string;
  priority: Priority;
  priorityReason: string;
  missingInfo: string[];
  status: Status;
  technicianId: string | null;
  scheduledFor: string | null;
  duplicateOfId: string | null;
  duplicateSuggestedId: string | null;
  duplicateReason: string | null;
  events: EventDTO[];
}

export interface TechnicianDTO {
  id: string;
  name: string;
}

export interface BoardData {
  now: string;
  requests: RequestDTO[];
  technicians: TechnicianDTO[];
  customers: { id: string; name: string }[];
}

export const PRIORITY_RANK: Record<Priority, number> = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 };
export const PRIORITY_LABEL: Record<Priority, string> = { CRITICAL: "Critical", HIGH: "High", NORMAL: "Normal", LOW: "Low" };

export const ACTIVE_ASSIGNED: Status[] = ["ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING"];

export function isLinked(r: RequestDTO): boolean {
  return r.duplicateOfId !== null;
}

/** Open work the coordinator may still need to act on. */
export function isActive(r: RequestDTO): boolean {
  return r.status !== "CLOSED" && !isLinked(r);
}

export function hasDuplicateSuggestion(r: RequestDTO): boolean {
  return r.duplicateSuggestedId !== null && !isLinked(r) && isActive(r);
}

export function isUrgentUnassigned(r: RequestDTO): boolean {
  return (
    isActive(r) &&
    (r.priority === "CRITICAL" || r.priority === "HIGH") &&
    r.technicianId === null &&
    !hasDuplicateSuggestion(r) &&
    r.status !== "RESOLVED"
  );
}

export function statusLabel(r: RequestDTO): string {
  if (isLinked(r)) return `Linked to ${r.duplicateOfId}`;
  if (hasDuplicateSuggestion(r)) return "Possible duplicate";
  switch (r.status) {
    case "NEW":
    case "TRIAGED":
      return r.technicianId ? `Assigned to ${r.technicianId}` : "Unassigned";
    case "ASSIGNED":
      return `Assigned to ${r.technicianId}`;
    case "SCHEDULED":
      return `Scheduled ${r.scheduledFor ? fmtDateTime(r.scheduledFor) : ""}`.trim();
    case "IN_PROGRESS":
      return "In progress";
    case "WAITING":
      return "Waiting";
    case "NEEDS_INFO":
      return "Needs info";
    case "RESOLVED":
      return "Resolved";
    case "CLOSED":
      return "Closed";
  }
}

export function nextAction(r: RequestDTO): string {
  if (isLinked(r)) return `Handled under ${r.duplicateOfId}`;
  if (hasDuplicateSuggestion(r)) return `Link to ${r.duplicateSuggestedId}`;
  switch (r.status) {
    case "NEEDS_INFO":
      return "Contact customer";
    case "NEW":
    case "TRIAGED":
      if (r.technicianId) return "Schedule visit";
      return r.intent === "routine" ? "Schedule visit" : "Assign technician";
    case "ASSIGNED":
      return "Schedule visit";
    case "SCHEDULED":
      return "Start work";
    case "IN_PROGRESS":
      return "Mark resolved";
    case "WAITING":
      return "Update customer";
    case "RESOLVED":
      return "Close request";
    case "CLOSED":
      return "None";
  }
}

export function summary(message: string): string {
  const first = message.split(/(?<=[.!?])\s/)[0] ?? message;
  return first.length > 90 ? `${first.slice(0, 87)}...` : first;
}

export function sortForQueue(a: RequestDTO, b: RequestDTO): number {
  const byPriority = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  if (byPriority !== 0) return byPriority;
  return new Date(a.receivedAt).getTime() - new Date(b.receivedAt).getTime();
}

export function technicianLoad(requests: RequestDTO[], technicianId: string): RequestDTO[] {
  return requests.filter((r) => r.technicianId === technicianId && ACTIVE_ASSIGNED.includes(r.status)).sort(sortForQueue);
}

export function relatedTo(r: RequestDTO, all: RequestDTO[]): RequestDTO[] {
  return all.filter(
    (o) =>
      o.id !== r.id &&
      (o.duplicateOfId === r.id || o.duplicateSuggestedId === r.id || r.duplicateOfId === o.id || r.duplicateSuggestedId === o.id),
  );
}

/** Message the coordinator can copy and send. Nothing is sent automatically. */
export function customerUpdateText(r: RequestDTO): string {
  const tech = r.technicianId;
  if (isLinked(r)) {
    return `Thanks for following up. Your message has been added to service request ${r.duplicateOfId}, which our team is already handling. We will keep you updated on that request.`;
  }
  switch (r.status) {
    case "NEEDS_INFO":
      return `To move your service request forward we need a few details:\n${r.missingInfo.map((m) => `- ${m}`).join("\n")}\nPlease reply with these and we will arrange a technician.`;
    case "NEW":
    case "TRIAGED":
      return tech
        ? `Your service request is assigned to technician ${tech}. We are currently scheduling the visit and will confirm the visit time once available.`
        : `We have received your service request ${r.id} and it is being prioritised. We will confirm which technician is assigned shortly.`;
    case "ASSIGNED":
      return `Your service request is assigned to technician ${tech}. We are currently scheduling the visit and will confirm the visit time once available.`;
    case "SCHEDULED":
      return `Technician ${tech} will visit on ${r.scheduledFor ? fmtDateTime(r.scheduledFor) : "the confirmed date"} (UTC). Please make sure someone can give access to the equipment.`;
    case "IN_PROGRESS":
      return `Technician ${tech ?? "from our team"} is working on your request ${r.id}. We will let you know as soon as it is resolved.`;
    case "WAITING":
      return r.intent === "part"
        ? `We are waiting for a part for your request ${r.id}. ${tech ? `Technician ${tech} remains assigned and ` : "We "}will contact you as soon as it arrives.`
        : `Your request ${r.id} is on hold while we wait for further information or parts. We will update you as soon as it moves forward.`;
    case "RESOLVED":
      return `Your service request ${r.id} has been marked resolved. If the problem comes back, reply to this message and we will reopen it.`;
    case "CLOSED":
      return `Your service request ${r.id} is closed. Reply to this message if you need anything further.`;
  }
}

// ------------------------------------------------------- search and workload

/** Case-insensitive match over the fields a coordinator would search by. */
export function matchesQuery(r: RequestDTO, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [r.id, r.customerId, r.channel, r.message, r.category, r.technicianId ?? "unassigned", statusLabel(r)].join(" ").toLowerCase();
  return q.split(/\s+/).every((word) => haystack.includes(word));
}

const LOAD_WEIGHT: Record<Priority, number> = { CRITICAL: 3, HIGH: 2, NORMAL: 1, LOW: 1 };

/** Weighted workload. Jobs parked as WAITING do not consume technician time. */
export function techLoadScore(requests: RequestDTO[], technicianId: string): number {
  return technicianLoad(requests, technicianId)
    .filter((r) => r.status !== "WAITING")
    .reduce((sum, r) => sum + LOAD_WEIGHT[r.priority], 0);
}

export interface TechSuggestion {
  id: string;
  score: number;
  reason: string;
}

/**
 * Suggests the technician with the lightest weighted workload (ties go to the
 * lowest ID). It is a hint only: no skills or locations were supplied.
 */
export function suggestTechnician(requests: RequestDTO[], technicians: TechnicianDTO[]): TechSuggestion | null {
  const scored = technicians.map((t) => ({ id: t.id, score: techLoadScore(requests, t.id) })).sort((a, b) => a.score - b.score || a.id.localeCompare(b.id));
  const best = scored[0];
  if (!best) return null;
  return { ...best, reason: best.score === 0 ? "No active jobs" : `Lightest workload (load ${best.score})` };
}
