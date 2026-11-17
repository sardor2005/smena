"use client";
import { fmt, time, stamp } from "@/lib/format";
import { coverage, shiftIssues, weeklyHours } from "@/lib/recommend";
import type { AppState, Position, Shift } from "@/lib/types";
import { positions } from "@/lib/types";
import type { Panel, Screen } from "@/lib/ui-types";
import { addDays, addWeeks, format, parseISO, startOfWeek } from "date-fns";
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Bell,
  CalendarDays,
  Check,
  CheckCheck,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Coffee,
  Filter,
  LayoutDashboard,
  ListChecks,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AvailabilityEditor from "./availability-editor";
import DayView from "./day-view";
import Login from "./login";
import Sidebar from "./sidebar";
import PanelView from "./panel-view";
import { Avatar, Badge, Empty, Logo } from "./ui";
const managerNav = [
  { id: "overview", label: "Обзор", icon: LayoutDashboard },
  { id: "schedule", label: "Расписание", icon: CalendarDays },
  { id: "needs", label: "Потребность", icon: Settings2 },
  { id: "employees", label: "Команда", icon: Users },
  { id: "requests", label: "Пожелания", icon: MessageSquare },
];
const employeeNav = [
  { id: "home", label: "Мой день", icon: LayoutDashboard },
  { id: "myshifts", label: "Мои смены", icon: CalendarDays },
  { id: "availability", label: "Доступность", icon: Clock3 },
  { id: "myrequests", label: "Мои пожелания", icon: MessageSquare },
];
export default function SmenaApp() {
  const [state, setState] = useState<AppState | null>(null),
    [loading, setLoading] = useState(true),
    [demo, setDemo] = useState(false),
    [authError, setAuthError] = useState("");
  const [screen, setScreen] = useState<Screen>("schedule"),
    [panel, setPanel] = useState<Panel>(null),
    [mobile, setMobile] = useState(false),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState<{ text: string; error?: boolean } | null>(
      null,
    );
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("smena-sidebar-collapsed") === "true");
    } catch {}
  }, []);
  const toggleSidebar = () =>
    setCollapsed((value) => {
      const next = !value;
      try {
        localStorage.setItem("smena-sidebar-collapsed", String(next));
      } catch {}
      return next;
    });
  const [week, setWeek] = useState(""),
    [zone, setZone] = useState<Position | "all">("all"),
    [search, setSearch] = useState(""),
    [view, setView] = useState<"week" | "day">("week"),
    [selectedDay, setSelectedDay] = useState(""),
    [filter, setFilter] = useState("all");
  const notify = useCallback(
    (text: string, error = false) => setToast({ text, error }),
    [],
  );
  useEffect(() => {
    if (toast) {
      const t = setTimeout(() => setToast(null), 4500);
      return () => clearTimeout(t);
    }
  }, [toast]);
  const load = useCallback(async () => {
    try {
      const auth = await fetch("/api/auth").then((r) => r.json());
      setDemo(auth.demo);
      if (auth.user) {
        const r = await fetch("/api/state");
        if (!r.ok) throw Error("Не удалось загрузить данные");
        const s: AppState = await r.json();
        setState(s);
        setWeek(
          format(
            startOfWeek(parseISO(s.today), { weekStartsOn: 1 }),
            "yyyy-MM-dd",
          ),
        );
        setSelectedDay(s.today);
        setScreen(s.user.role === "manager" ? "schedule" : "home");
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Ошибка соединения");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);
  const login = async (role?: string, email?: string, password?: string) => {
    setBusy(true);
    setAuthError("");
    try {
      const r = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(role ? { demo: role } : { email, password }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await load();
      setPanel(null);
      setMobile(false);
    } catch (e) {
      setAuthError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const action = async (
    data: Record<string, unknown>,
    message = "Изменения сохранены",
  ) => {
    setBusy(true);
    try {
      const r = await fetch("/api/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const s = await r.json();
      if (!r.ok) throw Error(s.error);
      setState(s);
      notify(message);
      return true;
    } catch (e) {
      notify((e as Error).message, true);
      return false;
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => {
    if (!state?.user.id) return;
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const response = await fetch("/api/state");
        if (response.status === 401) {
          if (active) setState(null);
          return;
        }
        if (response.ok) {
          const fresh = await response.json();
          if (active)
            setState((current) =>
              current?.user.id === fresh.user.id ? fresh : current,
            );
        }
      } catch {
        /* Retain the current view during transient network failures. */
      }
    };
    const timer = setInterval(refresh, 15000);
    window.addEventListener("focus", refresh);
    return () => {
      active = false;
      clearInterval(timer);
      window.removeEventListener("focus", refresh);
    };
  }, [state?.user.id]);
  const navigate = (next: Screen) => {
    setScreen(next);
    setSearch("");
    setFilter("all");
    setMobile(false);
    setPanel(null);
  };
  const logout = async () => {
    await fetch("/api/auth", { method: "DELETE" });
    setState(null);
  };
  const days = useMemo(
    () =>
      week
        ? Array.from({ length: 7 }, (_, i) =>
            format(addDays(parseISO(week), i), "yyyy-MM-dd"),
          )
        : [],
    [week],
  );
  const weekEnd = days[6] || "";
  const weekShifts =
    state?.shifts.filter((s) => s.date >= week && s.date <= weekEnd) || [];
  const weekNeeds =
    state?.needs.filter((n) => n.date >= week && n.date <= weekEnd) || [];
  const shortages = weekNeeds.filter((n) => coverage(n, weekShifts) < n.count);
  const pending =
    state?.requests.filter((r) => r.status === "pending").length || 0;
  const unread = state?.notifications.filter((n) => !n.read).length || 0;
  const employees =
    state?.employees.filter(
      (e) =>
        (zone === "all" || e.position === zone) &&
        state.users
          .find((u) => u.id === e.userId)
          ?.name.toLowerCase()
          .includes(search.toLowerCase()),
    ) || [];
  const heading: Record<Screen, [string, string]> = {
    schedule: [
      "Расписание команды",
      "Хорошая неделя начинается с хорошего плана.",
    ],
    overview: ["Всё под контролем", "Ваша команда, смены и важные решения."],
    needs: [
      "Потребность в команде",
      "Нужные люди. В нужное время. На своём месте.",
    ],
    employees: [
      "Люди, на которых всё держится",
      "Вся команда ресторана в одном месте.",
    ],
    requests: [
      "Пожелания команды",
      "Услышать каждого — значит собрать сильную команду.",
    ],
    logs: [
      "История решений",
      "Все изменения расписания, без потери контекста.",
    ],
    home: [
      `Привет, ${state?.user.name.split(" ")[0] || "Анна"}!`,
      "Всё важное для вашей следующей смены.",
    ],
    myshifts: ["Мои смены", "Ваш план на неделю — всегда под рукой."],
    availability: [
      "Когда вам удобно?",
      "Укажите время, когда вы готовы выйти на смену.",
    ],
    notifications: [
      "Уведомления",
      "Новые назначения, предложения и ответы менеджера.",
    ],
    myrequests: [
      "Мои пожелания",
      "Расскажите менеджеру, какой график вам подходит.",
    ],
  };
  const shiftPanel = (s: Shift) => setPanel({ kind: "shift", shift: s });
  const dateNav = (
    <div className="date-nav">
      <button
        aria-label="Предыдущая неделя"
        onClick={() => {
          const w = format(addWeeks(parseISO(week), -1), "yyyy-MM-dd");
          setWeek(w);
          setSelectedDay(w);
        }}
      >
        <ChevronLeft size={17} />
      </button>
      <span>
        {days.length
          ? `${fmt(week, "d")} – ${fmt(weekEnd, "d MMMM yyyy")}`
          : ""}
      </span>
      <button
        aria-label="Следующая неделя"
        onClick={() => {
          const w = format(addWeeks(parseISO(week), 1), "yyyy-MM-dd");
          setWeek(w);
          setSelectedDay(w);
        }}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  );
  function exportSchedule() {
    if (!state) return;
    const rows = [
      ["Сотрудник", "Дата", "Начало", "Конец", "Зона", "Статус"],
      ...weekShifts.map((s) => [
        state.users.find((u) => u.id === s.userId)?.name || "",
        s.date,
        time(s.start),
        time(s.end),
        positions[s.position].name,
        s.status === "confirmed" ? "Подтверждено" : "Ожидает",
      ]),
    ];
    const csv =
      "\uFEFF" +
      rows
        .map((row) =>
          row.map((v) => '"' + v.replaceAll('"', '""') + '"').join(";"),
        )
        .join("\r\n");
    const url = URL.createObjectURL(
      new Blob([csv], { type: "text/csv;charset=utf-8;" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `smena-${week}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    notify("Расписание экспортировано в CSV");
  }
  if (loading)
    return (
      <div className="loading-app">
        <Logo />
        <div className="skeleton" />
        <p>Собираем вашу смену…</p>
      </div>
    );
  if (!state)
    return <Login demo={demo} busy={busy} error={authError} login={login} />;
  const isManager = state.user.role === "manager";
  const nav = isManager ? managerNav : employeeNav;
  const member = (uid: string) => state.employees.find((e) => e.userId === uid);
  const username = (uid: string) =>
    state.users.find((u) => u.id === uid)?.name || "Сотрудник";
  const ownPending = state.shifts.filter(
    (s) => s.userId === state.user.id && s.status === "pending",
  );
  return (
    <div
      className={`app-shell ${!isManager ? "employee-shell" : "manager-shell"} ${collapsed ? "sidebar-collapsed" : ""}`}
    >
      {mobile && (
        <div className="mobile-shade" onClick={() => setMobile(false)} />
      )}
      <Sidebar
        state={state}
        screen={screen}
        nav={nav}
        navigate={navigate}
        setPanel={setPanel}
        mobile={mobile}
        closeMobile={() => setMobile(false)}
        collapsed={collapsed}
        toggleCollapsed={toggleSidebar}
      />
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-menu icon-button"
              aria-label="Открыть меню"
              aria-expanded={mobile}
              aria-controls="app-sidebar"
              onClick={() => setMobile(true)}
            >
              <Menu size={21} />
            </button>
            <span>Рабочее пространство</span>
            <ChevronRight size={13} />
            <strong>
              {nav.find((n) => n.id === screen)?.label || heading[screen][0]}
            </strong>
          </div>
          <div className="top-actions">
            <span className="live-dot" />
            <span className="saved-label">
              {busy ? "Сохраняем изменения…" : "Все изменения сохранены"}
            </span>
            {demo && (
              <button
                className="demo-switch"
                disabled={busy}
                onClick={() => login(isManager ? "employee" : "manager")}
              >
                {isManager ? "Кабинет сотрудника" : "Панель менеджера"}
                <ArrowUpRight size={13} />
              </button>
            )}
            <button
              className="icon-button notification-button"
              aria-label={`Уведомления: ${unread}`}
              onClick={() => navigate("notifications")}
            >
              <Bell size={19} />
              {unread > 0 && <i />}
            </button>
            <button className="icon-button" aria-label="Выйти" onClick={logout}>
              <LogOut size={18} />
            </button>
          </div>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                {isManager ? "КОМАНДА В РИТМЕ РЕСТОРАНА" : "ВАШ РАБОЧИЙ РИТМ"}
                <span> / </span>
                {fmt(state.today, "d MMMM, EEEE")}
              </div>
              <h1>
                {heading[screen][0]}
                {!/[!?]$/.test(heading[screen][0]) && (
                  <span className="orange-dot">.</span>
                )}
              </h1>
              <p>{heading[screen][1]}</p>
            </div>
            <div className="heading-actions">
              {screen === "schedule" && (
                <>
                  <button
                    className="button secondary export-btn"
                    onClick={exportSchedule}
                  >
                    <ArrowDownToLine size={16} />
                    Экспорт
                  </button>
                  <button
                    className="button primary"
                    disabled={busy}
                    onClick={() =>
                      action(
                        { action: "publish", from: week, to: weekEnd },
                        "График опубликован. Команда получила уведомления.",
                      )
                    }
                  >
                    <Send size={16} />
                    Опубликовать график
                  </button>
                </>
              )}
              {screen === "needs" && (
                <button
                  className="button primary"
                  onClick={() => setPanel({ kind: "need" })}
                >
                  <Plus size={17} />
                  Добавить потребность
                </button>
              )}
              {["home", "myshifts", "myrequests"].includes(screen) && (
                <button
                  className="button primary"
                  onClick={() => setPanel({ kind: "request" })}
                >
                  <Plus size={17} />
                  Отправить пожелание
                </button>
              )}
            </div>
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={screen}
              initial={{ opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.18 }}
            >
              {(screen === "schedule" || screen === "overview") &&
                isManager && (
                  <>
                    <div className="stats-row">
                      <div className="stat">
                        <span className="stat-icon green">
                          <Users size={19} />
                        </span>
                        <div>
                          <small>Команда на неделе</small>
                          <strong>
                            {new Set(weekShifts.map((s) => s.userId)).size}
                            <span> / {state.employees.length} сотрудников</span>
                          </strong>
                        </div>
                        <div className="avatar-stack">
                          {state.employees.slice(0, 3).map((e) => (
                            <Avatar key={e.userId} employee={e} size="tiny" />
                          ))}
                          <span>
                            +{Math.max(0, state.employees.length - 3)}
                          </span>
                        </div>
                      </div>
                      <div className="stat">
                        <span className="stat-icon violet">
                          <CalendarDays size={19} />
                        </span>
                        <div>
                          <small>Смены в расписании</small>
                          <strong>
                            {
                              weekShifts.filter((s) => s.status === "confirmed")
                                .length
                            }
                            <span> подтверждено</span>
                          </strong>
                        </div>
                        <span className="tiny-tag">
                          {
                            weekShifts.filter((s) => s.status === "pending")
                              .length
                          }{" "}
                          ожидают
                        </span>
                      </div>
                      <button
                        className="stat stat-action"
                        onClick={() => navigate("needs")}
                      >
                        <span className="stat-icon orange">
                          <AlertCircle size={19} />
                        </span>
                        <div>
                          <small>Требуют внимания</small>
                          <strong>
                            {shortages.length}
                            <span> интервалов с дефицитом</span>
                          </strong>
                        </div>
                        <ArrowUpRight size={18} />
                      </button>
                    </div>
                    {screen === "overview" ? (
                      <div className="overview-grid">
                        <div className="overview-feature">
                          <span className="eyebrow">ПЛАН НА НЕДЕЛЮ</span>
                          <h2>
                            Когда всё по плану,
                            <br />
                            команде легче.
                          </h2>
                          <p>
                            Проверьте незакрытые интервалы и учтите пожелания
                            перед публикацией расписания.
                          </p>
                          <button
                            className="button dark"
                            onClick={() => navigate("schedule")}
                          >
                            Открыть расписание <ArrowRight size={17} />
                          </button>
                          <div className="overview-bars">
                            {days.map((d) => (
                              <div key={d}>
                                <i
                                  style={{
                                    height: `${30 + weekShifts.filter((s) => s.date === d).length * 9}px`,
                                  }}
                                />
                                <span>{fmt(d, "EEEEEE")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <section className="surface">
                          <div className="section-heading">
                            <h2>На вашем внимании</h2>
                            <span className="count-pill">{pending}</span>
                          </div>
                          {state.requests
                            .filter((r) => r.status === "pending")
                            .map((r) => (
                              <button
                                className="inbox-preview"
                                key={r.id}
                                onClick={() => navigate("requests")}
                              >
                                <Avatar employee={member(r.userId)} />
                                <span>
                                  <strong>{username(r.userId)}</strong>
                                  <small>{r.message}</small>
                                </span>
                                <ChevronRight size={17} />
                              </button>
                            ))}
                          {pending === 0 && (
                            <Empty
                              title="Все пожелания рассмотрены"
                              body="Новые запросы появятся здесь."
                            />
                          )}
                          <button
                            className="text-button"
                            onClick={() => navigate("requests")}
                          >
                            Все пожелания <ArrowRight size={15} />
                          </button>
                        </section>
                        <section className="surface overview-wide">
                          <div className="section-heading">
                            <h2>Ближайшие пробелы в графике</h2>
                            <button
                              className="text-button"
                              onClick={() => navigate("needs")}
                            >
                              Вся потребность <ArrowRight size={15} />
                            </button>
                          </div>
                          <div className="gap-grid">
                            {shortages.slice(0, 3).map((n) => (
                              <div className="gap-card" key={n.id}>
                                <div>
                                  <span className={`zone-label ${n.position}`}>
                                    {positions[n.position].name}
                                  </span>
                                  <span>{fmt(n.date, "EEE, d MMM")}</span>
                                </div>
                                <h3>
                                  {time(n.start)} — {time(n.end)}
                                </h3>
                                <p>
                                  Не хватает {n.count - coverage(n, weekShifts)}{" "}
                                  чел.
                                </p>
                                <button
                                  className="button secondary"
                                  onClick={() =>
                                    setPanel({ kind: "assign", need: n })
                                  }
                                >
                                  <Sparkles size={15} />
                                  Подобрать сотрудника
                                </button>
                              </div>
                            ))}
                            {shortages.length === 0 && (
                              <Empty
                                title="Команда укомплектована"
                                body="На этой неделе нет интервалов с дефицитом."
                              />
                            )}
                          </div>
                        </section>
                      </div>
                    ) : (
                      <section className="schedule-surface">
                        <div className="schedule-toolbar">
                          <div className="toolbar-left">
                            <div className="segmented">
                              <button
                                className={view === "week" ? "selected" : ""}
                                onClick={() => setView("week")}
                              >
                                Неделя
                              </button>
                              <button
                                className={view === "day" ? "selected" : ""}
                                onClick={() => setView("day")}
                              >
                                День
                              </button>
                            </div>
                            {dateNav}
                            <button
                              className="today-button"
                              onClick={() => {
                                setWeek(
                                  format(
                                    startOfWeek(parseISO(state.today), {
                                      weekStartsOn: 1,
                                    }),
                                    "yyyy-MM-dd",
                                  ),
                                );
                                setSelectedDay(state.today);
                              }}
                            >
                              Сегодня
                            </button>
                          </div>
                          <button
                            className="button dark small"
                            onClick={() => setPanel({ kind: "assign" })}
                          >
                            <Plus size={16} />
                            Добавить смену
                          </button>
                        </div>
                        <div className="schedule-filters">
                          <div className="zone-tabs">
                            <button
                              className={zone === "all" ? "selected" : ""}
                              onClick={() => setZone("all")}
                            >
                              Вся команда <span>{state.employees.length}</span>
                            </button>
                            {(Object.keys(positions) as Position[]).map((p) => (
                              <button
                                key={p}
                                className={zone === p ? "selected" : ""}
                                onClick={() => setZone(p)}
                              >
                                <i className={p} />
                                {positions[p].name}
                                <span>
                                  {
                                    state.employees.filter(
                                      (e) => e.position === p,
                                    ).length
                                  }
                                </span>
                              </button>
                            ))}
                          </div>
                          <div className="filter-actions">
                            <label className="search-field">
                              <Search size={15} />
                              <input
                                placeholder="Найти сотрудника"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                              />
                              {search && (
                                <button
                                  aria-label="Очистить поиск"
                                  onClick={() => setSearch("")}
                                >
                                  <X size={13} />
                                </button>
                              )}
                            </label>
                            <label className="status-filter">
                              <Filter size={15} />
                              <select
                                aria-label="Фильтр статусов"
                                value={filter}
                                onChange={(e) => setFilter(e.target.value)}
                              >
                                <option value="all">Все статусы</option>
                                <option value="confirmed">Подтверждено</option>
                                <option value="pending">Ожидает</option>
                                <option value="conflict">Конфликты</option>
                              </select>
                            </label>
                          </div>
                        </div>
                        {view === "week" ? (
                          <div className="calendar-scroll">
                            <div className="week-calendar">
                              <div className="calendar-head">
                                <div className="people-head">
                                  Сотрудник <span>{employees.length}</span>
                                </div>
                                {days.map((d) => (
                                  <button
                                    onClick={() => {
                                      setSelectedDay(d);
                                      setView("day");
                                    }}
                                    key={d}
                                    className={`day-head ${d === state.today ? "is-today" : ""} ${[5, 6].includes(parseISO(d).getDay()) ? "" : ""}`}
                                  >
                                    <span>{fmt(d, "EEEEEE")}</span>
                                    <strong>
                                      {fmt(d, "d")}
                                      <em>{fmt(d, "MMM").replace(".", "")}</em>
                                    </strong>
                                    {d === state.today && <i />}
                                  </button>
                                ))}
                              </div>
                              {employees.map((e) => {
                                const hours = weeklyHours(
                                  state.shifts,
                                  e.userId,
                                  week,
                                );
                                return (
                                  <div className="calendar-row" key={e.userId}>
                                    <button
                                      className="employee-cell"
                                      onClick={() =>
                                        setPanel({
                                          kind: "employee",
                                          employee: e,
                                        })
                                      }
                                    >
                                      <Avatar employee={e} />
                                      <span>
                                        <strong>{username(e.userId)}</strong>
                                        <small>
                                          {positions[e.position].name}
                                          <i /> {hours} ч / {e.maxHours} ч
                                        </small>
                                      </span>
                                    </button>
                                    {days.map((d) => {
                                      const shifts = weekShifts.filter(
                                        (s) =>
                                          s.userId === e.userId &&
                                          s.date === d &&
                                          (filter === "all" ||
                                            s.status === filter ||
                                            (filter === "conflict" &&
                                              shiftIssues(
                                                s,
                                                state.availability,
                                                state.shifts,
                                              ).length > 0)),
                                      );
                                      const available = state.availability.find(
                                        (a) =>
                                          a.userId === e.userId && a.date === d,
                                      );
                                      return (
                                        <div
                                          key={d}
                                          className={`day-cell ${d === state.today ? "today-cell" : ""}`}
                                        >
                                          {shifts.map((s) => (
                                            <button
                                              key={s.id}
                                              className={`shift-card ${s.position} ${s.status} ${shiftIssues(s, state.availability, state.shifts).length ? "conflict" : ""}`}
                                              onClick={() => shiftPanel(s)}
                                            >
                                              <span className="shift-time">
                                                {time(s.start)}
                                                <span>–</span>
                                                {time(s.end)}
                                              </span>
                                              <span className="shift-zone">
                                                {positions[s.position].name}
                                                <span>{s.end - s.start} ч</span>
                                              </span>
                                              <span className="shift-status">
                                                {shiftIssues(
                                                  s,
                                                  state.availability,
                                                  state.shifts,
                                                ).length ? (
                                                  <>
                                                    <AlertCircle size={11} />
                                                    Конфликт доступности
                                                  </>
                                                ) : s.status === "confirmed" ? (
                                                  <>
                                                    <span className="status-check">
                                                      <Check size={10} />
                                                    </span>
                                                    Подтверждено
                                                  </>
                                                ) : (
                                                  <>
                                                    <Clock3 size={11} />
                                                    Ожидает ответа
                                                  </>
                                                )}
                                              </span>
                                            </button>
                                          ))}
                                          {shifts.length === 0 &&
                                            (filter === "all" ? (
                                              <button
                                                className={`empty-slot ${!available ? "unavailable" : ""}`}
                                                onClick={() =>
                                                  setPanel({
                                                    kind: "assign",
                                                    need: {
                                                      id: "new",
                                                      date: d,
                                                      start:
                                                        available?.start === 8
                                                          ? 9
                                                          : available?.start ||
                                                            9,
                                                      end: Math.min(
                                                        available?.end || 15,
                                                        15,
                                                      ),
                                                      position: e.position,
                                                      count: 1,
                                                    },
                                                  })
                                                }
                                              >
                                                <span>
                                                  {available
                                                    ? "Доступен"
                                                    : "Выходной"}
                                                </span>
                                                {available && (
                                                  <small>
                                                    {time(available.start)}–
                                                    {time(available.end)}
                                                    <Plus size={12} />
                                                  </small>
                                                )}
                                              </button>
                                            ) : (
                                              <span className="no-shift">
                                                —
                                              </span>
                                            ))}
                                        </div>
                                      );
                                    })}
                                  </div>
                                );
                              })}
                              {employees.length === 0 && (
                                <Empty
                                  title="Сотрудники не найдены"
                                  body="Попробуйте другой запрос или зону."
                                />
                              )}
                              <div className="coverage-row">
                                <div>
                                  <span className="coverage-icon">
                                    <Users size={15} />
                                  </span>
                                  <span>
                                    Покрытие смен
                                    <small>По часовым интервалам</small>
                                  </span>
                                </div>
                                {days.map((d) => {
                                  const needs = weekNeeds.filter(
                                    (n) =>
                                      n.date === d &&
                                      (zone === "all" || n.position === zone),
                                  );
                                  const lack = needs.reduce(
                                    (sum, n) =>
                                      sum +
                                      Math.max(
                                        0,
                                        n.count - coverage(n, weekShifts),
                                      ),
                                    0,
                                  );
                                  return (
                                    <button
                                      key={d}
                                      className={
                                        lack ? "coverage-lack" : "coverage-ok"
                                      }
                                      onClick={() => {
                                        setSelectedDay(d);
                                        navigate("needs");
                                      }}
                                    >
                                      <span>
                                        {lack ? (
                                          <AlertCircle size={13} />
                                        ) : (
                                          <Check size={13} />
                                        )}{" "}
                                        {lack
                                          ? `Не хватает ${lack}`
                                          : "Укомплектовано"}
                                      </span>
                                      <small>{needs.length} интервалов</small>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <DayView
                            state={state}
                            employees={employees}
                            day={selectedDay}
                            setDay={setSelectedDay}
                            days={days}
                            onShift={shiftPanel}
                            onEmployee={(e) =>
                              setPanel({ kind: "employee", employee: e })
                            }
                            filter={filter}
                          />
                        )}
                        <div className="calendar-footer">
                          <div className="legend">
                            <span>
                              <i className="kitchen" />
                              Кухня
                            </span>
                            <span>
                              <i className="cash" />
                              Касса
                            </span>
                            <span>
                              <i className="service" />
                              Выдача
                            </span>
                            <span>
                              <i className="pending-key" />
                              Ожидает ответа
                            </span>
                          </div>
                          <span>Время ресторана · UTC+5</span>
                        </div>
                      </section>
                    )}
                    {screen === "schedule" && (
                      <div className="schedule-note">
                        <span>
                          <ShieldCheck size={17} />
                          <strong>Решение за вами.</strong> Смена помогает
                          учесть доступность и баланс нагрузки.
                        </span>
                        <button onClick={() => navigate("needs")}>
                          Посмотреть рекомендации <ArrowRight size={15} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              {screen === "needs" && (
                <>
                  <div className="page-controls">
                    {dateNav}
                    <div className="segmented">
                      {(["all", ...Object.keys(positions)] as const).map(
                        (p) => (
                          <button
                            key={p}
                            className={zone === p ? "selected" : ""}
                            onClick={() => setZone(p as Position | "all")}
                          >
                            {p === "all"
                              ? "Все зоны"
                              : positions[p as Position].name}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                  <div className="info-banner">
                    <Sparkles size={20} />
                    <div>
                      <strong>Рекомендации с понятной логикой</strong>
                      <p>
                        Учитываем доступность, квалификацию, нагрузку, пожелания
                        и отдых между сменами. Финальное решение — за вами.
                      </p>
                    </div>
                  </div>
                  <section className="surface needs-table">
                    <div className="section-heading">
                      <h2>Покрытие по интервалам</h2>
                      <span className="count-pill">
                        {
                          weekNeeds.filter(
                            (n) => zone === "all" || n.position === zone,
                          ).length
                        }
                      </span>
                    </div>
                    <div className="table-scroll">
                      <table>
                        <thead>
                          <tr>
                            <th>День и время</th>
                            <th>Зона</th>
                            <th>Нужно</th>
                            <th>Назначено</th>
                            <th>Баланс</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {weekNeeds
                            .filter(
                              (n) => zone === "all" || n.position === zone,
                            )
                            .sort(
                              (a, b) =>
                                a.date.localeCompare(b.date) ||
                                a.start - b.start,
                            )
                            .map((n) => {
                              const count = coverage(n, weekShifts),
                                diff = count - n.count;
                              return (
                                <tr key={n.id}>
                                  <td>
                                    <strong>
                                      {fmt(n.date, "EEEEEE, d MMM")}
                                    </strong>
                                    <small>
                                      {time(n.start)} — {time(n.end)}
                                    </small>
                                  </td>
                                  <td>
                                    <span
                                      className={`zone-label ${n.position}`}
                                    >
                                      {positions[n.position].name}
                                    </span>
                                  </td>
                                  <td>
                                    <button
                                      className="inline-edit"
                                      aria-label="Изменить потребность"
                                      onClick={() =>
                                        setPanel({ kind: "need", need: n })
                                      }
                                    >
                                      {n.count} чел. <Settings2 size={12} />
                                    </button>
                                  </td>
                                  <td>{count} чел.</td>
                                  <td>
                                    <span
                                      className={`balance ${diff < 0 ? "negative" : diff > 0 ? "excess" : "positive"}`}
                                    >
                                      {diff < 0 ? (
                                        <AlertCircle size={13} />
                                      ) : (
                                        <Check size={13} />
                                      )}{" "}
                                      {diff < 0
                                        ? `${diff} чел.`
                                        : diff > 0
                                          ? `+${diff} чел.`
                                          : "Закрыто"}
                                    </span>
                                  </td>
                                  <td>
                                    {diff < 0 ? (
                                      <button
                                        className="text-button"
                                        onClick={() =>
                                          setPanel({ kind: "assign", need: n })
                                        }
                                      >
                                        <Sparkles size={14} />
                                        Подобрать
                                      </button>
                                    ) : (
                                      <button
                                        className="text-button muted"
                                        onClick={() =>
                                          setPanel({ kind: "need", need: n })
                                        }
                                      >
                                        Изменить
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    </div>
                    {weekNeeds.length === 0 && (
                      <Empty
                        title="Потребность ещё не задана"
                        body="Добавьте интервал и количество сотрудников."
                        action={
                          <button
                            className="button primary"
                            onClick={() => setPanel({ kind: "need" })}
                          >
                            Добавить интервал
                          </button>
                        }
                      />
                    )}
                  </section>
                </>
              )}
              {screen === "employees" && (
                <>
                  <div className="page-controls">
                    <label className="search-field large">
                      <Search size={17} />
                      <input
                        placeholder="Поиск по имени"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                      />
                    </label>
                    <select
                      className="select-control"
                      aria-label="Зона ресторана"
                      value={zone}
                      onChange={(e) =>
                        setZone(e.target.value as Position | "all")
                      }
                    >
                      <option value="all">Все зоны</option>
                      {Object.entries(positions).map(([p, v]) => (
                        <option key={p} value={p}>
                          {v.name}
                        </option>
                      ))}
                    </select>
                    {dateNav}
                  </div>
                  <div className="team-grid">
                    {employees.map((e) => {
                      const hours = weeklyHours(state.shifts, e.userId, week);
                      return (
                        <button
                          key={e.userId}
                          className="team-card"
                          onClick={() =>
                            setPanel({ kind: "employee", employee: e })
                          }
                        >
                          <div className="team-card-top">
                            <Avatar employee={e} size="large" />
                            <ArrowUpRight size={19} />
                          </div>
                          <h3>{username(e.userId)}</h3>
                          <span className={`zone-label ${e.position}`}>
                            {positions[e.position].name}
                          </span>
                          <div className="team-load">
                            <span>Нагрузка на неделе</span>
                            <strong>
                              {hours}
                              <small> / {e.maxHours} ч</small>
                            </strong>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width: `${Math.min((hours / e.maxHours) * 100, 100)}%`,
                              }}
                            />
                          </div>
                          <div className="team-card-bottom">
                            <span>
                              {
                                weekShifts.filter((s) => s.userId === e.userId)
                                  .length
                              }{" "}
                              смен
                            </span>
                            <span>
                              <span className="live-dot" /> В команде
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {employees.length === 0 && (
                    <Empty
                      title="Никого не нашли"
                      body="Измените параметры поиска."
                    />
                  )}
                </>
              )}
              {(screen === "requests" || screen === "myrequests") && (
                <>
                  <div className="page-controls">
                    <div className="segmented">
                      {[
                        ["all", "Все"],
                        ["pending", "На рассмотрении"],
                        ["approved", "Принятые"],
                        ["declined", "Отклонённые"],
                      ].map(([v, l]) => (
                        <button
                          key={v}
                          className={filter === v ? "selected" : ""}
                          onClick={() => setFilter(v)}
                        >
                          {l}
                          {v === "pending" && (
                            <span className="count-pill">{pending}</span>
                          )}
                        </button>
                      ))}
                    </div>
                    {isManager && (
                      <span className="muted small-text">
                        Пожелание не меняет график автоматически
                      </span>
                    )}
                  </div>
                  <div className="request-list">
                    {state.requests
                      .filter((r) => filter === "all" || r.status === filter)
                      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                      .map((r) => (
                        <article className="request-card" key={r.id}>
                          <div className="request-avatar">
                            <Avatar employee={member(r.userId)} size="large" />
                          </div>
                          <div className="request-main">
                            <div className="request-heading">
                              <h3>{username(r.userId)}</h3>
                              <Badge status={r.status} />
                            </div>
                            <div className="request-meta">
                              <span>
                                {r.kind === "dayoff"
                                  ? "Выходной"
                                  : r.kind === "swap"
                                    ? "Замена смены"
                                    : "Пожелание по графику"}
                              </span>
                              <i /> {fmt(r.date, "d MMMM")} · {time(r.start)}–
                              {time(r.end)}
                            </div>
                            <p>{r.message}</p>
                            <small>Отправлено {stamp(r.createdAt)}</small>
                          </div>
                          {isManager && r.status === "pending" && (
                            <div className="request-actions">
                              <button
                                className="button secondary small"
                                disabled={busy}
                                onClick={() =>
                                  action(
                                    {
                                      action: "request-response",
                                      id: r.id,
                                      accept: false,
                                    },
                                    "Пожелание отклонено. Сотрудник уведомлён.",
                                  )
                                }
                              >
                                <X size={15} />
                                Отклонить
                              </button>
                              <button
                                className="button dark small"
                                disabled={busy}
                                onClick={() =>
                                  action(
                                    {
                                      action: "request-response",
                                      id: r.id,
                                      accept: true,
                                    },
                                    "Пожелание принято. Сотрудник уведомлён.",
                                  )
                                }
                              >
                                <Check size={15} />
                                Учесть
                              </button>
                            </div>
                          )}
                        </article>
                      ))}
                  </div>
                  {!state.requests.some(
                    (r) => filter === "all" || r.status === filter,
                  ) && (
                    <Empty
                      title="Здесь пока тихо"
                      body={
                        isManager
                          ? "Новые пожелания сотрудников появятся здесь."
                          : "Отправьте пожелание — менеджер получит уведомление."
                      }
                      action={
                        !isManager && (
                          <button
                            className="button primary"
                            onClick={() => setPanel({ kind: "request" })}
                          >
                            Отправить пожелание
                          </button>
                        )
                      }
                    />
                  )}
                </>
              )}
              {screen === "logs" && (
                <section className="surface">
                  <div className="section-heading">
                    <h2>История команды</h2>
                    <span className="muted small-text">
                      {state.logs.length} событий
                    </span>
                  </div>
                  <div className="timeline">
                    {state.logs.map((l) => (
                      <div className="timeline-event" key={l.id}>
                        <span className="timeline-dot">
                          <Check size={13} />
                        </span>
                        <div>
                          <p>{l.message}</p>
                          <small>
                            {username(l.actorId)} · {stamp(l.createdAt, true)}
                          </small>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {screen === "notifications" && (
                <section className="surface">
                  <div className="section-heading">
                    <h2>
                      Входящие <span className="count-pill">{unread}</span>
                    </h2>
                    <button
                      className="text-button"
                      disabled={busy || !unread}
                      onClick={() =>
                        action(
                          { action: "read" },
                          "Все уведомления отмечены прочитанными",
                        )
                      }
                    >
                      <CheckCheck size={16} />
                      Прочитать все
                    </button>
                  </div>
                  {state.notifications.map((n) => (
                    <article
                      className={`notification-item ${!n.read ? "unread" : ""}`}
                      key={n.id}
                    >
                      <span className="notification-icon">
                        <Bell size={18} />
                      </span>
                      <div>
                        <strong>{n.title}</strong>
                        <p>{n.body}</p>
                        <small>{stamp(n.createdAt)}</small>
                      </div>
                      {!n.read && <i className="live-dot" />}
                    </article>
                  ))}
                  {state.notifications.length === 0 && (
                    <Empty
                      title="Вы в курсе всего"
                      body="Здесь появятся изменения расписания и ответы менеджера."
                    />
                  )}
                </section>
              )}
              {(screen === "home" || screen === "myshifts") && !isManager && (
                <>
                  <div className="employee-summary">
                    <div className="employee-welcome">
                      <div>
                        <span className="eyebrow">ВАША НЕДЕЛЯ</span>
                        <h2>
                          {weeklyHours(state.shifts, state.user.id, week)}{" "}
                          <span>часов вместе</span>
                        </h2>
                        <p>
                          {
                            weekShifts.filter((s) => s.status === "confirmed")
                              .length
                          }{" "}
                          подтверждённых смен ·{" "}
                          {member(state.user.id)?.maxHours} ч недельный лимит
                        </p>
                      </div>
                      <div className="welcome-symbol">
                        <Coffee size={50} strokeWidth={1.3} />
                      </div>
                    </div>
                    <button
                      className="availability-cta"
                      onClick={() => navigate("availability")}
                    >
                      <span className="round-icon">
                        <Clock3 size={24} />
                      </span>
                      <h3>Ваше время — ваш выбор</h3>
                      <p>
                        Отметьте, когда вы готовы работать.
                        <br />
                        Менеджер учтёт это в расписании.
                      </p>
                      <span className="text-button">
                        Указать доступность <ArrowRight size={16} />
                      </span>
                    </button>
                  </div>
                  {ownPending.length > 0 && (
                    <section className="offers-section">
                      <div className="section-heading">
                        <h2>
                          <Sparkles size={20} /> Есть предложение
                        </h2>
                        <span className="count-pill">{ownPending.length}</span>
                      </div>
                      {ownPending.map((s) => (
                        <div className="offer-card" key={s.id}>
                          <div>
                            <strong>{fmt(s.date, "EEEE, d MMMM")}</strong>
                            <p>
                              {time(s.start)} — {time(s.end)} ·{" "}
                              {positions[s.position].name}
                            </p>
                            <small>
                              Менеджер предлагает вам выйти на смену
                            </small>
                          </div>
                          <div>
                            <button
                              className="button secondary"
                              disabled={busy}
                              onClick={() =>
                                action(
                                  {
                                    action: "shift-response",
                                    id: s.id,
                                    accept: false,
                                  },
                                  "Вы отклонили предложение. Менеджер уведомлён.",
                                )
                              }
                            >
                              Не смогу
                            </button>
                            <button
                              className="button primary"
                              disabled={busy}
                              onClick={() =>
                                action(
                                  {
                                    action: "shift-response",
                                    id: s.id,
                                    accept: true,
                                  },
                                  "Отлично! Смена подтверждена.",
                                )
                              }
                            >
                              <Check size={16} />
                              Принимаю
                            </button>
                          </div>
                        </div>
                      ))}
                    </section>
                  )}
                  <section className="surface employee-shifts">
                    <div className="section-heading">
                      <h2>Мои смены</h2>
                      {dateNav}
                    </div>
                    <div className="my-week-strip">
                      {days.map((d) => (
                        <button
                          key={d}
                          className={selectedDay === d ? "selected" : ""}
                          onClick={() => setSelectedDay(d)}
                        >
                          <span>{fmt(d, "EEEEEE")}</span>
                          <strong>{fmt(d, "d")}</strong>
                          <i
                            className={
                              weekShifts.some((s) => s.date === d)
                                ? "has-shift"
                                : ""
                            }
                          />
                        </button>
                      ))}
                    </div>
                    <div className="selected-day-shifts">
                      {state.shifts
                        .filter((s) => s.date === selectedDay)
                        .map((s) => (
                          <button
                            className={`my-shift-card ${s.position}`}
                            key={s.id}
                            onClick={() => shiftPanel(s)}
                          >
                            <span className="my-shift-date">
                              <strong>{fmt(s.date, "d")}</strong>
                              <small>{fmt(s.date, "MMM")}</small>
                            </span>
                            <div>
                              <span className={`zone-label ${s.position}`}>
                                {positions[s.position].name}
                              </span>
                              <h3>
                                {time(s.start)} — {time(s.end)}
                              </h3>
                              <p>Хлеб & Соль · {s.end - s.start} часов</p>
                            </div>
                            <Badge status={s.status} />
                            <ArrowUpRight size={20} />
                          </button>
                        ))}
                      {!state.shifts.some((s) => s.date === selectedDay) && (
                        <Empty
                          title="Можно выдохнуть"
                          body={`На ${fmt(selectedDay, "d MMMM")} у вас нет назначенных смен.`}
                        />
                      )}
                    </div>
                  </section>
                </>
              )}
              {screen === "availability" && (
                <AvailabilityEditor
                  state={state}
                  days={days}
                  dateNav={dateNav}
                  busy={busy}
                  action={action}
                />
              )}
            </motion.div>
          </AnimatePresence>
          <footer className="app-footer">
            <span>
              Смена<span className="orange-dot">.</span> Люди за каждым хорошим
              днём.
            </span>
            <span>
              Хлеб & Соль · Ташкент <span className="footer-dot">·</span> UTC+5
            </span>
          </footer>
        </main>
      </div>
      <AnimatePresence>
        {panel && (
          <PanelView
            key={panel.kind}
            panel={panel}
            state={state}
            week={week}
            close={() => setPanel(null)}
            onEdit={(shift) =>
              setPanel({
                kind: "assign",
                existing: shift,
                need: { ...shift, count: 1 },
              })
            }
            action={action}
            busy={busy}
            notify={notify}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            role="status"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            className={`toast ${toast.error ? "error" : ""}`}
          >
            {toast.error ? (
              <AlertCircle size={19} />
            ) : (
              <CheckCircle2 size={19} />
            )}
            <span>{toast.text}</span>
            <button
              aria-label="Закрыть сообщение"
              onClick={() => setToast(null)}
            >
              <X size={16} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
