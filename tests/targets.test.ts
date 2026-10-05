import assert from "node:assert/strict";
import { test } from "node:test";
import { escalations, targetInfo } from "../src/lib/targets";
import { matchesQuery, suggestTechnician, techLoadScore, type RequestDTO } from "../src/lib/view";

const mk = (over: Partial<RequestDTO>): RequestDTO => ({
  id: "R1", customerId: "C01", channel: "Email", message: "Cold-room unit keeps stopping.", receivedAt: "2026-09-30T16:10:00.000Z",
  category: "cold-room", intent: "fault", priority: "CRITICAL", priorityReason: "", missingInfo: [], status: "TRIAGED",
  technicianId: null, scheduledFor: null, duplicateOfId: null, duplicateSuggestedId: null, duplicateReason: null, events: [], ...over,
});
const NOW = "2026-10-01T09:00:00.000Z";

test("unassigned critical request 16h50m old is overdue by 15h 50m against a 1h target", () => {
  const info = targetInfo(mk({}), NOW);
  assert.equal(info.state, "overdue");
  assert.equal(info.label, "Overdue by 15h 50m");
});

test("target clock stops once a technician owns the request", () => {
  assert.equal(targetInfo(mk({ technicianId: "T1", status: "ASSIGNED" }), NOW).state, "met");
  assert.equal(targetInfo(mk({ status: "CLOSED" }), NOW).state, "none");
});

test("high request 25 minutes old is ok; 3h10m old is due soon", () => {
  assert.equal(targetInfo(mk({ priority: "HIGH", receivedAt: "2026-10-01T08:35:00.000Z" }), NOW).state, "ok");
  assert.equal(targetInfo(mk({ priority: "HIGH", receivedAt: "2026-10-01T05:50:00.000Z" }), NOW).state, "due-soon");
});

test("escalations list only overdue critical or high work, worst first", () => {
  const list = escalations(
    [mk({ id: "A", priority: "HIGH", receivedAt: "2026-10-01T02:00:00.000Z" }), mk({ id: "B" }), mk({ id: "C", priority: "LOW", receivedAt: "2026-09-20T00:00:00.000Z" })],
    NOW,
  );
  assert.deepEqual(list.map((e) => e.r.id), ["B", "A"]);
});

test("suggested technician has the lightest weighted load and waiting jobs do not count", () => {
  const techs = [{ id: "T1", name: "T1" }, { id: "T2", name: "T2" }, { id: "T3", name: "T3" }];
  const reqs = [
    mk({ id: "A", priority: "HIGH", technicianId: "T1", status: "ASSIGNED" }),
    mk({ id: "B", priority: "NORMAL", technicianId: "T2", status: "WAITING" }),
    mk({ id: "C", priority: "LOW", technicianId: "T3", status: "IN_PROGRESS" }),
  ];
  assert.equal(techLoadScore(reqs, "T1"), 2);
  assert.equal(techLoadScore(reqs, "T2"), 0);
  assert.equal(suggestTechnician(reqs, techs)?.id, "T2");
  assert.equal(suggestTechnician([], techs)?.id, "T1");
});

test("search matches id, customer, message words and owner", () => {
  const r = mk({ id: "R101", technicianId: "T1", status: "ASSIGNED" });
  for (const q of ["r101", "c01", "cold stopping", "t1", "email", ""]) assert.ok(matchesQuery(r, q), q);
  assert.ok(!matchesQuery(r, "pump"));
});
