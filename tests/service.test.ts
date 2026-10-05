import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createClient as createLibsql } from "@libsql/client";

/** Runs the real service layer against a throwaway SQLite database. */
const dir = mkdtempSync(join(tmpdir(), "atlas-"));
process.env.DATABASE_URL = `file:${join(dir, "test.db")}`;

let db: import("../src/lib/db").Db;

before(async () => {
  const raw = createLibsql({ url: process.env.DATABASE_URL! });
  await raw.executeMultiple(readFileSync(join(__dirname, "init.sql"), "utf8"));
  raw.close();
  const { createClient } = await import("../src/lib/db");
  const { resetDemo } = await import("../src/lib/demo");
  db = createClient();
  await resetDemo(db);
});

after(async () => {
  await db.$disconnect();
});

test("seed produces the 09:00 situation from the plan", async () => {
  const { loadBoard } = await import("../src/lib/service");
  const { isUrgentUnassigned, hasDuplicateSuggestion } = await import("../src/lib/view");
  const board = await loadBoard(db);
  assert.equal(board.requests.length, 8);
  assert.equal(board.now, "2026-10-01T09:00:00.000Z");
  assert.deepEqual(board.requests.filter(isUrgentUnassigned).map((r) => r.id), ["R101", "R105", "R108"]);
  assert.deepEqual(board.requests.filter(hasDuplicateSuggestion).map((r) => r.id), ["R104"]);
});

test("assign, schedule, link duplicate and customer update write an audit trail", async () => {
  const svc = await import("../src/lib/service");
  await svc.assignTechnician(db, "R101", "T1");
  await svc.scheduleVisit(db, "R102", new Date("2026-10-02T09:00:00Z"));
  await svc.linkDuplicate(db, "R104");
  const text = await svc.prepareCustomerUpdate(db, "R102");
  assert.match(text, /Technician T1/);
  assert.match(text, /2 Oct/);

  const board = await svc.loadBoard(db);
  const byId = Object.fromEntries(board.requests.map((r) => [r.id, r]));
  assert.equal(byId.R101.status, "ASSIGNED");
  assert.equal(byId.R104.duplicateOfId, "R101");
  assert.equal(byId.R104.status, "CLOSED");
  assert.equal(byId.R102.status, "SCHEDULED");
  assert.ok(byId.R101.events.some((e) => e.type === "ASSIGNED" && e.createdAt === "2026-10-01T09:02:00.000Z"));
  assert.ok(byId.R101.events.some((e) => e.type === "DUPLICATE_LINKED"));
  assert.equal(board.now, "2026-10-01T09:08:00.000Z");
});

test("new request is triaged and flags a duplicate", async () => {
  const svc = await import("../src/lib/service");
  const id = await svc.createRequest(db, {
    customerId: "C02",
    channel: "Email",
    message: "The pump is not working again. Water is leaking at the plant.",
    receivedAt: new Date("2026-10-01T09:10:00Z"),
  });
  assert.equal(id, "R109");
  const board = await svc.loadBoard(db);
  const r = board.requests.find((x) => x.id === id)!;
  assert.equal(r.priority, "HIGH");
  assert.equal(r.duplicateSuggestedId, "R102");
});

test("scheduling without a technician is rejected", async () => {
  const svc = await import("../src/lib/service");
  await assert.rejects(() => svc.scheduleVisit(db, "R103", new Date("2026-10-08T09:00:00Z")), /Assign a technician/);
});
