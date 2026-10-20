"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type CeremonyVariant = "publish" | "draft" | "community";

type PublishCeremonyProps = {
  variant: CeremonyVariant;
  phase: "working" | "done";
  title: string;
  coverUrl: string | null;
  link: string | null;
  onClose: () => void;
};

// Same palette as the idea wheel, so the celebration feels part of the studio.
const CONFETTI_COLORS = ["#ff5c35", "#d7ff52", "#4468ff", "#f2a7c3", "#ffca3a", "#50c8a8"];

// Fast responses would make the press flash by; keep it on screen long enough to read.
const MIN_WORKING_MS = 2200;

const WORKING_STEPS: Record<CeremonyVariant, string[]> = {
  publish: ["Entintando la portada", "Maquetando la página", "Enviando a WordPress", "Encendiendo la rotativa"],
  draft: ["Entintando la portada", "Maquetando la página", "Guardando el borrador"],
  community: [
    "Leyendo tu artículo",
    "Comprobando el tono",
    "Revisión editorial",
    "Maquetando la página",
    "Encendiendo la rotativa",
  ],
};

const DONE_COPY: Record<CeremonyVariant, { stamp: string; headline: string; body: string }> = {
  publish: {
    stamp: "Publicado",
    headline: "Ya está en el mundo.",
    body: "La pieza está viva en El Salto Web. Compártela mientras está recién salida de la imprenta.",
  },
  draft: {
    stamp: "Borrador",
    headline: "Guardado en la mesa de edición.",
    body: "El borrador te espera en WordPress para la revisión final.",
  },
  community: {
    stamp: "Publicado",
    headline: "Tu firma ya está en El Salto Web.",
    body: "Ha superado la revisión y ya se puede leer. Compártelo: está recién impreso.",
  },
};

function launchConfetti(canvas: HTMLCanvasElement) {
  const context = canvas.getContext("2d");
  if (!context) return () => undefined;

  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width * ratio;
  canvas.height = height * ratio;
  context.scale(ratio, ratio);

  type Piece = {
    x: number; y: number; vx: number; vy: number;
    size: number; color: string; spin: number; angle: number; strip: boolean;
  };
  const pieces: Piece[] = [];
  const burst = (originX: number, originY: number, count: number, spread: number, direction: number) => {
    for (let index = 0; index < count; index += 1) {
      const angle = direction + (Math.random() - 0.5) * spread;
      const speed = 7 + Math.random() * 11;
      pieces.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 6 + Math.random() * 8,
        color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
        spin: (Math.random() - 0.5) * 0.4,
        angle: Math.random() * Math.PI,
        strip: Math.random() > 0.6,
      });
    }
  };

  // One burst from the stamp, two cannons from the bottom corners.
  burst(width / 2, height * 0.42, 140, Math.PI * 2, 0);
  burst(0, height, 60, 0.7, -Math.PI / 3);
  burst(width, height, 60, 0.7, (-Math.PI * 2) / 3);

  let frame = 0;
  const start = performance.now();
  const tick = (now: number) => {
    const elapsed = now - start;
    context.clearRect(0, 0, width, height);
    context.globalAlpha = Math.max(0, 1 - Math.max(0, elapsed - 2600) / 1200);
    for (const piece of pieces) {
      piece.vx *= 0.985;
      piece.vy = piece.vy * 0.985 + 0.32;
      piece.x += piece.vx;
      piece.y += piece.vy;
      piece.angle += piece.spin;
      context.save();
      context.translate(piece.x, piece.y);
      context.rotate(piece.angle);
      context.scale(1, Math.cos(piece.angle * 2));
      context.fillStyle = piece.color;
      if (piece.strip) {
        context.fillRect(-piece.size / 2, -piece.size / 6, piece.size * 1.6, piece.size / 3);
      } else {
        context.fillRect(-piece.size / 2, -piece.size / 2, piece.size, piece.size * 0.7);
      }
      context.restore();
    }
    if (elapsed < 3800) frame = requestAnimationFrame(tick);
    else context.clearRect(0, 0, width, height);
  };
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

