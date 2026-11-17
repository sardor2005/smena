"use client";
import { fmt, time } from "@/lib/format";
import type { AppState, EmployeeProfile, Shift } from "@/lib/types";
import { positions } from "@/lib/types";
import { Avatar } from "./ui";
export default function DayView({
  state,
  employees,
  day,
  setDay,
  days,
  onShift,
  onEmployee,
  filter,
}: {
  state: AppState;
  employees: EmployeeProfile[];
  day: string;
  setDay: (d: string) => void;
  days: string[];
  onShift: (s: Shift) => void;
  onEmployee: (e: EmployeeProfile) => void;
  filter: string;
}) {
  const hours = Array.from({ length: 16 }, (_, i) => i + 8);
  return (
    <>
      <div className="day-picker">
        {days.map((d) => (
          <button
            key={d}
            className={d === day ? "selected" : ""}
            onClick={() => setDay(d)}
          >
            {fmt(d, "EEEEEE, d")}
          </button>
        ))}
      </div>
      <div className="calendar-scroll">
        <div className="day-timeline">
          <div className="timeline-header">
            <span>Сотрудник</span>
            <div>
              {hours.map((h) => (
                <span key={h}>{time(h)}</span>
              ))}
            </div>
          </div>
          {employees.map((e) => (
            <div className="timeline-person" key={e.userId}>
              <button className="employee-cell" onClick={() => onEmployee(e)}>
                <Avatar employee={e} />
                <span>
                  <strong>
                    {state.users.find((u) => u.id === e.userId)?.name}
                  </strong>
                  <small>{positions[e.position].name}</small>
                </span>
              </button>
              <div className="timeline-track">
                {hours.slice(0, -1).map((h) => (
                  <i key={h} />
                ))}
                {state.shifts
                  .filter(
                    (s) =>
                      s.date === day &&
                      s.userId === e.userId &&
                      (filter === "all" || s.status === filter),
                  )
                  .map((s) => (
                    <button
                      key={s.id}
                      className={`timeline-shift ${s.position} ${s.status}`}
                      style={{
                        left: `${((s.start - 8) / 15) * 100}%`,
                        width: `${((s.end - s.start) / 15) * 100}%`,
                      }}
                      onClick={() => onShift(s)}
                    >
                      <strong>
                        {time(s.start)} — {time(s.end)}
                      </strong>
                      <span>
                        {positions[s.position].name} ·{" "}
                        {s.status === "confirmed" ? "Подтверждено" : "Ожидает"}
                      </span>
                    </button>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
