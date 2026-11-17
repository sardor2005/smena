"use client";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Loader2,
  UtensilsCrossed,
} from "lucide-react";
import { useState } from "react";
import { Logo } from "./ui";
export default function Login({
  demo,
  busy,
  error,
  login,
}: {
  demo: boolean;
  busy: boolean;
  error: string;
  login: (role?: string, email?: string, password?: string) => Promise<void>;
}) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  return (
    <div className="login-page">
      <section className="login-story">
        <Logo />
        <span className="eyebrow">РАСПИСАНИЕ, В КОТОРОМ ЕСТЬ МЕСТО ЛЮДЯМ</span>
        <h1>
          Хорошая смена.
          <br />
          Сильная команда<span>.</span>
        </h1>
        <p>
          Доступность, пожелания и рабочий график.
          <br />
          Всё складывается, когда вы слышите друг друга.
        </p>
        <div className="login-calendar">
          <div className="mini-calendar-top">
            <span>Всё по плану</span>
            <span>
              <span className="live-dot" /> Команда в сборе
            </span>
          </div>
          <div className="mini-days">
            {["ПН", "ВТ", "СР", "ЧТ", "ПТ"].map((d, i) => (
              <div key={d}>
                <span>{d}</span>
                <strong>{16 + i}</strong>
                <div
                  className={`mini-shift ${["kitchen", "service", "cash", "kitchen", "service"][i]}`}
                  style={{ marginTop: i % 2 ? 45 : 12 }}
                >
                  <small>{i % 2 ? "15:00 — 21:00" : "09:00 — 15:00"}</small>
                  <span>
                    {["Кухня", "Выдача", "Касса", "Кухня", "Выдача"][i]}
                  </span>
                  <Check size={13} />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="login-story-footer">
          <span>Для тех, кто делает каждый день вкуснее.</span>
          <UtensilsCrossed size={19} />
        </div>
      </section>
      <section className="login-form">
        <div className="login-form-inner">
          <div className="login-top-icon">
            <ArrowUpRight size={28} />
          </div>
          <span className="eyebrow">ВАШЕ РАБОЧЕЕ ПРОСТРАНСТВО</span>
          <h2>Сработаемся.</h2>
          <p>Войдите, чтобы начать планировать.</p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              login(undefined, email, password);
            }}
          >
            <label className="form-label">
              Электронная почта
              <input
                type="email"
                required
                placeholder="you@restaurant.ru"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            <label className="form-label">
              Пароль
              <input
                type="password"
                required
                placeholder="Ваш пароль"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
            {error && (
              <div className="form-error" role="alert">
                {error}
              </div>
            )}
            <button className="button dark full" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={17} />
              ) : (
                <>
                  Войти в Смену <ArrowRight size={17} />
                </>
              )}
            </button>
          </form>
          {demo && (
            <>
              <div className="login-divider">
                <span>или познакомьтесь с продуктом</span>
              </div>
              <button
                className="button primary full"
                disabled={busy}
                onClick={() => login("manager")}
              >
                Открыть демо менеджера <ArrowUpRight size={17} />
              </button>
              <button
                className="button secondary full"
                disabled={busy}
                onClick={() => login("employee")}
              >
                Я сотрудник <ArrowRight size={17} />
              </button>
              <small className="demo-caption">
                Демо с примером команды. Изменения сохраняются
                <br />в локальной базе этого приложения.
              </small>
            </>
          )}
        </div>
        <span className="login-copyright">
          © Смена, 2026 · Создано для команды
        </span>
      </section>
    </div>
  );
}
