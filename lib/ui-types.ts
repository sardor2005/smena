import type { EmployeeProfile, Shift, StaffingNeed } from "./types";
export type Panel =
  | { kind: "shift"; shift: Shift }
  | { kind: "employee"; employee: EmployeeProfile }
  | { kind: "assign"; need?: StaffingNeed; existing?: Shift }
  | { kind: "need"; need?: StaffingNeed }
  | { kind: "request" }
  | { kind: "help" }
  | null;

export type Screen =
  | "schedule"
  | "overview"
  | "needs"
  | "employees"
  | "requests"
  | "logs"
  | "home"
  | "myshifts"
  | "availability"
  | "notifications"
  | "myrequests";
