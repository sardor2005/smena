import { format, parseISO } from "date-fns";
import { ru } from "date-fns/locale";
export const fmt = (date: string, pattern = "d MMM") =>
  format(parseISO(date), pattern, { locale: ru });
export const time = (n: number) => `${String(n).padStart(2, "0")}:00`;

/** Event timestamps always use the restaurant's timezone, independent of the browser. */
export const stamp = (date: string, long = false) =>
  new Intl.DateTimeFormat("ru-RU", {
    timeZone: "Asia/Tashkent",
    day: "numeric",
    month: long ? "long" : "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(date));
