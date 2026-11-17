export type Role = "manager" | "employee";
export type Position = "kitchen" | "cash" | "service";
export type ShiftStatus = "confirmed" | "pending";
export interface User {
  id: string;
  name: string;
  role: Role;
  email: string;
}
export interface EmployeeProfile {
  userId: string;
  position: Position;
  initials: string;
  color: string;
  maxHours: number;
  fulfilled: number;
}
export interface ManagerProfile {
  userId: string;
  restaurant: string;
}
export interface Availability {
  id: string;
  userId: string;
  date: string;
  start: number;
  end: number;
}
export interface Shift {
  id: string;
  userId: string;
  date: string;
  start: number;
  end: number;
  position: Position;
  status: ShiftStatus;
  note: string;
}
export interface ShiftRequest {
  id: string;
  userId: string;
  date: string;
  start: number;
  end: number;
  kind: string;
  message: string;
  status: "pending" | "approved" | "declined";
  createdAt: string;
}
export interface StaffingNeed {
  id: string;
  date: string;
  start: number;
  end: number;
  position: Position;
  count: number;
}
export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}
export interface DecisionLog {
  id: string;
  actorId: string;
  message: string;
  createdAt: string;
}
export interface AppState {
  user: User;
  users: User[];
  employees: EmployeeProfile[];
  manager: ManagerProfile;
  shifts: Shift[];
  availability: Availability[];
  requests: ShiftRequest[];
  needs: StaffingNeed[];
  notifications: Notification[];
  logs: DecisionLog[];
  today: string;
  demo: boolean;
}
export const positions: Record<
  Position,
  { name: string; short: string; color: string }
> = {
  kitchen: { name: "Кухня", short: "Кухня", color: "#ddefd4" },
  cash: { name: "Касса", short: "Касса", color: "#eee5fa" },
  service: { name: "Выдача", short: "Выдача", color: "#deecfa" },
};
