"use client";

// Progress photos in IndexedDB (too large for localStorage, and they never
// leave the device). Separate DB from the rest of the app state.

export type ProgressPhoto = {
  id: string;
  date: string; // ISO
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
  return all.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function deletePhoto(id: string): Promise<unknown> {
  return tx("readwrite", (s) => s.delete(id));
}

// Shrinks the image to max 1080px on its longest side and JPEG 0.85 before
// saving, so the gallery doesn't eat up the phone's storage.
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
      reject(new Error("invalid image"));
    };
    img.src = url;
  });
}
