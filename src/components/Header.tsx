"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { useT } from "@/lib/i18n";

export default function Header({
  eyebrow,
  title,
  right,
  back,
}: {
  eyebrow?: string;
  title: string;
  right?: React.ReactNode;
  back?: string;
}) {
  const t = useT();
  return (
    <header className="mb-5 flex items-end justify-between gap-3 pt-2">
      <div className="min-w-0">
        {back ? (
          <Link href={back} className="mb-1 inline-flex items-center gap-1 text-xs text-muted">
            <ChevronLeft size={14} /> {t("Volver")}
          </Link>
        ) : (
          eyebrow && <div className="label mb-1">{t(eyebrow)}</div>
        )}
        <h1 className="section-title truncate">{t(title)}</h1>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  );
}
