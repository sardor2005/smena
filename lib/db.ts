import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import type {
  AppState,
  Availability,
  DecisionLog,
  EmployeeProfile,
  Notification,
  Shift,
  ShiftRequest,
  StaffingNeed,
  User,
} from "./types";
const dir = process.env.DATA_DIR || join(process.cwd(), ".data");
mkdirSync(dir, { recursive: true });
const globalDB = globalThis as unknown as { smenaDB?: DatabaseSync };
export const db =
  globalDB.smenaDB || new DatabaseSync(join(dir, "smena.sqlite"));
globalDB.smenaDB = db;
db.exec(
  "PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;",
);
db.exec(`CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, role TEXT NOT NULL, password TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,userId TEXT REFERENCES users(id),expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS employees(id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS managers(id TEXT PRIMARY KEY REFERENCES users(id), data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS shifts(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS availability(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS requests(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS needs(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS notifications(id TEXT PRIMARY KEY,data TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS logs(id TEXT PRIMARY KEY,data TEXT NOT NULL);`);
export const id = () => randomUUID();
export const today = () =>
  new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Tashkent" });
export const demoEnabled = () => process.env.DEMO_MODE !== "false";
const tables = new Set([
  "employees",
  "managers",
  "shifts",
  "availability",
  "requests",
  "needs",
  "notifications",
  "logs",
]);
export function list<T>(table: string): T[] {
  if (!tables.has(table)) throw Error("Invalid table");
  return (
    db.prepare(`SELECT data FROM ${table}`).all() as { data: string }[]
  ).map((r) => JSON.parse(r.data));
}
export function put<T extends { id?: string; userId?: string }>(
  table: string,
  value: T,
) {
  if (!tables.has(table)) throw Error("Invalid table");
  db.prepare(`INSERT OR REPLACE INTO ${table}(id,data) VALUES (?,?)`).run(
    value.id || value.userId!,
    JSON.stringify(value),
  );
}
export function remove(table: string, key: string) {
  if (!tables.has(table)) throw Error("Invalid table");
  db.prepare(`DELETE FROM ${table} WHERE id=?`).run(key);
}
export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    db.exec("COMMIT");
    return r;
  } catch (e) {
    db.exec("ROLLBACK");
    throw e;
  }
}
function hash(password: string, salt = randomBytes(16).toString("hex")) {
  return salt + ":" + scryptSync(password, salt, 64).toString("hex");
}
export function checkPassword(password: string, encoded: string) {
  const [salt, key] = encoded.split(":");
  const actual = scryptSync(password, salt, 64);
  return timingSafeEqual(actual, Buffer.from(key, "hex"));
}
export function users(): User[] {
  return db
    .prepare("SELECT id,name,email,role FROM users")
    .all() as unknown as User[];
}
export function session(token?: string): User | undefined {
  if (!token) return;
  return db
    .prepare(
      "SELECT u.id,u.name,u.email,u.role FROM sessions s JOIN users u ON u.id=s.userId WHERE s.token=? AND s.expires>?",
    )
    .get(
      createHash("sha256").update(token).digest("hex"),
      Date.now(),
    ) as unknown as User | undefined;
}
export function createSession(userId: string) {
  const token = randomBytes(32).toString("hex");
  db.prepare("DELETE FROM sessions WHERE expires<?").run(Date.now());
  db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
    createHash("sha256").update(token).digest("hex"),
    userId,
    Date.now() + 7 * 86400000,
  );
  return token;
}
export function deleteSession(token: string) {
  db.prepare("DELETE FROM sessions WHERE token=?").run(
    createHash("sha256").update(token).digest("hex"),
  );
}
export function notify(userId: string, title: string, body: string) {
  put("notifications", {
    id: id(),
    userId,
    title,
    body,
    read: false,
    createdAt: new Date().toISOString(),
  } as Notification);
}
export function log(actorId: string, message: string) {
  put("logs", {
    id: id(),
    actorId,
    message,
    createdAt: new Date().toISOString(),
  } as DecisionLog);
}
export function getState(user: User): AppState {
  const allUsers = users();
  const isManager = user.role === "manager";
  return {
    user,
    users: isManager
      ? allUsers
      : allUsers.filter((u) => u.id === user.id || u.role === "manager"),
    employees: list<EmployeeProfile>("employees").filter(
      (e) => isManager || e.userId === user.id,
    ),
    manager: list<AppState["manager"]>("managers")[0],
    shifts: list<Shift>("shifts").filter(
      (s) => isManager || s.userId === user.id,
    ),
    availability: list<Availability>("availability").filter(
      (s) => isManager || s.userId === user.id,
    ),
    requests: list<ShiftRequest>("requests").filter(
      (s) => isManager || s.userId === user.id,
    ),
    needs: isManager ? list<StaffingNeed>("needs") : [],
    notifications: list<Notification>("notifications")
      .filter((n) => n.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    logs: isManager ? list<DecisionLog>("logs").reverse() : [],
    today: today(),
    demo: demoEnabled(),
  };
}
function seed() {
  if ((db.prepare("SELECT count(*) as n FROM users").get() as { n: number }).n)
    return;
  const insert = db.prepare("INSERT INTO users VALUES(?,?,?,?,?)");
  insert.run(
    "manager",
    "Александр Морозов",
    "manager@smena.local",
    "manager",
    hash(process.env.MANAGER_PASSWORD || randomBytes(24).toString("hex")),
  );
  put("managers", { userId: "manager", restaurant: "Хлеб & Соль · Ташкент" });
  const names = [
    "Анна Смирнова",
    "Михаил Волков",
    "Елена Ким",
    "Даниил Соколов",
    "София Петрова",
    "Артём Иванов",
    "Мария Юсупова",
    "Тимур Алиев",
    "Полина Орлова",
    "Никита Попов",
    "Алина Каримова",
    "Максим Лебедев",
  ];
  const cols = [
    "#edb887",
    "#d7b2bf",
    "#b6c9ad",
    "#b0c2d8",
    "#d7bc94",
    "#b9add0",
  ];
  const base = new Date(`${today()}T12:00:00Z`);
  base.setUTCDate(base.getUTCDate() - ((base.getUTCDay() + 6) % 7));
  const date = (i: number) => {
    const d = new Date(base);
    d.setUTCDate(d.getUTCDate() + i);
    return d.toISOString().slice(0, 10);
  };
  names.forEach((name, i) => {
    const uid = `e${i + 1}`;
    insert.run(
      uid,
      name,
      `employee${i + 1}@smena.local`,
      "employee",
      hash(
        i === 0 && process.env.EMPLOYEE_PASSWORD
          ? process.env.EMPLOYEE_PASSWORD
          : randomBytes(24).toString("hex"),
      ),
    );
    const position = (["kitchen", "cash", "service"] as const)[
      Math.floor(i / 4)
    ];
    put("employees", {
      userId: uid,
      position,
      initials: name
        .split(" ")
        .map((x) => x[0])
        .join(""),
      color: cols[i % cols.length],
      maxHours: 40,
      fulfilled: i % 3,
    } as EmployeeProfile);
    for (let d = 0; d < 7; d++) {
      put("availability", {
        id: `a${i}-${d}`,
        userId: uid,
        date: date(d),
        start: 8,
        end: 23,
      } as Availability);
      if ((d + i) % 3 !== 0 && d < 6) {
        const start = (i + d) % 2 === 0 ? 9 : 15;
        put("shifts", {
          id: `s${i}-${d}`,
          userId: uid,
          date: date(d),
          start,
          end: start + 6,
          position,
          status: (i + d) % 7 === 0 ? "pending" : "confirmed",
          note: "",
        } as Shift);
      }
    }
  });
  for (let d = 0; d < 7; d++)
    for (const position of ["kitchen", "cash", "service"] as const)
      for (const [start, end, count] of [
        [9, 15, 2],
        [15, 21, 2],
      ])
        put("needs", {
          id: `n${d}-${position}-${start}`,
          date: date(d),
          start,
          end,
          position,
          count,
        } as StaffingNeed);
  for (const [i, uid, kind, msg] of [
    [0, "e1", "wish", "Хочу выйти в вечернюю смену — утром учёба."],
    [1, "e5", "dayoff", "Нужен выходной по семейным обстоятельствам."],
    [2, "e9", "wish", "Могу подменить коллегу на выдаче."],
  ] as const)
    put("requests", {
      id: `r${i}`,
      userId: uid,
      date: date(5),
      start: 15,
      end: 21,
      kind,
      message: msg,
      status: "pending",
      createdAt: new Date().toISOString(),
    } as ShiftRequest);
  notify(
    "e1",
    "Добро пожаловать в Смену",
    "Отметьте доступность на неделю — менеджер учтёт её при составлении расписания.",
  );
  notify(
    "manager",
    "Пожелания на новую неделю",
    "Сотрудники отправили 3 запроса. Посмотрите их до публикации графика.",
  );
  log("manager", "Создан черновик расписания на текущую неделю");
}
transaction(seed);
