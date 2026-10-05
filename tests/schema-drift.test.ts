import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

/**
 * tests/init.sql builds the throwaway database the service tests run on.
 * This guards against it drifting from prisma/schema.prisma.
 */
function prismaColumns(): Record<string, string[]> {
  const src = readFileSync(join(__dirname, "../prisma/schema.prisma"), "utf8");
  const models = [...src.matchAll(/^model (\w+) \{([\s\S]*?)^\}/gm)];
  const names = new Set(models.map((m) => m[1]));
  const out: Record<string, string[]> = {};
  for (const [, name, body] of models) {
    out[name] = body
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith("//") && !l.startsWith("@@"))
      .map((l) => l.match(/^(\w+)\s+(\w+)(\[\]|\?)?/))
      .filter((m): m is RegExpMatchArray => !!m && !names.has(m[2]) && m[3] !== "[]")
      .map((m) => m[1])
      .sort();
  }
  return out;
}

function sqlColumns(): Record<string, string[]> {
  const src = readFileSync(join(__dirname, "init.sql"), "utf8");
  const out: Record<string, string[]> = {};
  for (const [, name, body] of src.matchAll(/CREATE TABLE "(\w+)" \(([\s\S]*?)\n?\);/g)) {
    out[name] = [...body.matchAll(/(?:^\s*|[,(]\s*)"(\w+)"\s+(?:TEXT|INTEGER|DATETIME|BOOLEAN)/g)].map((m) => m[1]).sort();
  }
  return out;
}

test("tests/init.sql has the same tables and columns as prisma/schema.prisma", () => {
  assert.deepEqual(sqlColumns(), prismaColumns());
});
