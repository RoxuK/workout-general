"use client";

import { useStore } from "./store";
import en1 from "../../content/i18n/en-1.json";
import en2 from "../../content/i18n/en-2.json";
import en3 from "../../content/i18n/en-3.json";
import en4 from "../../content/i18n/en-4.json";
import en5 from "../../content/i18n/en-5.json";

// i18n minimalista: el diccionario está indexado por el texto ESPAÑOL de origen.
// t("Guardar") -> "Guardar" en es, "Save" en en. Sirve igual para interfaz y
// para el contenido de los JSON. Lo que no esté traducido cae al español.
// Diccionario partido en 5 ficheros para que cada uno sea manejable de editar.
const DICT: Record<string, string> = { ...en1, ...en2, ...en3, ...en4, ...en5 };

export function useT() {
  const lang = useStore((s) => s.lang);
  return (s: string) => (lang === "en" ? DICT[s] ?? s : s);
}

export function useLang() {
  return useStore((s) => s.lang);
}
