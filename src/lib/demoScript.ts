/** The guided demo: five scenes that walk through the assessment scenario. */

export type GuideKind = "intro" | "assign" | "link" | "schedule" | "info" | "wrap";

export interface GuideStep {
  kind: GuideKind;
  title: string;
  text: string;
  /** Request to open in the drawer when the step starts. */
  open?: string;
  /** Label of the button that performs the step for the presenter. */
  action?: string;
}

export const GUIDE_STEPS: GuideStep[] = [
  {
    kind: "intro",
    title: "09:00 on 1 October",
    text: "The coordinator starts the day with eight requests. Instead of a spreadsheet of messages they get a queue: a priority, an owner and a next action for every request.",
    action: "Reset and start",
  },
  {
    kind: "assign",
    open: "R101",
    title: "Catch the urgent request",
    text: "R101 mentions stored goods, so Atlas marks it Critical and says why. It is hours past its response target with no owner. Atlas suggests the technician with the lightest workload.",
    action: "Assign suggested technician",
  },
  {
    kind: "link",
    open: "R104",
    title: "Stop duplicate work",
    text: "R104 is a follow-up from the same customer about the same cold-room fault. Atlas suggests linking it instead of opening a second job. A coordinator makes the call.",
    action: "Link to R101",
  },
  {
    kind: "schedule",
    open: "R102",
    title: "Answer the customer who is waiting",
    text: "R102 has an owner but no visit time. Schedule one, then press Generate update for a message that is ready to send.",
    action: "Schedule visit tomorrow 09:00",
  },
  {
    kind: "info",
    open: "R105",
    title: "Turn a vague message into work",
    text: "\"Machine not working. Please call us.\" Atlas lists what is missing. Press Request information to see the message it drafts for the customer.",
  },
  {
    kind: "wrap",
    title: "One queue, nothing lost",
    text: "Urgent work is caught, duplicates are merged, every request has a next action and every change is in the history. Try New request to watch triage happen as you type.",
  },
];

/** 09:00 UTC the day after `now`, formatted for a datetime-local value. */
export function tomorrowNine(now: string): string {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() + 1);
  d.setUTCHours(9, 0, 0, 0);
  return d.toISOString().slice(0, 16);
}
