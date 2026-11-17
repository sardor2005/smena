"use client";
import type { EmployeeProfile } from "@/lib/types";
import { CalendarDays, Command } from "lucide-react";
export function Avatar({
  employee,
  name,
  size = "normal",
}: {
  employee?: EmployeeProfile;
  name?: string;
  size?: string;
}) {
  return (
    <span
      className={`avatar ${size}`}
      style={{ background: employee?.color || "#dedbd2" }}
    >
      {employee?.initials ||
        name
          ?.split(" ")
          .map((x) => x[0])
          .slice(0, 2)
          .join("") ||
        "АМ"}
    </span>
  );
}
export function Badge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    confirmed: "Подтверждено",
    pending: "Ожидает ответа",
    approved: "Принято",
    declined: "Отклонено",
  };
  return (
    <span className={`badge ${status}`}>
      <span />
      {labels[status] || status}
    </span>
  );
}
export function Empty({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="empty">
      <CalendarDays size={30} />
      <h3>{title}</h3>
      <p>{body}</p>
      {action}
    </div>
  );
}
export function Logo() {
  return (
    <div className="brand">
      <span className="brand-icon">
        <Command size={24} strokeWidth={2.2} />
      </span>
      <span>
        смена<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
