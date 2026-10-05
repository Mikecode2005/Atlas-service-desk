import assert from "node:assert/strict";
import { test } from "node:test";
import { GUIDE_STEPS, tomorrowNine } from "../src/lib/demoScript";

test("tomorrowNine gives 09:00 UTC on the next day", () => {
  assert.equal(tomorrowNine("2026-10-01T09:06:00.000Z"), "2026-10-02T09:00");
  assert.equal(tomorrowNine("2026-10-31T23:30:00.000Z"), "2026-11-01T09:00");
});

test("guide opens only the assessment requests and starts with a reset step", () => {
  assert.equal(GUIDE_STEPS[0].kind, "intro");
  const open = GUIDE_STEPS.map((s) => s.open).filter(Boolean);
  assert.deepEqual(open, ["R101", "R104", "R102", "R105"]);
});
