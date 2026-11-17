"use client";
import {
  ArrowUpRight,
  Bell,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Command,
  ListChecks,
  Plus,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AppState } from "@/lib/types";
import type { Panel, Screen } from "@/lib/ui-types";
import { Avatar } from "./ui";

type Props = {
  state: AppState;
  screen: Screen;
  nav: { id: string; label: string; icon: LucideIcon }[];
  navigate: (screen: Screen) => void;
  setPanel: (panel: Panel) => void;
  mobile: boolean;
  closeMobile: () => void;
  collapsed: boolean;
  toggleCollapsed: () => void;
};
export default function Sidebar({
  state,
  screen,
  nav,
  navigate,
  setPanel,
  mobile,
  closeMobile,
  collapsed,
  toggleCollapsed,
}: Props) {
  const manager = state.user.role === "manager";
  const profile = state.employees.find((e) => e.userId === state.user.id);
  const pending = state.requests.filter((r) => r.status === "pending").length;
  const offers = state.shifts.filter(
    (s) => s.userId === state.user.id && s.status === "pending",
  ).length;
  const unread = state.notifications.filter((n) => !n.read).length;
  const showProfile = () =>
    setPanel({
      kind: "employee",
      employee: profile || {
        userId: state.user.id,
        position: "kitchen",
        initials: "АМ",
        color: "#bfcec9",
        maxHours: 40,
        fulfilled: 0,
      },
    });
  return (
    <aside
      id="app-sidebar"
      aria-label="Боковая навигация"
      className={`sidebar reference-sidebar ${mobile ? "open" : ""}`}
    >
      <div className="rail-brand">
        <span>
          <Command size={19} />
          <strong>смена.</strong>
        </span>
        <button
          className="rail-mobile-close"
          aria-label="Закрыть меню"
          onClick={closeMobile}
        >
          <X size={19} />
        </button>
      </div>
      <button
        className="rail-profile"
        onClick={showProfile}
        title={state.user.name}
        aria-label={`Профиль: ${state.user.name}`}
      >
        <Avatar employee={profile} name={state.user.name} />
        <span>
          <small>
            Хорошего дня <span aria-hidden="true">☀</span>
          </small>
          <strong>
            {state.user.name.split(" ")[0]} {state.user.name.split(" ")[1]?.[0]}
            .
          </strong>
        </span>
      </button>
      <button
        className="rail-toggle"
        aria-label={collapsed ? "Развернуть сайдбар" : "Свернуть сайдбар"}
        aria-expanded={!collapsed}
        aria-controls="sidebar-menu"
        title={collapsed ? "Развернуть" : "Свернуть"}
        onClick={toggleCollapsed}
      >
        {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
      </button>
      <div className="rail-divider" />
      <div className="rail-section-label">
        <span>Меню</span>
        <small>{nav.length + (manager ? 2 : 1)}</small>
      </div>
      <nav id="sidebar-menu" aria-label="Основные разделы">
        {nav.map((n) => {
          const count =
            n.id === "requests" ? pending : n.id === "myshifts" ? offers : 0;
          return (
            <button
              key={n.id}
              onClick={() => navigate(n.id as Screen)}
              className={screen === n.id ? "active" : ""}
              aria-label={n.label}
              aria-current={screen === n.id ? "page" : undefined}
              title={n.label}
            >
              <n.icon size={18} />
              <span>{n.label}</span>
              {count > 0 && <em aria-label={`${count} ожидают`}>{count}</em>}
            </button>
          );
        })}
        {manager && (
          <button
            onClick={() => navigate("logs")}
            className={screen === "logs" ? "active" : ""}
            aria-label="Журнал изменений"
            aria-current={screen === "logs" ? "page" : undefined}
            title="Журнал изменений"
          >
            <ListChecks size={18} />
            <span>Журнал изменений</span>
          </button>
        )}
        <button
          onClick={() => navigate("notifications")}
          className={screen === "notifications" ? "active" : ""}
          aria-label="Уведомления"
          aria-current={screen === "notifications" ? "page" : undefined}
          title="Уведомления"
        >
          <Bell size={18} />
          <span>Уведомления</span>
          {unread > 0 && (
            <em
              className="rail-notification-count"
              aria-label={`${unread} непрочитанных`}
            >
              {unread}
            </em>
          )}
        </button>
      </nav>
      <div className="rail-bottom">
        <div className="rail-section-label">
          <span>Пространство</span>
          <small>01</small>
        </div>
        <button
          className="rail-venue"
          onClick={() => setPanel({ kind: "help" })}
          aria-label="Хлеб & Соль — о пространстве"
          title="Хлеб & Соль"
        >
          <span className="rail-venue-icon">
            <UtensilsCrossed size={17} />
          </span>
          <span>
            <strong>Хлеб & Соль</strong>
            <small>Ташкент · UTC+5</small>
          </span>
          <ArrowUpRight size={13} />
        </button>
        <div className="rail-utilities">
          <button
            onClick={() => setPanel({ kind: "help" })}
            aria-label="Как устроена Смена"
            title="Как устроена Смена"
          >
            <CircleHelp size={17} />
            <span>Помощь и подсказки</span>
            <ArrowUpRight size={13} />
          </button>
        </div>
        <button
          className="rail-create"
          onClick={() =>
            setPanel(manager ? { kind: "assign" } : { kind: "request" })
          }
          aria-label={manager ? "Создать новую смену" : "Новое пожелание"}
          title={manager ? "Создать новую смену" : "Новое пожелание"}
        >
          <span className="rail-create-icon">
            <Plus size={24} />
          </span>
          <strong>{manager ? "Создать смену" : "Новое пожелание"}</strong>
          <small>
            {manager ? "Спланируем хороший день" : "Пусть вас услышат"}
          </small>
        </button>
      </div>
    </aside>
  );
}
