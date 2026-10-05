/**
 * Data operations. Every coordinator action writes a RequestEvent so the
 * request always carries its own audit trail.
 */
import { currentTime, nextTick } from "./clock";
import type { Db } from "./db";
import { fmtDateTime } from "./format";
import { findDuplicate, triage, type Priority } from "./triage";
import { PRIORITY_LABEL, customerUpdateText, type BoardData, type RequestDTO, type Status } from "./view";

const MINUTE = 60 * 1000;

type RequestWithEvents = Awaited<ReturnType<typeof loadRequests>>[number];

async function loadRequests(db: Db) {
  return db.request.findMany({
    include: { events: { orderBy: [{ createdAt: "asc" }, { id: "asc" }] } },
    orderBy: { id: "asc" },
  });
}

function toDTO(r: RequestWithEvents): RequestDTO {
  return {
    id: r.id,
    customerId: r.customerId,
    channel: r.channel,
    message: r.message,
    receivedAt: r.receivedAt.toISOString(),
    category: r.category,
    intent: r.intent,
    priority: r.priority as Priority,
    priorityReason: r.priorityReason,
    missingInfo: JSON.parse(r.missingInfo) as string[],
    status: r.status as Status,
    technicianId: r.technicianId,
    scheduledFor: r.scheduledFor?.toISOString() ?? null,
    duplicateOfId: r.duplicateOfId,
    duplicateSuggestedId: r.duplicateSuggestedId,
    duplicateReason: r.duplicateReason,
    events: r.events.map((e) => ({ id: e.id, type: e.type, description: e.description, createdAt: e.createdAt.toISOString() })),
  };
}

async function latestEventTime(db: Db): Promise<Date | null> {
  const agg = await db.requestEvent.aggregate({ _max: { createdAt: true } });
  return agg._max.createdAt;
}

async function stamp(db: Db, at?: Date): Promise<Date> {
  return at ?? nextTick(await latestEventTime(db));
}

export async function loadBoard(db: Db): Promise<BoardData> {
  const [requests, technicians, customers, latest] = await Promise.all([
    loadRequests(db),
    db.technician.findMany({ where: { active: true }, orderBy: { id: "asc" } }),
    db.customer.findMany({ orderBy: { id: "asc" } }),
    latestEventTime(db),
  ]);
  return {
    now: currentTime(latest).toISOString(),
    requests: requests.map(toDTO),
    technicians: technicians.map((t) => ({ id: t.id, name: t.name })),
    customers: customers.map((c) => ({ id: c.id, name: c.name })),
  };
}

async function nextRequestId(db: Db): Promise<string> {
  const all = await db.request.findMany({ select: { id: true } });
  const max = all.reduce((m, r) => Math.max(m, Number(r.id.slice(1)) || 0), 100);
  return `R${max + 1}`;
}

export interface NewRequestInput {
  id?: string;
  customerId: string;
  channel: string;
  message: string;
  receivedAt: Date;
}

export async function createRequest(db: Db, input: NewRequestInput): Promise<string> {
  const message = input.message.trim();
  if (!message) throw new Error("Message is required");
  const result = triage(message);
  const others = await db.request.findMany({ where: { customerId: input.customerId } });
  const dup = findDuplicate({ customerId: input.customerId, category: result.category, receivedAt: input.receivedAt }, others);
  const id = input.id ?? (await nextRequestId(db));
  const classifiedAt = new Date(input.receivedAt.getTime() + MINUTE);

  const events = [
    { type: "REQUEST_CREATED", description: `Request received via ${input.channel}`, createdAt: input.receivedAt },
    {
      type: "PRIORITY_CLASSIFIED",
      description: `Priority classified as ${PRIORITY_LABEL[result.priority]}. ${result.reason}`,
      createdAt: classifiedAt,
    },
  ];
  if (dup) events.push({ type: "DUPLICATE_SUGGESTED", description: `Possible duplicate of ${dup.id}. ${dup.reason}`, createdAt: classifiedAt });
  if (result.missingInfo.length) {
    events.push({ type: "MISSING_INFO", description: `Missing information: ${result.missingInfo.join(", ")}`, createdAt: classifiedAt });
  }

  await db.request.create({
    data: {
      id,
      customerId: input.customerId,
      channel: input.channel,
      message,
      receivedAt: input.receivedAt,
      category: result.category,
      intent: result.intent,
      priority: result.priority,
      priorityReason: result.reason,
      missingInfo: JSON.stringify(result.missingInfo),
      status: result.missingInfo.length ? "NEEDS_INFO" : "TRIAGED",
      duplicateSuggestedId: dup?.id ?? null,
      duplicateReason: dup?.reason ?? null,
      events: { create: events },
    },
  });
  return id;
}

