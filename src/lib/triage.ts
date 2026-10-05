/**
 * Deterministic triage rules. No AI, no external calls: every decision can be
 * explained to the coordinator in one sentence.
 *
 * ASSUMPTION: these keywords and priorities are illustrative, not supplied
 * Atlas policy. Edit the tables below to change behaviour.
 */
import { duration } from "./format";

export type Priority = "CRITICAL" | "HIGH" | "NORMAL" | "LOW";
export type Intent = "fault" | "followup" | "routine" | "part" | "resolved";
export type Category = "cold-room" | "pump" | "compressor" | "general";

export interface TriageResult {
  category: Category;
  intent: Intent;
  priority: Priority;
  reason: string;
  matched: string | null;
  missingInfo: string[];
}

interface Rule {
  re: RegExp;
  reason: string;
}

const CRITICAL_RULES: Rule[] = [
  { re: /stored goods|spoil|perishable|stock (could|may|will|is)/i, reason: "The message points to possible impact on stored goods." },
  { re: /danger|unsafe|safety|gas leak|smoke|fire\b|electrocut|flood/i, reason: "The message mentions a safety risk." },
  { re: /shut ?down|production (has )?(stopped|halted)|line (is )?down|total failure/i, reason: "Operations appear to be shut down." },
];

const HIGH_RULES: Rule[] = [
  { re: /not working|isn'?t working|broken|failed|failure|fault/i, reason: "Equipment is reported as faulty or not working." },
  { re: /keeps? stopping|stopped|tripping/i, reason: "Equipment is stopping." },
  { re: /warning|alarm|error code/i, reason: "A warning or alarm was reported." },
  { re: /urgent|asap|immediately|today/i, reason: "The customer asked for urgent or same-day attention." },
  { re: /still waiting|waiting for (someone|a technician|the technician|a visit|the visit)|chasing/i, reason: "The customer is waiting on a visit." },
];

const LOW_RULES: Rule[] = [
  { re: /routine|inspection|maintenance|service due|annual|next week/i, reason: "Routine or planned work with no risk indicators." },
];

const INTENT_RULES: { intent: Intent; re: RegExp }[] = [
  { intent: "resolved", re: /(?<!not )(?<!n't )(running|working) again|is fixed|sorted now|all good now/i },
  { intent: "part", re: /waiting for (a |the )?part|part (is |has been )?(on order|ordered)|spare part|on order/i },
  { intent: "routine", re: /routine|inspection|maintenance|service due|annual/i },
  { intent: "followup", re: /follow(ing)? up|still waiting|any update|chasing|reported (yesterday|earlier|last)|as discussed/i },
];

const CATEGORY_RULES: { category: Category; re: RegExp }[] = [
  { category: "cold-room", re: /cold[- ]?room|freezer|refrigerat|chiller/i },
  { category: "compressor", re: /compressor/i },
  { category: "pump", re: /pump|pressure/i },
];

export function detectCategory(message: string): Category {
  return CATEGORY_RULES.find((r) => r.re.test(message))?.category ?? "general";
}

export function detectIntent(message: string): Intent {
  return INTENT_RULES.find((r) => r.re.test(message))?.intent ?? "fault";
}

function firstMatch(rules: Rule[], message: string): { rule: Rule; matched: string } | null {
  for (const rule of rules) {
    const m = message.match(rule.re);
    if (m) return { rule, matched: m[0] };
  }
  return null;
}

export function classifyPriority(message: string, intent: Intent): { priority: Priority; reason: string; matched: string | null } {
  const critical = firstMatch(CRITICAL_RULES, message);
  if (critical && intent !== "resolved") {
    return { priority: "CRITICAL", reason: critical.rule.reason, matched: critical.matched };
  }
  if (intent === "resolved") {
    return { priority: "LOW", reason: "The customer says the equipment is running again.", matched: null };
  }
  if (intent === "part") {
    return { priority: "NORMAL", reason: "Waiting on a part. No new risk reported.", matched: null };
  }
  const high = firstMatch(HIGH_RULES, message);
  if (high) return { priority: "HIGH", reason: high.rule.reason, matched: high.matched };
  const low = firstMatch(LOW_RULES, message);
  if (low) return { priority: "LOW", reason: low.rule.reason, matched: low.matched };
  return { priority: "NORMAL", reason: "No urgency or risk indicators found.", matched: null };
}

const EQUIPMENT_WORDS = /\b(pump|compressor|cold[- ]?room|freezer|chiller|boiler|generator|unit)\b|\b[A-Z]{1,4}-?\d{2,}\b/;
const LOCATION_WORDS = /\b(site|branch|warehouse|plant|factory|building|floor|address|located|depot|store|kitchen)\b/i;
const IMPACT_WORDS = /operational|still (running|working|operating)|partly|partially|completely|production|customers|stock|goods/i;
const ASKS_FOR_CONTACT = /call (us|me)|phone (us|me)|contact (us|me)|ring (us|me)/i;
const HAS_CONTACT_DETAILS = /\+?\d[\d\s-]{7,}|@/;

/** Only fault reports are checked, and critical ones go straight to a technician. */
export function detectMissingInfo(message: string, intent: Intent, priority: Priority): string[] {
  if (intent !== "fault" || priority === "CRITICAL") return [];
  const missing: string[] = [];
  if (!EQUIPMENT_WORDS.test(message)) missing.push("Equipment identifier");
  if (!LOCATION_WORDS.test(message)) missing.push("Site or exact location");
  if (!IMPACT_WORDS.test(message)) missing.push("Operational impact (is it still running?)");
  if (ASKS_FOR_CONTACT.test(message) && !HAS_CONTACT_DETAILS.test(message)) missing.push("Preferred contact details");
  return missing;
}

export function triage(message: string): TriageResult {
  const category = detectCategory(message);
  const intent = detectIntent(message);
  const { priority, reason, matched } = classifyPriority(message, intent);
  return { category, intent, priority, reason, matched, missingInfo: detectMissingInfo(message, intent, priority) };
}

// ---------------------------------------------------------------- duplicates

export interface DuplicateCandidate {
  id: string;
  customerId: string;
  category: string;
  status: string;
  receivedAt: Date | string;
  duplicateOfId: string | null;
}

export const DUPLICATE_WINDOW_HOURS = 48;

/**
 * A request is a possible duplicate when it comes from the same customer, has
 * the same (known) issue category, and arrives within 48 hours of an earlier
 * request that is still open. It is a suggestion: a coordinator confirms.
 */
export function findDuplicate(
  incoming: { customerId: string; category: string; receivedAt: Date | string },
  others: DuplicateCandidate[],
): { id: string; reason: string } | null {
  if (incoming.category === "general") return null;
  const at = new Date(incoming.receivedAt).getTime();
  const windowMs = DUPLICATE_WINDOW_HOURS * 3600 * 1000;
  const matches = others
    .filter((o) => o.customerId === incoming.customerId)
    .filter((o) => o.category === incoming.category)
    .filter((o) => !["RESOLVED", "CLOSED"].includes(o.status) && !o.duplicateOfId)
    .filter((o) => {
      const t = new Date(o.receivedAt).getTime();
      return t < at && at - t <= windowMs;
    })
    .sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime());
  const best = matches[0];
  if (!best) return null;
  return {
    id: best.id,
    reason: `Same customer (${incoming.customerId}), same issue type (${incoming.category}), ${duration(best.receivedAt, incoming.receivedAt)} after ${best.id}.`,
  };
}
