import { test } from "node:test";
import assert from "node:assert/strict";
import { coverage, overlaps, recommend, weeklyHours } from "../lib/recommend";
import type {
  Availability,
  EmployeeProfile,
  Shift,
  StaffingNeed,
  User,
} from "../lib/types";
const employees: EmployeeProfile[] = [
  {
    userId: "a",
    position: "kitchen",
    initials: "AA",
    color: "#fff",
    maxHours: 40,
    fulfilled: 0,
  },
  {
    userId: "b",
    position: "cash",
    initials: "BB",
    color: "#fff",
    maxHours: 40,
    fulfilled: 0,
  },
];
const users: User[] = employees.map((e) => ({
  id: e.userId,
  name: e.userId,
  email: e.userId + "@test.local",
  role: "employee",
}));
const need: StaffingNeed = {
  id: "need",
  date: "2026-11-18",
  start: 9,
  end: 15,
  position: "kitchen",
  count: 2,
};
const availability: Availability[] = [
  { id: "avail", userId: "a", date: need.date, start: 8, end: 23 },
];
const shift = (patch: Partial<Shift> = {}): Shift => ({
  id: "shift",
  userId: "a",
  date: need.date,
  start: 9,
  end: 15,
  position: "kitchen",
  status: "confirmed",
  note: "",
  ...patch,
});
test("recommends only matching qualification and explains eligibility", () => {
  const result = recommend(need, employees, users, availability, [], []);
  assert.equal(result.length, 1);
  assert.equal(result[0].eligible, true);
  assert.ok(result[0].reasons.includes("Доступен на весь интервал"));
});
test("requires availability for the full interval", () => {
  assert.equal(
    recommend(
      need,
      employees,
      users,
      [{ ...availability[0], start: 10 }],
      [],
      [],
    )[0].eligible,
    false,
  );
});
test("pending offers reserve time and reject overlaps", () => {
  assert.equal(
    recommend(
      need,
      employees,
      users,
      availability,
      [shift({ status: "pending" })],
      [],
    )[0].eligible,
    false,
  );
});
test("enforces eleven hours rest across adjacent dates", () => {
  assert.equal(
    recommend(
      need,
      employees,
      users,
      availability,
      [shift({ date: "2026-11-17", start: 17, end: 23 })],
      [],
    )[0].eligible,
    false,
  );
});
test("enforces weekly hours and counts only selected week", () => {
  const shifts = Array.from({ length: 5 }, (_, i) =>
    shift({ id: String(i), date: `2026-11-${16 + i}`, start: 8, end: 16 }),
  );
  assert.equal(weeklyHours(shifts, "a", need.date), 40);
  assert.equal(
    recommend(need, employees, users, availability, shifts, [])[0].eligible,
    false,
  );
  assert.equal(weeklyHours([shift({ date: "2026-11-09" })], "a", need.date), 0);
});
test("ranks employees with less assigned work first", () => {
  const peers = [employees[0], { ...employees[0], userId: "b" }];
  const av = [...availability, { ...availability[0], id: "b", userId: "b" }];
  const results = recommend(
    need,
    peers,
    users,
    av,
    [shift({ date: "2026-11-16" })],
    [],
  );
  assert.equal(results[0].user.id, "b");
});
test("coverage uses lowest hourly staffing, excludes pending offers", () => {
  assert.equal(
    coverage(need, [
      shift(),
      shift({ id: "2", userId: "b", start: 12, end: 18 }),
    ]),
    1,
  );
  assert.equal(coverage(need, [shift({ status: "pending" })]), 0);
  assert.equal(coverage(need, [shift({ end: 12 })]), 0);
});
test("adjacent shifts do not overlap", () => {
  assert.equal(overlaps({ start: 9, end: 15 }, { start: 15, end: 21 }), false);
  assert.equal(overlaps({ start: 9, end: 16 }, { start: 15, end: 21 }), true);
});

test("flags a previously assigned shift after availability changes", async () => {
  const { shiftIssues } = await import("../lib/recommend");
  assert.deepEqual(shiftIssues(shift(), availability, [shift()]), []);
  assert.deepEqual(shiftIssues(shift(), [], [shift()]), [
    "Смена вне доступности",
  ]);
});
