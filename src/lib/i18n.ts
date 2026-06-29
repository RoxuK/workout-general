"use client";

import { useStore } from "./store";
import EN from "../../content/i18n/en.json";

// i18n minimalista: el diccionario está indexado por el texto ESPAÑOL de origen.
// t("Guardar") -> "Guardar" en es, "Save" en en. Sirve igual para interfaz y
// para el contenido de los JSON. Lo que no esté traducido cae al español.
const DICT = EN as Record<string, string>;

export function useT() {
  const lang = useStore((s) => s.lang);
  return (s: string) => (lang === "en" ? DICT[s] ?? s : s);
}

export function useLang() {
  return useStore((s) => s.lang);
}
