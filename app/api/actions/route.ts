import {
  getState,
  id,
  list,
  log,
  notify,
  put,
  remove,
  session,
  transaction,
  users,
} from "@/lib/db";
import { sameOrigin } from "@/lib/http";
import { recommend } from "@/lib/recommend";
import type {
  Availability,
  EmployeeProfile,
  Notification,
  Shift,
  ShiftRequest,
  StaffingNeed,
} from "@/lib/types";
import { NextRequest, NextResponse } from "next/server";
export const runtime = "nodejs";
function assert(ok: unknown, message: string): asserts ok {
  if (!ok) throw Error(message);
}
function date(value: unknown) {
  assert(
    typeof value === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(value) &&
      !Number.isNaN(Date.parse(value)) &&
      new Date(value).toISOString().slice(0, 10) === value,
    "Некорректная дата",
  );
  return value;
}
function interval(b: Record<string, unknown>) {
  const start = Number(b.start),
    end = Number(b.end);
  assert(
    Number.isInteger(start) &&
      Number.isInteger(end) &&
      start >= 8 &&
      end <= 23 &&
      end > start,
    "Укажите интервал с 08:00 до 23:00",
  );
  return { date: date(b.date), start, end };
}
export async function POST(req: NextRequest) {
  const user = session(req.cookies.get("smena_session")?.value);
  if (!user)
    return NextResponse.json({ error: "Нужна авторизация" }, { status: 401 });
  if (!sameOrigin(req))
    return NextResponse.json(
      { error: "Недопустимый источник запроса" },
      { status: 403 },
    );
  try {
    const b = await req.json();
    transaction(() => {
      const manager = () =>
        assert(user.role === "manager", "Доступно только менеджеру");
      const employee = () =>
        assert(user.role === "employee", "Доступно только сотруднику");
      switch (b.action) {
        case "availability": {
          employee();
          assert(
            Array.isArray(b.days) && b.days.length > 0 && b.days.length <= 14,
            "Выберите дни",
          );
          for (const day of b.days) {
            const d = date(day.date);
            const old = list<Availability>("availability").filter(
              (a) => a.userId === user.id && a.date === d,
            );
            for (const a of old) remove("availability", a.id);
            if (day.available) {
              const times = interval(day);
              put("availability", { id: id(), userId: user.id, ...times });
            }
          }
          notify(
            "manager",
            "Обновлена доступность",
            `${user.name} указал(а) доступность на ${b.days.length} дн.`,
          );
          log(user.id, `${user.name}: обновлена доступность`);
          break;
        }
        case "request": {
          employee();
          const times = interval(b);
          assert(
            typeof b.message === "string" &&
              b.message.trim().length >= 3 &&
              b.message.length <= 1000,
            "Добавьте пожелание от 3 до 1000 символов",
          );
          assert(
            ["wish", "dayoff", "swap"].includes(b.kind),
            "Выберите тип запроса",
          );
          put("requests", {
            id: id(),
            userId: user.id,
            ...times,
            kind: b.kind,
            message: b.message.trim(),
            status: "pending",
            createdAt: new Date().toISOString(),
          } as ShiftRequest);
          notify(
            "manager",
            "Новое пожелание",
            `${user.name}: ${b.message.trim()}`,
          );
          log(user.id, `${user.name}: отправлено пожелание`);
          break;
        }
        case "need": {
          manager();
          const times = interval(b);
          assert(
            ["kitchen", "cash", "service"].includes(b.position),
            "Выберите зону",
          );
          assert(
            Number.isInteger(b.count) && b.count >= 0 && b.count <= 20,
            "Потребность: от 0 до 20 сотрудников",
          );
          const needs = list<StaffingNeed>("needs");
          const match = needs.find(
            (n) =>
              n.date === times.date &&
              n.start === times.start &&
              n.end === times.end &&
              n.position === b.position,
          );
          assert(
            !needs.some(
              (n) =>
                n.id !== match?.id &&
                n.date === times.date &&
                n.position === b.position &&
                n.start < times.end &&
                times.start < n.end,
            ),
            "Интервал пересекается с существующей потребностью. Измените существующий интервал.",
          );
          put("needs", {
            id: match?.id || id(),
            ...times,
            position: b.position,
            count: b.count,
          });
          log(user.id, `Изменена потребность: ${times.date}, ${b.count} чел.`);
          break;
        }
        case "assign": {
          manager();
          const times = interval(b);
          assert(
            ["kitchen", "cash", "service"].includes(b.position),
            "Выберите зону",
          );
          const existing = b.shiftId
            ? list<Shift>("shifts").find((s) => s.id === b.shiftId)
            : undefined;
          if (b.shiftId) assert(existing, "Смена для изменения не найдена");
          const need = {
            id: "new",
            ...times,
            position: b.position,
            count: 1,
          } as StaffingNeed;
          const candidates = recommend(
            need,
            list<EmployeeProfile>("employees"),
            users(),
            list<Availability>("availability"),
            list<Shift>("shifts").filter((s) => s.id !== existing?.id),
            list<ShiftRequest>("requests"),
          );
          const candidate = candidates.find(
            (c) => c.employee.userId === b.userId,
          );
          assert(
            candidate?.eligible,
            "Назначение невозможно: проверьте доступность, пересечения и лимиты часов",
          );
          const status = b.offer ? "pending" : "confirmed";
          put("shifts", {
            id: existing?.id || id(),
            userId: b.userId,
            ...times,
            position: b.position,
            status,
            note: String(b.note || "").slice(0, 500),
          } as Shift);
          if (existing && existing.userId !== b.userId)
            notify(
              existing.userId,
              "Изменение расписания",
              `Ваша смена ${existing.date} передана другому сотруднику.`,
            );
          notify(
            b.userId,
            existing
              ? "Ваша смена изменена"
              : b.offer
                ? "Предложение новой смены"
                : "Вам назначена смена",
            `${times.date}, ${times.start}:00–${times.end}:00. ${b.offer ? "Подтвердите или отклоните предложение." : "Смена подтверждена менеджером."}`,
          );
          log(
            user.id,
            `${existing ? "Изменена" : b.offer ? "Предложена" : "Назначена"} смена: ${candidate.user.name}, ${times.date}, ${times.start}:00–${times.end}:00`,
          );
          break;
        }
        case "shift-response": {
          employee();
          const shift = list<Shift>("shifts").find((s) => s.id === b.id);
          assert(
            shift && shift.userId === user.id && shift.status === "pending",
            "Предложение недоступно",
          );
          assert(typeof b.accept === "boolean", "Выберите ответ");
          if (b.accept) {
            const others = list<Shift>("shifts").filter(
              (s) => s.id !== shift.id,
            );
            const c = recommend(
              { ...shift, count: 1 },
              list<EmployeeProfile>("employees"),
              users(),
              list<Availability>("availability"),
              others,
              list<ShiftRequest>("requests"),
            ).find((c) => c.user.id === user.id);
            assert(
              c?.eligible,
              "Смена больше не соответствует доступности или лимиту часов. Свяжитесь с менеджером.",
            );
            put("shifts", { ...shift, status: "confirmed" });
          } else remove("shifts", shift.id);
          notify(
            "manager",
            b.accept ? "Смена принята" : "Смена отклонена",
            `${user.name}, ${shift.date}, ${shift.start}:00–${shift.end}:00`,
          );
          log(
            user.id,
            `${user.name} ${b.accept ? "принял(а)" : "отклонил(а)"} смену ${shift.date}`,
          );
          break;
        }
        case "request-response": {
          manager();
          const r = list<ShiftRequest>("requests").find((r) => r.id === b.id);
          assert(r && r.status === "pending", "Запрос уже обработан");
          assert(typeof b.accept === "boolean", "Выберите решение");
          put("requests", { ...r, status: b.accept ? "approved" : "declined" });
          if (b.accept) {
            const e = list<EmployeeProfile>("employees").find(
              (e) => e.userId === r.userId,
            );
            if (e) put("employees", { ...e, fulfilled: e.fulfilled + 1 });
          }
          notify(
            r.userId,
            b.accept ? "Пожелание принято" : "Ответ на пожелание",
            `${r.date}: ${b.accept ? "Менеджер учёл ваше пожелание. Изменения смен согласуются отдельно." : "Менеджер отклонил пожелание. Уточните детали лично."}`,
          );
          log(
            user.id,
            `${b.accept ? "Принято" : "Отклонено"} пожелание ${users().find((u) => u.id === r.userId)?.name}`,
          );
          break;
        }
        case "cancel-shift": {
          manager();
          const shift = list<Shift>("shifts").find((s) => s.id === b.id);
          assert(shift, "Смена не найдена");
          remove("shifts", shift.id);
          notify(
            shift.userId,
            "Смена отменена",
            `${shift.date}, ${shift.start}:00–${shift.end}:00`,
          );
          log(
            user.id,
            `Отменена смена ${shift.date} (${users().find((u) => u.id === shift.userId)?.name})`,
          );
          break;
        }
        case "read": {
          for (const n of list<Notification>("notifications").filter(
            (n) => n.userId === user.id && !n.read,
          ))
            put("notifications", { ...n, read: true });
          break;
        }
        case "publish": {
          manager();
          const shifts = list<Shift>("shifts").filter(
            (s) =>
              s.date >= date(b.from) &&
              s.date <= date(b.to) &&
              s.status === "confirmed",
          );
          assert(shifts.length, "Нет подтверждённых смен для публикации");
          for (const uid of new Set(shifts.map((s) => s.userId)))
            notify(
              uid,
              "Расписание опубликовано",
              `Ваши подтверждённые смены с ${b.from} по ${b.to} доступны в разделе «Мои смены».`,
            );
          log(
            user.id,
            `Опубликовано расписание ${b.from} — ${b.to}: ${shifts.length} смен`,
          );
          break;
        }
        default:
          throw Error("Неизвестное действие");
      }
    });
    return NextResponse.json(getState(user));
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error ? e.message : "Не удалось сохранить изменения",
      },
      { status: 400 },
    );
  }
}
