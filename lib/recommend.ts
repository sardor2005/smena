import type {
  Availability,
  EmployeeProfile,
  Shift,
  ShiftRequest,
  StaffingNeed,
  User,
} from "./types";
export function overlaps(
  a: { start: number; end: number },
  b: { start: number; end: number },
) {
  return a.start < b.end && b.start < a.end;
}
export function weekBounds(date: string) {
  const d = new Date(`${date}T12:00:00Z`);
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day);
  const start = d.toISOString().slice(0, 10);
  d.setUTCDate(d.getUTCDate() + 7);
  return [start, d.toISOString().slice(0, 10)];
}
export function weeklyHours(shifts: Shift[], userId: string, date: string) {
  const [from, to] = weekBounds(date);
  return shifts
    .filter((s) => s.userId === userId && s.date >= from && s.date < to)
    .reduce((n, s) => n + s.end - s.start, 0);
}
export function recommend(
  need: StaffingNeed,
  employees: EmployeeProfile[],
  users: User[],
  availability: Availability[],
  shifts: Shift[],
  requests: ShiftRequest[],
) {
  return employees
    .filter((e) => e.position === need.position)
    .map((e) => {
      const own = shifts.filter((s) => s.userId === e.userId);
      const hours = weeklyHours(shifts, e.userId, need.date);
      const available = availability.some(
        (a) =>
          a.userId === e.userId &&
          a.date === need.date &&
          a.start <= need.start &&
          a.end >= need.end,
      );
      const conflict = own.some(
        (s) => s.date === need.date && overlaps(s, need),
      );
      const rest = own.some((s) => {
        const end = new Date(`${s.date}T00:00:00Z`).getTime() + s.end * 3600000;
        const start =
          new Date(`${need.date}T00:00:00Z`).getTime() + need.start * 3600000;
        const newEnd =
          new Date(`${need.date}T00:00:00Z`).getTime() + need.end * 3600000;
        const oldStart =
          new Date(`${s.date}T00:00:00Z`).getTime() + s.start * 3600000;
        return (
          (start >= end && start - end < 11 * 3600000) ||
          (oldStart >= newEnd && oldStart - newEnd < 11 * 3600000)
        );
      });
      const dailyHours = own
        .filter((s) => s.date === need.date)
        .reduce((sum, s) => sum + s.end - s.start, 0);
      const over =
        hours + need.end - need.start > e.maxHours ||
        dailyHours + need.end - need.start > 12;
      const wishes = requests.filter(
        (r) => r.userId === e.userId && r.status === "pending",
      ).length;
      const reasons = [
        "Нужная квалификация",
        available
          ? "Доступен на весь интервал"
          : "Нет доступности на весь интервал",
        `${hours} из ${e.maxHours} ч на неделе`,
        ...(wishes ? ["Есть неучтённые пожелания"] : []),
        ...(conflict ? ["Пересечение со сменой"] : ["Нет пересечений"]),
        ...(rest ? ["Отдых между сменами менее 11 ч"] : []),
        ...(over ? ["Превышен лимит часов"] : []),
      ];
      return {
        employee: e,
        user: users.find((u) => u.id === e.userId)!,
        hours,
        eligible: available && !conflict && !rest && !over,
        score: 100 - hours + wishes * 5 - e.fulfilled * 2,
        reasons,
      };
    })
    .sort(
      (a, b) => Number(b.eligible) - Number(a.eligible) || b.score - a.score,
    );
}
export function coverage(need: StaffingNeed, shifts: Shift[]) {
  let min = Infinity;
  for (let h = need.start; h < need.end; h++)
    min = Math.min(
      min,
      shifts.filter(
        (s) =>
          s.status === "confirmed" &&
          s.position === need.position &&
          s.date === need.date &&
          s.start <= h &&
          s.end >= h + 1,
      ).length,
    );
  return min === Infinity ? 0 : min;
}
/** Existing assignments can become invalid after an employee changes availability. */
export function shiftIssues(
  shift: Shift,
  availability: Availability[],
  shifts: Shift[],
) {
  const issues: string[] = [];
  if (
    !availability.some(
      (a) =>
        a.userId === shift.userId &&
        a.date === shift.date &&
        a.start <= shift.start &&
        a.end >= shift.end,
    )
  )
    issues.push("Смена вне доступности");
  if (
    shifts.some(
      (s) =>
        s.id !== shift.id &&
        s.userId === shift.userId &&
        s.date === shift.date &&
        overlaps(s, shift),
    )
  )
    issues.push("Пересечение смен");
  return issues;
}
