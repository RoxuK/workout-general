import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import AppGate from "@/components/AppGate";
import BottomNav from "@/components/BottomNav";
import RegisterSW from "@/components/RegisterSW";
import ReminderScheduler from "@/components/ReminderScheduler";
import ThemeLoader from "@/components/ThemeLoader";

const display = Fraunces({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-display",
  display: "swap",
});

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roxu · Entreno",
  description: "Plan de entrenamiento y nutrición personalizado de Roxu",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Roxu" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0e",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`} suppressHydrationWarning>
      <body className="min-h-dvh bg-bg text-ink">
        {/* Aplica el theme guardado antes de pintar, para evitar flash */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('roxu-theme');if(t&&t!=='oro')document.documentElement.dataset.theme=t}catch(e){}",
          }}
        />
        <ThemeLoader />
        <RegisterSW />
        <ReminderScheduler />
        <main className="mx-auto min-h-dvh w-full max-w-app px-4 pb-28">{children}</main>
        <BottomNav />
        <AppGate />
      </body>
    </html>
  );
}
