"use client";

// Fotos de progreso en IndexedDB (no caben en localStorage y nunca salen
// del dispositivo). DB separada del estado de la app.

export type ProgressPhoto = {
  id: string;
  fecha: string; // ISO
  blob: Blob;
};

const DB_NAME = "roxu-photos";
const STORE = "photos";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) {
        req.result.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openDB().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        t.oncomplete = () => db.close();
      })
  );
}

export function addPhoto(photo: ProgressPhoto): Promise<unknown> {
  return tx("readwrite", (s) => s.add(photo));
}

export async function listPhotos(): Promise<ProgressPhoto[]> {
  const all = await tx<ProgressPhoto[]>("readonly", (s) => s.getAll());
  return all.sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export function deletePhoto(id: string): Promise<unknown> {
  return tx("readwrite", (s) => s.delete(id));
}

// Reduce la imagen a máx 1080px de lado y JPEG 0.85 antes de guardar,
// para que la galería no se coma el almacenamiento del teléfono.
export function resizeImage(file: File, maxSide = 1080): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("canvas"));
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob"))),
        "image/jpeg",
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagen no válida"));
    };
    img.src = url;
  });
}
