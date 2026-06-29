"use client";

// Paletas de la app. Los colores viven en globals.css como [data-theme=...];
// aquí solo está la lista para el selector y la persistencia.

export const THEME_KEY = "roxu-theme";

export type ThemeId = "oro" | "bosque" | "electrico" | "claro";

export const THEMES: { id: ThemeId; nombre: string; desc: string; swatch: [string, string] }[] = [
  { id: "oro", nombre: "Oro nocturno", desc: "El clásico de la app", swatch: ["#0d0d0e", "#d8a84e"] },
  { id: "bosque", nombre: "Bosque", desc: "Verde calmado y oscuro", swatch: ["#0b110d", "#93cd7e"] },
  { id: "electrico", nombre: "Eléctrico", desc: "Azul noche con cian", swatch: ["#0a0c12", "#6fd3f2"] },
  { id: "claro", nombre: "Claro minimal", desc: "Para entrenar a plena luz", swatch: ["#f6f3ee", "#c89540"] },
];

const THEME_BG: Record<ThemeId, string> = {
  oro: "#0d0d0e",
  bosque: "#0b110d",
  electrico: "#0a0c12",
  claro: "#f6f3ee",
};

export function getTheme(): ThemeId {
  if (typeof window === "undefined") return "oro";
  const t = localStorage.getItem(THEME_KEY);
  return THEMES.some((th) => th.id === t) ? (t as ThemeId) : "oro";
}

export function applyTheme(id: ThemeId) {
  if (id === "oro") delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = id;
  localStorage.setItem(THEME_KEY, id);
  // Barra de estado del móvil a juego con el fondo
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_BG[id]);
}
