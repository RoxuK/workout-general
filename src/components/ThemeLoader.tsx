"use client";

import { useEffect, useLayoutEffect } from "react";
import { getTheme, applyTheme } from "@/lib/theme";

// useLayoutEffect corre antes del pintado (evita el flash del tema por
// defecto), pero en el servidor no existe: ahí usamos useEffect.
const useBeforePaint = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// Re-aplica el tema guardado después de la hidratación.
// El script inline del layout lo pone antes del primer pintado, pero si React
// descarta el HTML del servidor (mismatch de fechas prerenderizadas) recrea
// <html> sin el data-theme. Este componente lo restaura antes de pintar.
export default function ThemeLoader() {
  useBeforePaint(() => {
    const t = getTheme();
    if (t !== "oro" || document.documentElement.dataset.theme) {
      applyTheme(t);
    }
  }, []);
  return null;
}
