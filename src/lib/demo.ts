/**
 * Seed data for the assessment scenario: eight requests (R101 to R108) from
 * customers C01 to C07, with technicians T1 to T3 available at 09:00 on 1 Oct 2026.
 *
 * ASSUMPTION: the brief supplied request IDs, customers and the situation of
 * each request. The wording of the messages below is written to match that
 * situation. Replace `message` with the exact text from the brief if it differs.
 */
import type { Db } from "./db";
import { assignTechnician, createRequest, setStatus } from "./service";

const t = (iso: string) => new Date(`${iso}:00Z`);

const REQUESTS = [
  { id: "R103", customerId: "C03", channel: "Email", at: "2026-09-29T11:30", message: "Please book our routine inspection for next week. Nothing is wrong with the equipment." },
  { id: "R106", customerId: "C05", channel: "Email", at: "2026-09-30T14:00", message: "Any update on the compressor part? We were told it is on order." },
  { id: "R107", customerId: "C06", channel: "WhatsApp", at: "2026-09-30T14:45", message: "The unit is running again, thank you. You can close this once you have checked." },
  { id: "R101", customerId: "C01", channel: "Email", at: "2026-09-30T16:10", message: "Cold-room unit keeps stopping. Stored goods could be affected." },
  { id: "R102", customerId: "C02", channel: "WhatsApp", at: "2026-10-01T08:20", message: "Still waiting for someone to visit about the pump. Can you tell us when the technician is coming?" },
  { id: "R104", customerId: "C01", channel: "Phone", at: "2026-10-01T08:25", message: "Following up on the cold-room fault reported yesterday." },
  { id: "R105", customerId: "C04", channel: "Phone", at: "2026-10-01T08:35", message: "Machine not working. Please call us." },
  { id: "R108", customerId: "C07", channel: "Email", at: "2026-10-01T08:40", message: "Please send someone today for a pressure warning." },
];

export async function resetDemo(db: Db): Promise<void> {
  await db.requestEvent.deleteMany();
  await db.request.updateMany({ data: { duplicateOfId: null } });
  await db.request.deleteMany();
  await db.technician.deleteMany();
  await db.customer.deleteMany();

  await db.customer.createMany({
    data: ["C01", "C02", "C03", "C04", "C05", "C06", "C07"].map((id) => ({ id, name: `Customer ${id}` })),
  });
  await db.technician.createMany({ data: ["T1", "T2", "T3"].map((id) => ({ id, name: id, active: true })) });

  for (const r of REQUESTS) {
    await createRequest(db, { id: r.id, customerId: r.customerId, channel: r.channel, message: r.message, receivedAt: t(r.at) });
  }

  // Work already under way before the coordinator opens the dashboard at 09:00.
  await assignTechnician(db, "R106", "T2", t("2026-09-30T14:10"));
  await setStatus(db, "R106", "WAITING", t("2026-09-30T14:12"));
  await assignTechnician(db, "R107", "T3", t("2026-09-30T15:00"));
  await setStatus(db, "R107", "IN_PROGRESS", t("2026-09-30T15:10"));
  await assignTechnician(db, "R102", "T1", t("2026-10-01T08:30"));
}
