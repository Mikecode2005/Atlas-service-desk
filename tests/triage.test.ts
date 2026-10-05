import assert from "node:assert/strict";
import { test } from "node:test";
import { findDuplicate, triage } from "../src/lib/triage";

test("R101: possible loss of stored goods is critical and explained", () => {
  const t = triage("Cold-room unit keeps stopping. Stored goods could be affected.");
  assert.equal(t.priority, "CRITICAL");
  assert.equal(t.category, "cold-room");
  assert.match(t.reason, /stored goods/i);
  assert.deepEqual(t.missingInfo, []); // critical work goes straight to a technician
});

test("R104: follow-up on a fault is high priority and a duplicate of R101", () => {
  const t = triage("Following up on the cold-room fault reported yesterday.");
  assert.equal(t.priority, "HIGH");
  assert.equal(t.intent, "followup");
  const dup = findDuplicate(
    { customerId: "C01", category: t.category, receivedAt: "2026-10-01T08:25:00Z" },
    [{ id: "R101", customerId: "C01", category: "cold-room", status: "TRIAGED", receivedAt: "2026-09-30T16:10:00Z", duplicateOfId: null }],
  );
  assert.equal(dup?.id, "R101");
  assert.match(dup?.reason ?? "", /16h 15m/);
});

test("duplicates need the same customer, same known category, and a 48 hour window", () => {
  const base = { id: "R1", customerId: "C01", category: "cold-room", status: "TRIAGED", receivedAt: "2026-09-28T08:00:00Z", duplicateOfId: null };
  const incoming = { customerId: "C01", category: "cold-room", receivedAt: "2026-10-01T08:00:00Z" };
  assert.equal(findDuplicate(incoming, [base]), null); // 72 hours apart
  assert.equal(findDuplicate({ ...incoming, customerId: "C02" }, [{ ...base, receivedAt: "2026-09-30T08:00:00Z" }]), null);
  assert.equal(findDuplicate(incoming, [{ ...base, receivedAt: "2026-09-30T08:00:00Z", status: "CLOSED" }]), null);
  assert.equal(findDuplicate({ ...incoming, category: "general" }, [{ ...base, category: "general", receivedAt: "2026-09-30T08:00:00Z" }]), null);
});

test("R105: vague fault report lists what is missing", () => {
  const t = triage("Machine not working. Please call us.");
  assert.equal(t.priority, "HIGH");
  assert.deepEqual(t.missingInfo, [
    "Equipment identifier",
    "Site or exact location",
    "Operational impact (is it still running?)",
    "Preferred contact details",
  ]);
});

test("R108: pressure warning asked for today is high priority and missing details", () => {
  const t = triage("Please send someone today for a pressure warning.");
  assert.equal(t.priority, "HIGH");
  assert.equal(t.missingInfo.length, 3);
});

test("routine, part and resolved messages are not escalated", () => {
  assert.equal(triage("Please book our routine inspection for next week.").priority, "LOW");
  assert.equal(triage("Any update on the compressor part? We were told it is on order.").priority, "NORMAL");
  assert.equal(triage("The unit is running again, thank you.").priority, "LOW");
});

test('"not working again" is a fault, not a resolution', () => {
  const t = triage("The pump is not working again. Water is leaking at the plant.");
  assert.equal(t.intent, "fault");
  assert.equal(t.priority, "HIGH");
  assert.equal(triage("The unit isn't working again.").intent, "fault");
});
