import { test } from "node:test";
import assert from "node:assert/strict";
import { stamp } from "../lib/format";
test("audit event timestamps use restaurant timezone", () => {
  assert.ok(stamp("2026-11-17T00:00:00.000Z").includes("05:00"));
});
