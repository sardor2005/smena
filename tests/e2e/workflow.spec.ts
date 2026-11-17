import { test, expect } from "@playwright/test";
import { format, addDays, startOfWeek, parseISO } from "date-fns";
test("availability → request → recommendation → offer → acceptance persists with role boundaries", async ({
  page,
  request,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Я сотрудник", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Привет, Анна!" }),
  ).toBeVisible();
  const today = await page.evaluate(async () => {
    return (await (await fetch("/api/state")).json()).today;
  });
  const date = format(
    addDays(startOfWeek(parseISO(today), { weekStartsOn: 1 }), 7),
    "yyyy-MM-dd",
  );
  await page.getByRole("button", { name: "Доступность", exact: true }).click();
  await page.getByRole("button", { name: "Следующая неделя" }).click();
  await page.locator(".availability-day").first().getByRole("checkbox").check();
  await page.getByLabel(`Начало ${date}`).selectOption("9");
  await page.getByLabel(`Конец ${date}`).selectOption("21");
  await page.getByRole("button", { name: "Сохранить доступность" }).click();
  await expect(page.getByRole("status")).toContainText("Доступность сохранена");
  // A forged manager action is rejected and other employees' data is hidden.
  const restricted = await page.evaluate(async () => {
    const r = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "need",
        date: "2026-12-01",
        start: 9,
        end: 15,
        position: "kitchen",
        count: 2,
      }),
    });
    return { status: r.status, data: await (await fetch("/api/state")).json() };
  });
  expect(restricted.status).toBe(400);
  expect(
    restricted.data.users.filter(
      (u: { role: string }) => u.role === "employee",
    ),
  ).toHaveLength(1);
  expect(restricted.data.needs).toHaveLength(0);
  await page
    .getByRole("button", { name: "Мои пожелания", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Отправить пожелание", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Дата", { exact: true }).fill(date);
  await dialog
    .getByLabel("Ваше пожелание", { exact: true })
    .fill("Готова выйти утром в понедельник");
  await dialog.getByRole("button", { name: "Отправить пожелание" }).click();
  await expect(page.getByRole("status")).toContainText("Пожелание отправлено");
  await page.getByRole("button", { name: "Панель менеджера" }).click();
  await expect(
    page.getByRole("heading", { name: "Расписание команды." }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Добавить смену", exact: true })
    .click();
  await dialog.getByLabel("Дата", { exact: true }).fill(date);
  const anna = dialog
    .locator(".candidate")
    .filter({ hasText: "Анна Смирнова" });
  await expect(anna).toBeEnabled();
  await anna.click();
  await dialog.getByRole("button", { name: "Продолжить" }).click();
  await dialog
    .getByRole("button", { name: "Отправить предложение", exact: true })
    .click();
  await expect(page.getByRole("status")).toContainText(
    "Предложение отправлено",
  );
  // Overlapping offer is rejected even if the UI is bypassed.
  const duplicate = await page.evaluate(async (date) => {
    const r = await fetch("/api/actions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "assign",
        userId: "e1",
        date,
        start: 9,
        end: 15,
        position: "kitchen",
        offer: false,
      }),
    });
    return r.status;
  }, date);
  expect(duplicate).toBe(400);
  await page.getByRole("button", { name: "Кабинет сотрудника" }).click();
  await expect(
    page.locator(".offer-card").filter({ hasText: "09:00 — 15:00" }),
  ).toBeVisible();
  await page
    .locator(".offer-card")
    .filter({ hasText: "09:00 — 15:00" })
    .getByRole("button", { name: "Принимаю" })
    .click();
  await expect(page.getByRole("status")).toContainText("Смена подтверждена");
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Привет, Анна!" }),
  ).toBeVisible();
  const saved = await page.evaluate(
    async (date) =>
      (await (await fetch("/api/state")).json()).shifts.find(
        (s: { date: string; start: number }) =>
          s.date === date && s.start === 9,
      ),
    date,
  );
  expect(saved.status).toBe("confirmed");
  await page.getByRole("button", { name: "Панель менеджера" }).click();
  await page.getByRole("button", { name: "Журнал изменений" }).click();
  await expect(page.locator(".timeline")).toContainText(
    "Анна Смирнова принял(а) смену",
  );
  expect(errors).toEqual([]);
  const unauth = await request.get("/api/state");
  expect(unauth.status()).toBe(401);
});
test("mobile employee views fit, navigation and keyboard dialog work", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.getByRole("button", { name: "Я сотрудник", exact: true }).click();
  await expect(page.locator(".employee-welcome")).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page.getByRole("button", { name: "Доступность", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Когда вам удобно?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Открыть меню" }).click();
  await page
    .getByRole("button", { name: "Мои пожелания", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Отправить пожелание", exact: true })
    .first()
    .click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("editing a shift updates the same record after server validation", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Открыть демо менеджера" }).click();
  await expect(page.locator(".week-calendar")).toBeVisible();
  const before = await page.evaluate(async () => {
    const s = await (await fetch("/api/state")).json();
    return {
      count: s.shifts.length,
      id: s.shifts.find((s: { status: string }) => s.status === "confirmed").id,
    };
  });
  await page.locator(".shift-card.confirmed").first().click();
  let dialog = page.getByRole("dialog");
  await dialog.getByRole("button", { name: "Изменить смену" }).click();
  dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Комментарий, необязательно")
    .fill("Встречаем поставку перед открытием");
  await dialog.getByRole("checkbox").uncheck();
  await dialog.getByRole("button", { name: "Продолжить" }).click();
  await dialog
    .getByRole("button", { name: "Подтвердить смену", exact: true })
    .click();
  await expect(dialog).toBeHidden();
  const after = await page.evaluate(async () => {
    const s = await (await fetch("/api/state")).json();
    return {
      count: s.shifts.length,
      updated: s.shifts.find(
        (s: { note: string }) =>
          s.note === "Встречаем поставку перед открытием",
      ),
    };
  });
  expect(after.count).toBe(before.count);
  expect(after.updated.id).toBe(before.id);
  expect(after.updated.status).toBe("confirmed");
});
