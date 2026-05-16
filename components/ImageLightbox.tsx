"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import clsx from "clsx";

type Props = {
  open: boolean;
  onClose: () => void;
  src: string;
  alt: string;
};

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

export function ImageLightbox({ open, onClose, src, alt }: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const panRef = useRef<{ sx: number; sy: number; tx0: number; ty0: number } | null>(null);
  const pinchRef = useRef<{ dist: number; scale0: number } | null>(null);

  useEffect(() => {
    if (!open) {
      setScale(1);
      setTx(0);
      setTy(0);
      panRef.current = null;
      pinchRef.current = null;
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const setScaleClamped = useCallback((s: number) => {
    setScale(clamp(s, 1, 4));
  }, []);

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      const next = scale + (-e.deltaY > 0 ? 0.12 : -0.12);
      setScaleClamped(next);
    },
    [scale, setScaleClamped],
  );

  const onPointerDownPan = (e: React.PointerEvent) => {
    if (scale <= 1) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    panRef.current = { sx: e.clientX, sy: e.clientY, tx0: tx, ty0: ty };
  };

  const onPointerMovePan = (e: React.PointerEvent) => {
    const p = panRef.current;
    if (!p) return;
    const dx = e.clientX - p.sx;
    const dy = e.clientY - p.sy;
    setTx(p.tx0 + dx);
    setTy(p.ty0 + dy);
  };

  const onPointerUpPan = (e: React.PointerEvent) => {
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* noop */
    }
    panRef.current = null;
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      pinchRef.current = { dist, scale0: scale };
    }
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchRef.current) {
      e.preventDefault();
      const a = e.touches[0];
      const b = e.touches[1];
      const dist = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
      const ratio = dist / pinchRef.current.dist;
      setScaleClamped(pinchRef.current.scale0 * ratio);
    }
  };

  const onTouchEnd = () => {
    pinchRef.current = null;
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black/85 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="圖片檢視"
    >
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-white/10 shrink-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
            aria-label="縮小"
            onClick={() => setScaleClamped(scale - 0.25)}
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
            aria-label="放大"
            onClick={() => setScaleClamped(scale + 0.25)}
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
            aria-label="重設縮放"
            onClick={() => {
              setScale(1);
              setTx(0);
              setTy(0);
            }}
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <label className="flex items-center gap-2 text-xs text-white/80 ml-1">
            <span className="tabular-nums w-10 text-right">{scale.toFixed(2)}×</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.05}
              value={scale}
              onChange={(ev) => setScaleClamped(parseFloat(ev.target.value))}
              className="w-28 md:w-40 accent-[var(--accent-lime)]"
              aria-label="縮放滑桿"
            />
          </label>
        </div>
        <button
          type="button"
          className="p-2 rounded-lg bg-white/10 hover:bg-white/15 text-white"
          aria-label="關閉"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 min-h-0 relative">
        <button
          type="button"
          className="absolute inset-0 w-full h-full"
          aria-label="關閉檢視"
          onClick={onClose}
        >
          <span className="sr-only">點背景關閉</span>
        </button>

        <div
          className="absolute inset-0 flex items-center justify-center p-3 pt-1"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className={clsx(
              "relative max-w-full max-h-full flex items-center justify-center",
              scale > 1 && "cursor-grab active:cursor-grabbing",
            )}
            onWheel={onWheel}
            onPointerDown={onPointerDownPan}
            onPointerMove={onPointerMovePan}
            onPointerUp={onPointerUpPan}
            onPointerCancel={onPointerUpPan}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt={alt}
              draggable={false}
            className="max-w-[min(96vw,1200px)] max-h-[min(78vh,800px)] w-auto h-auto object-contain rounded-lg shadow-2xl select-none touch-none"
            style={{
              transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
              transformOrigin: "center center",
            }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
