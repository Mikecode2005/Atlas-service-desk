/**
 * Static demo data - pre-triaged requests as they exist at 09:00 on 1 Oct 2026
 * after the demo seed has run. This allows the technician view to work
 * without a database connection.
 */
import type { BoardData, RequestDTO, TechnicianDTO } from "./view";

export const DEMO_TECHNICIANS: TechnicianDTO[] = [
  { id: "T1", name: "T1" },
  { id: "T2", name: "T2" },
  { id: "T3", name: "T3" },
];

export const DEMO_CUSTOMERS = [
  { id: "C01", name: "Customer C01" },
  { id: "C02", name: "Customer C02" },
  { id: "C03", name: "Customer C03" },
  { id: "C04", name: "Customer C04" },
  { id: "C05", name: "Customer C05" },
  { id: "C06", name: "Customer C06" },
  { id: "C07", name: "Customer C07" },
];

const now = "2026-10-01T09:00:00.000Z";

function evt(id: number, type: string, description: string, createdAt: string) {
  return { id, type, description, createdAt };
}

export const DEMO_REQUESTS: RequestDTO[] = [
  {
    id: "R101",
    customerId: "C01",
    channel: "Email",
    message: "Cold-room unit keeps stopping. Stored goods could be affected.",
    receivedAt: "2026-09-30T16:10:00.000Z",
    category: "cold-room",
    intent: "fault",
    priority: "CRITICAL",
    priorityReason: "The message points to possible impact on stored goods.",
    missingInfo: [],
    status: "TRIAGED",
    technicianId: null,
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(1, "REQUEST_CREATED", "Request received via Email", "2026-09-30T16:10:00.000Z"),
      evt(2, "PRIORITY_CLASSIFIED", "Priority classified as Critical. The message points to possible impact on stored goods.", "2026-09-30T16:11:00.000Z"),
    ],
  },
  {
    id: "R102",
    customerId: "C02",
    channel: "WhatsApp",
    message: "Still waiting for someone to visit about the pump. Can you tell us when the technician is coming?",
    receivedAt: "2026-10-01T08:20:00.000Z",
    category: "pump",
    intent: "followup",
    priority: "HIGH",
    priorityReason: "The customer is waiting on a visit.",
    missingInfo: [],
    status: "ASSIGNED",
    technicianId: "T1",
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(9, "REQUEST_CREATED", "Request received via WhatsApp", "2026-10-01T08:20:00.000Z"),
      evt(10, "PRIORITY_CLASSIFIED", "Priority classified as High. The customer is waiting on a visit.", "2026-10-01T08:21:00.000Z"),
      evt(24, "ASSIGNED", "Assigned to T1", "2026-10-01T08:30:00.000Z"),
    ],
  },
  {
    id: "R103",
    customerId: "C03",
    channel: "Email",
    message: "Please book our routine inspection for next week. Nothing is wrong with the equipment.",
    receivedAt: "2026-09-29T11:30:00.000Z",
    category: "general",
    intent: "routine",
    priority: "LOW",
    priorityReason: "Routine or planned work with no risk indicators.",
    missingInfo: [],
    status: "TRIAGED",
    technicianId: null,
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(5, "REQUEST_CREATED", "Request received via Email", "2026-09-29T11:30:00.000Z"),
      evt(6, "PRIORITY_CLASSIFIED", "Priority classified as Low. Routine or planned work with no risk indicators.", "2026-09-29T11:31:00.000Z"),
    ],
  },
  {
    id: "R104",
    customerId: "C01",
    channel: "Phone",
    message: "Following up on the cold-room fault reported yesterday.",
    receivedAt: "2026-10-01T08:25:00.000Z",
    category: "cold-room",
    intent: "followup",
    priority: "HIGH",
    priorityReason: "The customer is waiting on a visit.",
    missingInfo: [],
    status: "TRIAGED",
    technicianId: null,
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: "R101",
    duplicateReason: "Same customer (C01), same issue type (cold-room), 15h 15m after R101.",
    events: [
      evt(13, "REQUEST_CREATED", "Request received via Phone", "2026-10-01T08:25:00.000Z"),
      evt(14, "PRIORITY_CLASSIFIED", "Priority classified as High. The customer is waiting on a visit.", "2026-10-01T08:26:00.000Z"),
      evt(15, "DUPLICATE_SUGGESTED", "Possible duplicate of R101. Same customer (C01), same issue type (cold-room), 15h 15m after R101.", "2026-10-01T08:26:00.000Z"),
    ],
  },
  {
    id: "R105",
    customerId: "C04",
    channel: "Phone",
    message: "Machine not working. Please call us.",
    receivedAt: "2026-10-01T08:35:00.000Z",
    category: "general",
    intent: "fault",
    priority: "NORMAL",
    priorityReason: "Equipment is reported as faulty or not working.",
    missingInfo: ["Equipment identifier", "Site or exact location", "Operational impact (is it still running?)", "Preferred contact details"],
    status: "NEEDS_INFO",
    technicianId: null,
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(17, "REQUEST_CREATED", "Request received via Phone", "2026-10-01T08:35:00.000Z"),
      evt(18, "PRIORITY_CLASSIFIED", "Priority classified as Normal. Equipment is reported as faulty or not working.", "2026-10-01T08:36:00.000Z"),
    ],
  },
  {
    id: "R106",
    customerId: "C05",
    channel: "Email",
    message: "Any update on the compressor part? We were told it is on order.",
    receivedAt: "2026-09-30T14:00:00.000Z",
    category: "compressor",
    intent: "part",
    priority: "NORMAL",
    priorityReason: "Waiting on a part. No new risk reported.",
    missingInfo: [],
    status: "WAITING",
    technicianId: "T2",
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(3, "REQUEST_CREATED", "Request received via Email", "2026-09-30T14:00:00.000Z"),
      evt(4, "PRIORITY_CLASSIFIED", "Priority classified as Normal. Waiting on a part. No new risk reported.", "2026-09-30T14:01:00.000Z"),
      evt(20, "ASSIGNED", "Assigned to T2", "2026-09-30T14:10:00.000Z"),
      evt(21, "STATUS_CHANGED", "Status changed to Waiting", "2026-09-30T14:12:00.000Z"),
    ],
  },
  {
    id: "R107",
    customerId: "C06",
    channel: "WhatsApp",
    message: "The unit is running again, thank you. You can close this once you have checked.",
    receivedAt: "2026-09-30T14:45:00.000Z",
    category: "general",
    intent: "resolved",
    priority: "LOW",
    priorityReason: "No urgency or risk indicators found.",
    missingInfo: [],
    status: "IN_PROGRESS",
    technicianId: "T3",
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(7, "REQUEST_CREATED", "Request received via WhatsApp", "2026-09-30T14:45:00.000Z"),
      evt(8, "PRIORITY_CLASSIFIED", "Priority classified as Low. No urgency or risk indicators found.", "2026-09-30T14:46:00.000Z"),
      evt(22, "ASSIGNED", "Assigned to T3", "2026-09-30T15:00:00.000Z"),
      evt(23, "STATUS_CHANGED", "Status changed to In Progress", "2026-09-30T15:10:00.000Z"),
    ],
  },
  {
    id: "R108",
    customerId: "C07",
    channel: "Email",
    message: "Please send someone today for a pressure warning.",
    receivedAt: "2026-10-01T08:40:00.000Z",
    category: "pump",
    intent: "fault",
    priority: "HIGH",
    priorityReason: "A warning or alarm was reported.",
    missingInfo: [],
    status: "TRIAGED",
    technicianId: null,
    scheduledFor: null,
    duplicateOfId: null,
    duplicateSuggestedId: null,
    duplicateReason: null,
    events: [
      evt(19, "REQUEST_CREATED", "Request received via Email", "2026-10-01T08:40:00.000Z"),
      evt(20, "PRIORITY_CLASSIFIED", "Priority classified as High. A warning or alarm was reported.", "2026-10-01T08:41:00.000Z"),
    ],
  },
];

export function getStaticBoardData(): BoardData {
  return {
    now,
    requests: DEMO_REQUESTS,
    technicians: DEMO_TECHNICIANS,
    customers: DEMO_CUSTOMERS,
  };
}

export function getTechnicianRequests(technicianId: string): RequestDTO[] {
  return DEMO_REQUESTS.filter(
    (r) => r.technicianId === technicianId && r.status !== "CLOSED" && !r.duplicateOfId
  );
}