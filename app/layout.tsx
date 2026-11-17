import Providers from "@/components/providers";
import type { Metadata } from "next";
import "./globals.css";
import "./reference-theme.css";
import "./sidebar.css";
export const metadata: Metadata = {
  title: "Смена — всё по плану",
  description:
    "Планирование смен команды ресторана. Доступность, пожелания и решения в одном месте.",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
