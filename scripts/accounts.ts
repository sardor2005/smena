import { randomBytes, scryptSync } from "node:crypto";
import { db, transaction } from "../lib/db";
const bindings = [
  ["manager", process.env.MANAGER_PASSWORD],
  ["e1", process.env.EMPLOYEE_PASSWORD],
] as const;
const supplied = bindings.filter(
  (entry): entry is readonly ["manager" | "e1", string] => !!entry[1],
);
if (!supplied.length)
  throw new Error(
    "Set MANAGER_PASSWORD and/or EMPLOYEE_PASSWORD in the environment.",
  );
for (const [, password] of supplied)
  if (password.length < 12)
    throw new Error("Passwords must contain at least 12 characters.");
transaction(() => {
  for (const [userId, password] of supplied) {
    const salt = randomBytes(16).toString("hex");
    const encoded = salt + ":" + scryptSync(password, salt, 64).toString("hex");
    db.prepare("UPDATE users SET password=? WHERE id=?").run(encoded, userId);
    db.prepare("DELETE FROM sessions WHERE userId=?").run(userId);
    console.log(
      `Updated credentials for ${userId}; existing sessions revoked.`,
    );
  }
});
