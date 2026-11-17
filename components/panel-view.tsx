"use client";
import { fmt, time } from "@/lib/format";
import { recommend, shiftIssues, weeklyHours } from "@/lib/recommend";
import type { AppState, Position, Shift } from "@/lib/types";
import { positions } from "@/lib/types";
import type { Panel } from "@/lib/ui-types";
import { addDays, format, parseISO } from "date-fns";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Command,
  Loader2,
  MessageSquare,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Avatar, Badge } from "./ui";
export default function PanelView({
  panel,
  state,
  week,
  close,
  action,
  busy,
  notify,
  onEdit,
}: {
  panel: NonNullable<Panel>;
  state: AppState;
  week: string;
  close: () => void;
  action: (d: Record<string, unknown>, message?: string) => Promise<boolean>;
  busy: boolean;
  notify: (s: string, error?: boolean) => void;
  onEdit: (s: Shift) => void;
}) {
  const ref = useRef<HTMLDivElement>(null),
    previous = useRef<HTMLElement | null>(null);
  const initial =
    panel.kind === "assign" || panel.kind === "need" ? panel.need : undefined;
  const [date, setDate] = useState(initial?.date || state.today),
    [start, setStart] = useState(initial?.start || 9),
    [end, setEnd] = useState(initial?.end || 15),
    [position, setPosition] = useState<Position>(
      initial?.position || "kitchen",
    ),
    [count, setCount] = useState(initial?.count ?? 2),
    [selected, setSelected] = useState(
      panel.kind === "assign" ? panel.existing?.userId || "" : "",
    ),
    [offer, setOffer] = useState(true),
    [note, setNote] = useState(
      panel.kind === "assign" ? panel.existing?.note || "" : "",
    ),
    [kind, setKind] = useState("wish"),
    [confirm, setConfirm] = useState(false),
    [cancelConfirm, setCancelConfirm] = useState(false);
  useEffect(() => {
    previous.current = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    ref.current?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
      if (e.key === "Tab" && ref.current) {
        const all = ref.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
        );
        const first = all[0],
          last = all[all.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener("keydown", handle);
      previous.current?.focus();
    };
  }, [close]);
  const validDate =
    /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const candidates =
    panel.kind === "assign" && validDate && end > start
      ? recommend(
          { id: "draft", date, start, end, position, count: 1 },
          state.employees,
          state.users,
          state.availability,
          state.shifts.filter((s) => s.id !== panel.existing?.id),
          state.requests,
        )
      : [];
  const titles = {
    shift: "Детали смены",
    employee: "Профиль сотрудника",
    assign: "Соберём смену",
    need: "Потребность ресторана",
    request: "Ваше пожелание",
    help: "Как устроена Смена",
  };
  const currentShift =
    panel.kind === "shift"
      ? state.shifts.find((s) => s.id === panel.shift.id)
      : undefined;
  const save = async () => {
    let ok = false;
    if (panel.kind === "assign") {
      if (!selected) {
        notify("Выберите сотрудника", true);
        return;
      }
      ok = await action(
        {
          action: "assign",
          shiftId: panel.existing?.id,
          date,
          start,
          end,
          position,
          userId: selected,
          offer,
          note,
        },
        offer
          ? "Предложение отправлено сотруднику"
          : "Смена назначена. Сотрудник уведомлён.",
      );
    }
    if (panel.kind === "need")
      ok = await action(
        { action: "need", date, start, end, position, count },
        "Потребность обновлена",
      );
    if (panel.kind === "request")
      ok = await action(
        { action: "request", date, start, end, kind, message: note },
        "Пожелание отправлено менеджеру",
      );
    if (ok) close();
  };
  return (
    <>
      <motion.div
        className="panel-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
      />
      <motion.div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="panel-title"
        className={`side-panel ${panel.kind === "help" ? "help-panel" : ""}`}
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 32, stiffness: 330 }}
      >
        <div className="panel-top">
          <span className="eyebrow">
            СМЕНА ·{" "}
            {panel.kind === "assign"
              ? "УМНОЕ ПЛАНИРОВАНИЕ"
              : "РАБОЧЕЕ ПРОСТРАНСТВО"}
          </span>
          <button
            className="icon-button"
            aria-label="Закрыть панель"
            onClick={close}
          >
            <X size={21} />
          </button>
        </div>
        <h2 id="panel-title">
          {confirm ? "Проверим перед отправкой" : titles[panel.kind]}
          <span className="orange-dot">.</span>
        </h2>
        <div className="panel-content">
          {(panel.kind === "assign" ||
            panel.kind === "need" ||
            panel.kind === "request") && (
            <>
              {confirm ? (
                <div className="confirm-content">
                  <span className="confirm-check">
                    <Send size={28} />
                  </span>
                  <h3>
                    {offer
                      ? "Отправить предложение?"
                      : "Подтвердить назначение?"}
                  </h3>
                  <p>{state.users.find((u) => u.id === selected)?.name}</p>
                  <div className="confirmation-summary">
                    <span>{fmt(date, "EEEE, d MMMM")}</span>
                    <strong>
                      {time(start)} — {time(end)}
                    </strong>
                    <span className={`zone-label ${position}`}>
                      {positions[position].name}
                    </span>
                  </div>
                  <p className="muted">
                    {offer
                      ? "Сотрудник сможет принять или отклонить смену. До ответа она останется в статусе ожидания."
                      : "Смена появится в расписании как подтверждённая. Сотрудник получит уведомление."}
                  </p>
                  <button
                    className="text-button"
                    onClick={() => setConfirm(false)}
                  >
                    <ArrowLeft size={15} />
                    Вернуться к выбору
                  </button>
                </div>
              ) : (
                <>
                  <p className="panel-description">
                    {panel.kind === "assign"
                      ? "Задайте интервал — подскажем, кто подходит лучше."
                      : panel.kind === "need"
                        ? "Сколько сотрудников нужно для комфортной работы ресторана?"
                        : "Расскажите менеджеру о своих планах. Финальное решение он примет с учётом команды."}
                  </p>
                  {panel.kind === "request" && (
                    <label className="form-label">
                      Тип пожелания
                      <select
                        value={kind}
                        onChange={(e) => setKind(e.target.value)}
                      >
                        <option value="wish">Пожелание по графику</option>
                        <option value="dayoff">Выходной</option>
                        <option value="swap">Замена смены</option>
                      </select>
                    </label>
                  )}
                  <label className="form-label">
                    Дата
                    <input
                      required
                      type="date"
                      value={date}
                      onChange={(e) => {
                        setDate(e.target.value);
                        setSelected("");
                      }}
                    />
                  </label>
                  <div className="form-row">
                    <label className="form-label">
                      Начало
                      <select
                        value={start}
                        onChange={(e) => {
                          setStart(Number(e.target.value));
                          setSelected("");
                        }}
                      >
                        {Array.from({ length: 15 }, (_, i) => (
                          <option key={i} value={i + 8}>
                            {time(i + 8)}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="form-label">
                      Конец
                      <select
                        value={end}
                        onChange={(e) => {
                          setEnd(Number(e.target.value));
                          setSelected("");
                        }}
                      >
                        {Array.from({ length: 15 }, (_, i) => (
                          <option key={i} value={i + 9}>
                            {time(i + 9)}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>
                  {end <= start && (
                    <div className="form-error">
                      Окончание должно быть позже начала
                    </div>
                  )}
                  {panel.kind !== "request" && (
                    <label className="form-label">
                      Зона ресторана
                      <select
                        value={position}
                        onChange={(e) => {
                          setPosition(e.target.value as Position);
                          setSelected("");
                        }}
                      >
                        {Object.entries(positions).map(([p, v]) => (
                          <option key={p} value={p}>
                            {v.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {panel.kind === "need" && (
                    <label className="form-label">
                      Сотрудников на интервал
                      <input
                        type="number"
                        min={0}
                        max={20}
                        value={count}
                        onChange={(e) => setCount(Number(e.target.value))}
                      />
                    </label>
                  )}
                  {panel.kind === "assign" && (
                    <>
                      <div className="candidates-heading">
                        <h3>
                          <Sparkles size={17} />
                          Подходящие сотрудники
                        </h3>
                        <span>
                          {candidates.filter((c) => c.eligible).length} доступны
                        </span>
                      </div>
                      <p className="candidate-explanation">
                        Сначала — доступные сотрудники с меньшей нагрузкой и
                        неучтёнными пожеланиями.
                      </p>
                      <div className="candidates">
                        {candidates.map((c, i) => (
                          <button
                            className={`candidate ${selected === c.user.id ? "selected" : ""} ${!c.eligible ? "ineligible" : ""}`}
                            disabled={!c.eligible || end <= start}
                            onClick={() => setSelected(c.user.id)}
                            key={c.user.id}
                          >
                            <div className="candidate-top">
                              <Avatar employee={c.employee} />
                              <span>
                                <strong>{c.user.name}</strong>
                                <small>{c.hours} ч на неделе</small>
                              </span>
                              {i === 0 && c.eligible ? (
                                <span className="recommended">Рекомендуем</span>
                              ) : null}
                              <span className="radio-circle">
                                {selected === c.user.id && <Check size={12} />}
                              </span>
                            </div>
                            <div className="candidate-reasons">
                              {c.reasons.map((reason) => (
                                <span key={reason}>
                                  {reason.startsWith("Нет доступности") ||
                                  reason.startsWith("Пересечение") ||
                                  reason.startsWith("Превышен") ||
                                  reason.startsWith("Отдых") ? (
                                    <AlertCircle size={11} />
                                  ) : (
                                    <Check size={11} />
                                  )}{" "}
                                  {reason}
                                </span>
                              ))}
                            </div>
                          </button>
                        ))}
                      </div>
                      <label className="checkbox-label">
                        <input
                          type="checkbox"
                          checked={offer}
                          onChange={(e) => setOffer(e.target.checked)}
                        />
                        <span>
                          Сначала предложить сотруднику
                          <small>Он сможет принять или отклонить смену</small>
                        </span>
                      </label>
                    </>
                  )}
                  {(panel.kind === "request" || panel.kind === "assign") && (
                    <label className="form-label">
                      {panel.kind === "request"
                        ? "Ваше пожелание"
                        : "Комментарий, необязательно"}
                      <textarea
                        rows={3}
                        maxLength={panel.kind === "request" ? 1000 : 500}
                        placeholder={
                          panel.kind === "request"
                            ? "Например: могу выйти после 15:00, утром учёба…"
                            : "Что важно знать сотруднику?"
                        }
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                      />
                    </label>
                  )}
                </>
              )}
            </>
          )}
          {panel.kind === "shift" && currentShift && (
            <>
              <div className={`shift-detail-hero ${currentShift.position}`}>
                <span className={`zone-label ${currentShift.position}`}>
                  {positions[currentShift.position].name}
                </span>
                <h3>
                  {time(currentShift.start)} — {time(currentShift.end)}
                </h3>
                <p>{fmt(currentShift.date, "EEEE, d MMMM yyyy")}</p>
                <Badge status={currentShift.status} />
              </div>
              <div className="detail-person">
                <Avatar
                  employee={state.employees.find(
                    (e) => e.userId === currentShift.userId,
                  )}
                  size="large"
                />
                <div>
                  <strong>
                    {
                      state.users.find((u) => u.id === currentShift.userId)
                        ?.name
                    }
                  </strong>
                  <small>{positions[currentShift.position].name}</small>
                </div>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Ресторан</dt>
                  <dd>Хлеб & Соль · Ташкент</dd>
                </div>
                <div>
                  <dt>Длительность</dt>
                  <dd>{currentShift.end - currentShift.start} часов</dd>
                </div>
                <div>
                  <dt>Часовой пояс</dt>
                  <dd>UTC+5</dd>
                </div>
                <div>
                  <dt>Статус</dt>
                  <dd>
                    {currentShift.status === "confirmed"
                      ? "Подтверждено"
                      : "Ожидает ответа сотрудника"}
                  </dd>
                </div>
              </dl>
              {currentShift.note && (
                <div className="info-banner">
                  <MessageSquare size={18} />
                  <p>{currentShift.note}</p>
                </div>
              )}
              {shiftIssues(currentShift, state.availability, state.shifts)
                .length > 0 && (
                <div className="conflict-alert">
                  <AlertCircle size={18} />
                  <p>
                    {shiftIssues(
                      currentShift,
                      state.availability,
                      state.shifts,
                    ).join(". ")}
                    . Свяжитесь с сотрудником и согласуйте новый интервал.
                  </p>
                </div>
              )}
              {state.user.role === "manager" ? (
                <div className="shift-action-note">
                  <ShieldCheck size={19} />
                  <p>
                    При изменении времени мы снова проверим доступность и
                    нагрузку. Сотрудник получит уведомление.
                  </p>
                </div>
              ) : (
                currentShift.status === "pending" && (
                  <div className="panel-offer-actions">
                    <button
                      className="button secondary"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await action(
                            {
                              action: "shift-response",
                              id: currentShift.id,
                              accept: false,
                            },
                            "Предложение отклонено",
                          )
                        )
                          close();
                      }}
                    >
                      Не смогу
                    </button>
                    <button
                      className="button primary"
                      disabled={busy}
                      onClick={async () => {
                        if (
                          await action(
                            {
                              action: "shift-response",
                              id: currentShift.id,
                              accept: true,
                            },
                            "Смена подтверждена",
                          )
                        )
                          close();
                      }}
                    >
                      Принимаю
                    </button>
                  </div>
                )
              )}
              {cancelConfirm && (
                <div className="confirm-cancel">
                  <strong>Отменить смену?</strong>
                  <p>
                    Сотрудник получит уведомление, а интервал снова станет
                    доступным.
                  </p>
                  <button
                    className="button danger"
                    disabled={busy}
                    onClick={async () => {
                      if (
                        await action(
                          { action: "cancel-shift", id: currentShift.id },
                          "Смена отменена",
                        )
                      )
                        close();
                    }}
                  >
                    Да, отменить
                  </button>
                  <button
                    className="text-button"
                    onClick={() => setCancelConfirm(false)}
                  >
                    Вернуться
                  </button>
                </div>
              )}
            </>
          )}
          {panel.kind === "employee" && (
            <>
              <div className="employee-detail-head">
                <Avatar employee={panel.employee} size="xlarge" />
                <h3>
                  {state.users.find((u) => u.id === panel.employee.userId)
                    ?.name || state.user.name}
                </h3>
                <span className={`zone-label ${panel.employee.position}`}>
                  {panel.employee.userId === "manager"
                    ? "Менеджер"
                    : positions[panel.employee.position].name}
                </span>
              </div>
              <dl className="detail-list">
                <div>
                  <dt>Ресторан</dt>
                  <dd>Хлеб & Соль · Ташкент</dd>
                </div>
                <div>
                  <dt>Почта</dt>
                  <dd>
                    {
                      state.users.find((u) => u.id === panel.employee.userId)
                        ?.email
                    }
                  </dd>
                </div>
                <div>
                  <dt>Часов на неделе</dt>
                  <dd>
                    {weeklyHours(state.shifts, panel.employee.userId, week)} /{" "}
                    {panel.employee.maxHours} ч
                  </dd>
                </div>
                <div>
                  <dt>Учтено пожеланий</dt>
                  <dd>{panel.employee.fulfilled}</dd>
                </div>
              </dl>
              <h3 className="panel-section-title">Смены на выбранной неделе</h3>
              <div className="profile-shifts">
                {state.shifts
                  .filter(
                    (s) =>
                      s.userId === panel.employee.userId &&
                      s.date >= week &&
                      s.date < format(addDays(parseISO(week), 7), "yyyy-MM-dd"),
                  )
                  .map((s) => (
                    <div key={s.id}>
                      <div>
                        <strong>{fmt(s.date, "EEEEEE, d MMM")}</strong>
                        <small>
                          {time(s.start)} — {time(s.end)}
                        </small>
                      </div>
                      <Badge status={s.status} />
                    </div>
                  ))}
              </div>
              <h3 className="panel-section-title">Доступность на неделе</h3>
              <div className="profile-shifts">
                {state.availability
                  .filter(
                    (a) =>
                      a.userId === panel.employee.userId &&
                      a.date >= week &&
                      a.date < format(addDays(parseISO(week), 7), "yyyy-MM-dd"),
                  )
                  .map((a) => (
                    <div key={a.id}>
                      <strong>{fmt(a.date, "EEEEEE, d MMM")}</strong>
                      <span>
                        {time(a.start)} — {time(a.end)}
                      </span>
                    </div>
                  ))}
              </div>
            </>
          )}
          {panel.kind === "help" && (
            <>
              <div className="help-hero">
                <Command size={48} />
                <h3>
                  Люди за каждым
                  <br />
                  хорошим днём.
                </h3>
              </div>
              <p className="panel-description">
                «Смена» помогает ресторану планировать работу так, чтобы слышать
                команду и закрывать потребность.
              </p>
              {[
                [
                  "01",
                  "Сотрудники задают ритм",
                  "Указывают доступность, отправляют пожелания и отвечают на предложения.",
                ],
                [
                  "02",
                  "Система подсказывает",
                  "Сравнивает квалификацию, часы, пересечения и отдых. Каждую рекомендацию можно объяснить.",
                ],
                [
                  "03",
                  "Менеджер решает",
                  "Выбирает сотрудника, согласует смену и публикует расписание.",
                ],
              ].map(([n, t, d]) => (
                <div className="help-step" key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </div>
                </div>
              ))}
              <div className="info-banner">
                <ShieldCheck size={19} />
                <p>
                  Не больше 12 часов в день, 40 часов в неделю и не меньше 11
                  часов отдыха между сменами.
                </p>
              </div>
              {state.demo && (
                <p className="muted small-text">
                  Сейчас открыто демонстрационное пространство. Данные хранятся
                  в SQLite на сервере. Переключение ролей доступно только в
                  деморежиме.
                </p>
              )}
            </>
          )}
        </div>
        <div className="panel-bottom">
          {["assign", "need", "request"].includes(panel.kind) ? (
            <>
              <button className="button secondary" onClick={close}>
                Отмена
              </button>
              <button
                className="button primary"
                disabled={
                  busy ||
                  !validDate ||
                  end <= start ||
                  (panel.kind === "assign" && !selected) ||
                  (panel.kind === "request" && note.trim().length < 3)
                }
                onClick={() => {
                  if (panel.kind === "assign" && !confirm) setConfirm(true);
                  else save();
                }}
              >
                {busy ? (
                  <Loader2 className="spin" size={16} />
                ) : panel.kind === "assign" ? (
                  <Send size={16} />
                ) : (
                  <Check size={16} />
                )}{" "}
                {panel.kind === "assign"
                  ? confirm
                    ? offer
                      ? "Отправить предложение"
                      : "Подтвердить смену"
                    : "Продолжить"
                  : panel.kind === "request"
                    ? "Отправить пожелание"
                    : "Сохранить потребность"}
              </button>
            </>
          ) : panel.kind === "shift" &&
            state.user.role === "manager" &&
            currentShift ? (
            <>
              <button
                className="button secondary"
                disabled={busy}
                onClick={() => setCancelConfirm(true)}
              >
                Отменить смену
              </button>
              <button
                className="button primary"
                disabled={busy}
                onClick={() => onEdit(currentShift)}
              >
                <Settings2 size={15} />
                Изменить смену
              </button>
            </>
          ) : (
            <button className="button secondary full" onClick={close}>
              Готово
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}
