"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Dumbbell, Apple, TrendingUp, ClipboardList } from "lucide-react";
import { cn } from "@/lib/utils";
import { useT } from "@/lib/i18n";

const tabs = [
  { href: "/", label: "Inicio", icon: Home },
  { href: "/plan", label: "Plan", icon: ClipboardList },
  { href: "/entreno", label: "Entreno", icon: Dumbbell },
  { href: "/nutricion", label: "Nutrición", icon: Apple },
  { href: "/progreso", label: "Progreso", icon: TrendingUp },
];

export default function BottomNav() {
  const path = usePathname();
  const t = useT();
  return (
    <nav className="fixed bottom-0 left-1/2 z-40 w-full max-w-app -translate-x-1/2 border-t border-line bg-bg/90 backdrop-blur-lg">
      <div className="flex items-stretch justify-around px-2 pb-[env(safe-area-inset-bottom)] pt-1.5">
        {tabs.map((tab) => {
          const active =
            tab.href === "/" ? path === "/" : path.startsWith(tab.href);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-[10px] transition",
                active ? "text-accent" : "text-muted"
              )}
            >
              <Icon size={20} strokeWidth={active ? 2.4 : 1.8} />
              <span className="font-medium tracking-wide">{t(tab.label)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