async function mustFind(db: Db, id: string) {
  const r = await db.request.findUnique({ where: { id } });
  if (!r) throw new Error(`Request ${id} not found`);
  return r;
}

export async function assignTechnician(db: Db, id: string, technicianId: string, at?: Date) {
  const r = await mustFind(db, id);
  const tech = await db.technician.findUnique({ where: { id: technicianId } });
  if (!tech) throw new Error(`Technician ${technicianId} not found`);
  const when = await stamp(db, at);
  const promote = ["NEW", "TRIAGED"].includes(r.status);
  await db.request.update({
    where: { id },
    data: {
      technicianId,
      status: promote ? "ASSIGNED" : r.status,
      events: { create: { type: "ASSIGNED", description: `Assigned to ${tech.name}`, createdAt: when } },
    },
  });
}

export async function scheduleVisit(db: Db, id: string, visitAt: Date, at?: Date) {
  const r = await mustFind(db, id);
  if (!r.technicianId) throw new Error("Assign a technician before scheduling a visit");
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      scheduledFor: visitAt,
      status: "SCHEDULED",
      events: { create: { type: "VISIT_SCHEDULED", description: `Visit scheduled for ${fmtDateTime(visitAt)} (UTC) with ${r.technicianId}`, createdAt: when } },
    },
  });
}

const STATUS_LABEL: Record<string, string> = {
  IN_PROGRESS: "In progress",
  WAITING: "Waiting",
  NEEDS_INFO: "Needs info",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
  TRIAGED: "Open",
};

export async function setStatus(db: Db, id: string, status: Status, at?: Date) {
  const r = await mustFind(db, id);
  if (["IN_PROGRESS", "SCHEDULED"].includes(status) && !r.technicianId) throw new Error("Assign a technician first");
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      status,
      events: { create: { type: "STATUS_CHANGED", description: `Status changed to ${STATUS_LABEL[status] ?? status}`, createdAt: when } },
    },
  });
}

export async function markInfoReceived(db: Db, id: string, at?: Date) {
  const r = await mustFind(db, id);
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      missingInfo: "[]",
      status: r.technicianId ? "ASSIGNED" : "TRIAGED",
      events: { create: { type: "INFO_RECEIVED", description: "Customer supplied the missing information", createdAt: when } },
    },
  });
}

export async function changePriority(db: Db, id: string, priority: Priority, at?: Date) {
  const r = await mustFind(db, id);
  if (r.priority === priority) return;
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      priority,
      priorityReason: `Set to ${PRIORITY_LABEL[priority]} by the coordinator.`,
      events: {
        create: {
          type: "PRIORITY_CHANGED",
          description: `Priority changed from ${PRIORITY_LABEL[r.priority as Priority]} to ${PRIORITY_LABEL[priority]}`,
          createdAt: when,
        },
      },
    },
  });
}

export async function linkDuplicate(db: Db, id: string, at?: Date) {
  const r = await mustFind(db, id);
  if (!r.duplicateSuggestedId) throw new Error("No duplicate suggestion to link");
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      duplicateOfId: r.duplicateSuggestedId,
      status: "CLOSED",
      events: { create: { type: "DUPLICATE_LINKED", description: `Linked to ${r.duplicateSuggestedId}; no separate job created`, createdAt: when } },
    },
  });
  await db.requestEvent.create({
    data: { requestId: r.duplicateSuggestedId, type: "DUPLICATE_LINKED", description: `${id} linked as a follow-up to this request`, createdAt: when },
  });
}

export async function keepSeparate(db: Db, id: string, at?: Date) {
  const r = await mustFind(db, id);
  const when = await stamp(db, at);
  await db.request.update({
    where: { id },
    data: {
      duplicateSuggestedId: null,
      duplicateReason: null,
      events: { create: { type: "DUPLICATE_DISMISSED", description: `Kept separate from ${r.duplicateSuggestedId}`, createdAt: when } },
    },
  });
}

/** Builds the update text and logs that the coordinator prepared it. Nothing is sent. */
export async function prepareCustomerUpdate(db: Db, id: string, at?: Date): Promise<string> {
  const board = await loadRequests(db);
  const r = board.find((x) => x.id === id);
  if (!r) throw new Error(`Request ${id} not found`);
  const dto = toDTO(r);
  const when = await stamp(db, at);
  const asksForInfo = dto.status === "NEEDS_INFO";
  await db.requestEvent.create({
    data: {
      requestId: id,
      type: asksForInfo ? "INFO_REQUESTED" : "CUSTOMER_UPDATED",
      description: asksForInfo ? "Information request prepared for customer" : "Customer update prepared",
      createdAt: when,
    },
  });
  return customerUpdateText(dto);
}