export function PublishCeremony({ variant, phase, title, coverUrl, link, onClose }: PublishCeremonyProps) {
  const [shownPhase, setShownPhase] = useState<"working" | "done">("working");
  const [stepIndex, setStepIndex] = useState(0);
  const [linkCopied, setLinkCopied] = useState(false);
  const openedAtRef = useRef(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const primaryRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    openedAtRef.current = performance.now();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase !== "done") return undefined;
    const wait = Math.max(0, MIN_WORKING_MS - (performance.now() - openedAtRef.current));
    const timer = window.setTimeout(() => setShownPhase("done"), wait);
    return () => window.clearTimeout(timer);
  }, [phase]);

  const steps = WORKING_STEPS[variant];
  useEffect(() => {
    if (shownPhase !== "working") return undefined;
    // Stop on the last step: the real request decides when the press is done.
    const timer = window.setInterval(
      () => setStepIndex((index) => Math.min(index + 1, steps.length - 1)),
      1400
    );
    return () => window.clearInterval(timer);
  }, [shownPhase, steps.length]);

  useEffect(() => {
    if (shownPhase !== "done") return undefined;
    primaryRef.current?.focus();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (variant === "draft" || reducedMotion || !canvasRef.current) return undefined;
    // Let the stamp land first, then fire.
    let stop = () => undefined as void;
    const timer = window.setTimeout(() => {
      if (canvasRef.current) stop = launchConfetti(canvasRef.current);
    }, 380);
    return () => {
      window.clearTimeout(timer);
      stop();
    };
  }, [shownPhase, variant]);

  useEffect(() => {
    if (shownPhase !== "done") return undefined;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, shownPhase]);

  const copyLink = useCallback(async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setLinkCopied(true);
    } catch {
      setLinkCopied(false);
    }
  }, [link]);

  const done = shownPhase === "done";
  const copy = DONE_COPY[variant];
  const shareText = encodeURIComponent(title);
  const shareUrl = link ? encodeURIComponent(link) : "";
  const canShare = done && link && variant !== "draft";

  return (
    <div
      className="press-ceremony"
      data-phase={shownPhase}
      data-variant={variant}
      role="dialog"
      aria-modal="true"
      aria-label={done ? copy.headline : "Publicando"}
    >
      <div className="press-ceremony-rays" aria-hidden="true" />
      <canvas ref={canvasRef} className="press-ceremony-confetti" aria-hidden="true" />

      <div className="press-ceremony-body">
        <div className="press-sheet" aria-hidden="true">
          <div className="press-sheet-cover">
            {coverUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={coverUrl} alt="" />
            ) : (
              <span className="press-sheet-cover-fallback">ES</span>
            )}
            <span className="press-sheet-roller" />
          </div>
          <p className="press-sheet-kicker">El Salto Web · {new Date().toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</p>
          <p className="press-sheet-title">{title}</p>
          <span className="press-sheet-line" />
          <span className="press-sheet-line" />
          <span className="press-sheet-line is-short" />
          <span className="press-stamp">{copy.stamp}</span>
        </div>

        <div className="press-ceremony-copy" aria-live="polite">
          {done ? (
            <>
              <p className="step-label text-[#d7ff52]">05 / {copy.stamp}</p>
              <h2 className="press-ceremony-headline">{copy.headline}</h2>
              <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">{copy.body}</p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                {link ? (
                  <a
                    ref={(node) => {
                      primaryRef.current = node;
                    }}
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="publish-primary text-center"
                  >
                    {variant === "draft" ? "Abrir en WordPress ↗" : "Leer el artículo ↗"}
                  </a>
                ) : null}
                <button
                  ref={(node) => {
                    if (!link) primaryRef.current = node;
                  }}
                  type="button"
                  onClick={onClose}
                  className="publish-secondary"
                >
                  Volver al estudio
                </button>
              </div>
              {canShare ? (
                <div className="press-share">
                  <span>Compartir</span>
                  <button type="button" onClick={copyLink}>
                    {linkCopied ? "Enlace copiado ✓" : "Copiar enlace"}
                  </button>
                  <a href={`https://twitter.com/intent/tweet?text=${shareText}&url=${shareUrl}`} target="_blank" rel="noopener noreferrer">X</a>
                  <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
                  <a href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
                </div>
              ) : null}
            </>
          ) : (
            <>
              <p className="step-label flex items-center gap-3 text-[#d7ff52]">
                <span className="ai-live-dot" aria-hidden="true" />
                {variant === "community" ? "Revisión y publicación" : "En la imprenta"}
              </p>
              <h2 key={stepIndex} className="press-ceremony-headline is-working">
                {steps[stepIndex]}…
              </h2>
              <ol className="press-steps">
                {steps.map((step, index) => (
                  <li key={step} data-state={index < stepIndex ? "done" : index === stepIndex ? "active" : "pending"}>
                    <span aria-hidden="true">{index < stepIndex ? "✓" : `0${index + 1}`}</span>
                    {step}
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
