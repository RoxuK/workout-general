# Roxu · Entreno 🏋️

App personal de entrenamiento y nutrición de **Roxu**. PWA instalable en Android, mobile-first, datos en local (offline). Estética editorial oscura.

> Tu entrenador (Claude) genera los planes como datos en este repo. Tú registras tus entrenos en el móvil. Los reportes hacen de puente para ajustar y progresar.

## Cómo funciona

- **Planes = contenido como código.** Los bloques de entrenamiento, nutrición y listas viven en `/content` como JSON. Para actualizar un plan, se edita/añade un JSON y se hace push → Vercel redespliega solo → la app muestra el bloque nuevo.
- **Tus registros viven en tu teléfono** (localStorage/IndexedDB). Cambiar el plan **no** borra tu historial.
- **Reportes** (pestaña Reportes) generan un Markdown con tu evolución para compartir con el entrenador.

## Actualizar a un bloque nuevo

1. Crear `content/plans/AAAA-MM-DD-bloque-N.json` (copia la estructura del bloque 1).
2. Añadirlo a `PLANES` en `src/lib/content.ts`.
3. El plan activo se elige por fecha (`fechaInicio`–`fechaFin`).
4. `git push` → deploy automático.

## Desarrollo

```bash
npm install
npm run icons   # genera los iconos PWA (requiere sharp)
npm run dev     # http://localhost:3000
npm run build   # build de producción
```

## Stack

Next.js 14 · TypeScript · Tailwind + estética propia · Zustand (persistencia local) · Recharts · Framer Motion · PWA (service worker propio).

## Estructura

```
content/            ← lo que genera el entrenador (JSON editable)
  plans/            ← bloques de entrenamiento
  nutrition/        ← targets, lista de la compra
  knowledge/        ← comer fuera Berlín, recuperación lumbar
src/
  app/              ← pantallas (Inicio, Plan, Entreno, Nutrición, Progreso, Reportes, Ajustes)
  components/       ← UI (BottomNav, Ring, Header…)
  lib/              ← tipos, store local, carga de contenido, utilidades
public/             ← manifest, service worker, iconos
```
