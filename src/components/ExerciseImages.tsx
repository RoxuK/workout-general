"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { ImageIcon, X, Youtube } from "lucide-react";
import { imagesFor } from "@/lib/content";

export default function ExerciseImages({ name }: { name: string }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const imgs = imagesFor(name);
  const yt = `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " technique form")}`;

  return (
    <>
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="View exercise images"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line bg-surface-2 text-accent active:scale-95"
      >
        <ImageIcon size={17} />
      </button>

      {open && mounted && createPortal(
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="max-h-[88vh] w-full max-w-app overflow-y-auto rounded-t-2xl border border-line bg-surface p-4 pb-8 sm:rounded-2xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <h3 className="font-display text-xl leading-tight">{name}</h3>
              <button onClick={() => setOpen(false)} className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-line text-muted">
                <X size={18} />
              </button>
            </div>

            {imgs.length > 0 ? (
              <div className="space-y-3">
                {imgs.map((src, i) => (
                  <figure key={i} className="overflow-hidden rounded-xl border border-line bg-white">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={src} alt={`${name} — position ${i + 1}`} loading="eager" className="h-auto w-full object-contain" />
                    <figcaption className="bg-surface-2 px-3 py-1.5 text-[11px] text-muted">
                      {imgs.length === 2 ? (i === 0 ? "Starting position" : "End position") : `Image ${i + 1}`}
                    </figcaption>
                  </figure>
                ))}
                <a href={yt} target="_blank" rel="noreferrer" className="btn-ghost w-full gap-2 text-sm">
                  <Youtube size={16} className="text-bad" /> Watch a form video
                </a>
                <p className="text-center text-[10px] text-muted">Images: free-exercise-db (open license)</p>
              </div>
            ) : (
              <div className="py-4 text-center">
                <p className="mb-4 text-sm text-muted">No reference image for this exercise.</p>
                <a href={yt} target="_blank" rel="noreferrer" className="btn-accent w-full gap-2">
                  <Youtube size={18} /> Watch a form video
                </a>
              </div>
            )}
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
