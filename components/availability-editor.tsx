"use client";
import { fmt, time } from "@/lib/format";
import type { AppState } from "@/lib/types";
import { Check, Clock3, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
export default function AvailabilityEditor({
  state,
  days,
  dateNav,
  busy,
  action,
}: {
  state: AppState;
  days: string[];
  dateNav: React.ReactNode;
  busy: boolean;
  action: (d: Record<string, unknown>, message?: string) => Promise<boolean>;
}) {
  const [draft, setDraft] = useState<
    Record<string, { available: boolean; start: number; end: number }>
  >({});
  useEffect(() => {
    const v: typeof draft = {};
    for (const date of days) {
      const a = state.availability.find(
        (a) => a.userId === state.user.id && a.date === date,
      );
      v[date] = { available: !!a, start: a?.start || 9, end: a?.end || 21 };
    }
    setDraft(v);
  }, [days, state.availability, state.user.id]);
  const update = (
    date: string,
    patch: Partial<{ available: boolean; start: number; end: number }>,
  ) => setDraft((v) => ({ ...v, [date]: { ...v[date], ...patch } }));
  return (
    <section className="surface availability-editor">
      <div className="section-heading">
        <h2>Моя доступность</h2>
        {dateNav}
      </div>
      <div className="info-banner compact">
        <Clock3 size={19} />
        <p>
          Доступность — это время, когда вы можете работать. Она не назначает
          смену автоматически.
        </p>
      </div>
      <div className="availability-list">
        {days.map((date) => {
          const d = draft[date] || { available: false, start: 9, end: 21 };
          return (
            <div
              className={`availability-day ${d.available ? "available" : ""}`}
              key={date}
            >
              <div className="availability-date">
                <strong>{fmt(date, "EEEE")}</strong>
                <span>{fmt(date, "d MMMM")}</span>
              </div>
              <label className="switch-label">
                <input
                  type="checkbox"
                  checked={d.available}
                  onChange={(e) =>
                    update(date, { available: e.target.checked })
                  }
                />
                <span className="switch" />
                {d.available ? "Могу работать" : "Выходной"}
              </label>
              <div className="availability-times">
                <label>
                  С{" "}
                  <select
                    aria-label={`Начало ${date}`}
                    disabled={!d.available}
                    value={d.start}
                    onChange={(e) =>
                      update(date, { start: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 15 }, (_, i) => (
                      <option key={i} value={i + 8}>
                        {time(i + 8)}
                      </option>
                    ))}
                  </select>
                </label>
                <span>—</span>
                <label>
                  До{" "}
                  <select
                    aria-label={`Конец ${date}`}
                    disabled={!d.available}
                    value={d.end}
                    onChange={(e) =>
                      update(date, { end: Number(e.target.value) })
                    }
                  >
                    {Array.from({ length: 15 }, (_, i) => (
                      <option key={i} value={i + 9}>
                        {time(i + 9)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          );
        })}
      </div>
      <div className="availability-bottom">
        <span>
          <ShieldCheck size={16} />
          Изменения увидит менеджер
        </span>
        <button
          className="button primary"
          disabled={busy}
          onClick={() =>
            action(
              {
                action: "availability",
                days: days.map((date) => ({ date, ...draft[date] })),
              },
              "Доступность сохранена. Менеджер получил уведомление.",
            )
          }
        >
          <Check size={17} />
          Сохранить доступность
        </button>
      </div>
    </section>
  );
}
