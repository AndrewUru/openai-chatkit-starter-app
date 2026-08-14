"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import type {
  CoverAsset,
  CreativeWorkflowResponse,
} from "@/lib/creative-assets";
import { Navbar } from "./Navbar";
import { FutureWheelWebGL } from "./FutureWheelWebGL";
import { FluidAtmosphereWebGL } from "./FluidAtmosphereWebGL";

type WorkflowState = "idle" | "loading" | "success" | "error";
type PublishState = "idle" | "publishing" | "published" | "error";

type PublishResponse = {
  post?: { link?: string; status?: string };
  error?: string;
  message?: string;
};

type Territory = {
  number: string;
  title: string;
  signal: string;
  prompt: string;
};

type HumanLens = {
  id: string;
  label: string;
  description: string;
  instruction: string;
};

const TERRITORIES: Territory[] = [
  {
    number: "01",
    title: "Interfaces inteligentes",
    signal: "UX + IA generativa",
    prompt:
      "cómo diseñar interfaces web que colaboren con inteligencia artificial sin quitar control, contexto ni autonomía a quien las usa",
  },
  {
    number: "02",
    title: "Agentes en la web",
    signal: "Agentes + herramientas",
    prompt:
      "aplicaciones web donde agentes de IA entienden objetivos, utilizan herramientas y explican cada acción antes de ejecutarla",
  },
  {
    number: "03",
    title: "Código aumentado",
    signal: "Desarrollo + copilotos",
    prompt:
      "cómo cambia el oficio de desarrollar para la web cuando los copilotos de IA participan en arquitectura, código, pruebas y revisión",
  },
  {
    number: "04",
    title: "Web para todas las personas",
    signal: "Accesibilidad + IA",
    prompt:
      "cómo usar inteligencia artificial para crear experiencias web más accesibles sin automatizar decisiones que requieren criterio humano",
  },
  {
    number: "05",
    title: "Datos con criterio",
    signal: "APIs + privacidad",
    prompt:
      "productos web que personalizan con IA y datos propios manteniendo privacidad, trazabilidad y límites comprensibles",
  },
  {
    number: "06",
    title: "Experiencias generativas",
    signal: "WebGL + modelos",
    prompt:
      "nuevas experiencias web que combinan código creativo, WebGL y modelos generativos para responder en tiempo real a cada persona",
  },
];

const TERRITORY_NUMBERS = TERRITORIES.map((territory) => territory.number);

const HUMAN_LENSES: HumanLens[] = [
  {
    id: "utilidad",
    label: "Utilidad",
    description: "Resolver un problema real antes de añadir tecnología.",
    instruction:
      "desde la utilidad, partiendo de un problema verificable y una persona concreta",
  },
  {
    id: "accesibilidad",
    label: "Accesibilidad",
    description: "Diseñar para capacidades, contextos y dispositivos diversos.",
    instruction:
      "desde la accesibilidad, atendiendo a capacidades, contextos, rendimiento y dispositivos diversos",
  },
  {
    id: "criterio",
    label: "Criterio",
    description: "Cuestionar la automatización antes de darla por buena.",
    instruction:
      "desde una mirada crítica que evalúe riesgos, límites y decisiones que no deben automatizarse",
  },
  {
    id: "experimentacion",
    label: "Experimentación",
    description: "Prototipar, medir y aprender con rapidez.",
    instruction:
      "desde la experimentación, proponiendo un prototipo pequeño, medible y técnicamente plausible",
  },
];

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY ?? "demo2025";

export function ArticleGenerator() {
  const [topic, setTopic] = useState("");
  const [selectedLensId, setSelectedLensId] = useState<string | null>(null);
  const [selectedTerritory, setSelectedTerritory] =
    useState<Territory | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [state, setState] = useState<WorkflowState>("idle");
  const [error, setError] = useState("");
  const [article, setArticle] = useState("");
  const [cover, setCover] = useState<CoverAsset | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [isRefreshingCover, setIsRefreshingCover] = useState(false);
  const [coverError, setCoverError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [publishedLink, setPublishedLink] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [progress, setProgress] = useState(0);
  const resultRef = useRef<HTMLElement>(null);

  const selectedLens =
    HUMAN_LENSES.find((lens) => lens.id === selectedLensId) ?? null;

  useEffect(() => {
    if (state === "loading") {
      setProgress(10);
      const interval = window.setInterval(() => {
        setProgress((current) => Math.min(92, current + Math.random() * 8));
      }, 420);
      return () => window.clearInterval(interval);
    }

    if (state === "success") {
      setProgress(100);
      const scrollTimer = window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
      return () => window.clearTimeout(scrollTimer);
    }

    setProgress(0);
    return undefined;
  }, [state]);

  const spinWheel = useCallback(() => {
    if (isSpinning || !selectedLensId) return;

    const index = Math.floor(Math.random() * TERRITORIES.length);
    const currentPosition = ((wheelRotation % 360) + 360) % 360;
    const targetPosition = (330 - index * 60 + 360) % 360;
    const landingDistance = (targetPosition - currentPosition + 360) % 360;

    setIsSpinning(true);
    setSelectedTerritory(null);
    setState("idle");
    setError("");
    setWheelRotation((current) => current + 4 * 360 + landingDistance);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.setTimeout(() => {
      setSelectedTerritory(TERRITORIES[index]);
      setIsSpinning(false);
    }, prefersReducedMotion ? 50 : 1700);
  }, [isSpinning, selectedLensId, wheelRotation]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      if (!selectedLens || !selectedTerritory) {
        setError("Elige una mirada humana y gira la ruleta antes de crear.");
        setState("error");
        return;
      }

      const humanContribution = topic.trim();
      const creativeBrief = [
        "Ámbito obligatorio: desarrollo web e inteligencia artificial.",
        `Tema central: ${selectedTerritory.prompt}.`,
        `Enfoque humano: escribe ${selectedLens.instruction}.`,
        humanContribution
          ? `Chispa aportada por la persona: ${humanContribution}.`
          : "Busca una historia cotidiana y concreta que permita comprender el tema.",
        "La pieza debe convertir la chispa humana en un reto concreto de producto o desarrollo web, explicar qué papel cumple la IA, evitar el tecnosolucionismo y terminar con una pregunta abierta para la comunidad desarrolladora.",
      ].join(" ");
      const visualBrief = [
        "Desarrollo web e inteligencia artificial",
        selectedTerritory.title,
        selectedTerritory.signal,
        selectedLens.label,
        humanContribution || "una escena humana cotidiana",
      ].join(" · ");

      setState("loading");
      setError("");
      setArticle("");
      setCover(null);
      setCoverPrompt(visualBrief);
      setCoverError("");
      setResultMessage("");
      setPublishedLink(null);
      setPublishState("idle");
      setPublishMessage("");

      try {
        const response = await fetch(
          `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              input_as_text: creativeBrief,
              cover_prompt: visualBrief,
            }),
          }
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(detail || `Error ${response.status} al crear la pieza.`);
        }

        const data = (await response.json()) as CreativeWorkflowResponse;
        const generated = data.article?.trim();
        if (!generated) {
          throw new Error("La respuesta no incluyó contenido para la pieza.");
        }

        setArticle(generated);
        setCover(data.cover ?? null);
        setCoverPrompt(data.coverPrompt?.trim() || visualBrief);
        setResultMessage(
          data.message || "La pieza está lista para que tomes la decisión final."
        );
        setState("success");
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado durante la creación."
        );
        setState("error");
      }
    },
    [selectedLens, selectedTerritory, topic]
  );

  const refreshCover = useCallback(
    async (source: "generated" | "unsplash") => {
      if (!coverPrompt || isRefreshingCover) return;
      setIsRefreshingCover(true);
      setCoverError("");

      try {
        const response = await fetch(
          `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "cover",
              cover_source: source,
              input_as_text: coverPrompt,
              cover_prompt: coverPrompt,
            }),
          }
        );
        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(
            detail ||
              (source === "unsplash"
                ? "No se encontró una fotografía adecuada."
                : "No se pudo generar otra portada.")
          );
        }
        const data = (await response.json()) as CreativeWorkflowResponse;
        if (!data.cover || data.cover.source === "none") {
          throw new Error("La respuesta no incluyó una portada utilizable.");
        }
        setCover(data.cover);
        setPublishState("idle");
        setPublishedLink(null);
        setPublishMessage("");
      } catch (coverRequestError) {
        setCoverError(
          coverRequestError instanceof Error
            ? coverRequestError.message
            : "No se pudo cambiar la portada."
        );
      } finally {
        setIsRefreshingCover(false);
      }
    },
    [coverPrompt, isRefreshingCover]
  );

  const publishPiece = useCallback(
    async (status: "draft" | "publish") => {
      if (!article || publishState === "publishing") return;
      setPublishState("publishing");
      setPublishMessage("");

      try {
        const response = await fetch(
          `/api/publish?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ content: article, cover, status }),
          }
        );
        const data = (await response.json().catch(() => ({}))) as PublishResponse;
        if (!response.ok) {
          throw new Error(
            data.message || data.error || "WordPress no pudo guardar la pieza."
          );
        }

        setPublishedLink(data.post?.link ?? null);
        setPublishState("published");
        setPublishMessage(
          status === "draft"
            ? "Borrador guardado en WordPress."
            : "La pieza ya está publicada en WordPress."
        );
      } catch (publishError) {
        setPublishState("error");
        setPublishMessage(
          publishError instanceof Error
            ? publishError.message
            : "No se pudo completar la publicación."
        );
      }
    },
    [article, cover, publishState]
  );

  const coverPreviewUrl =
    cover?.source === "generated"
      ? `data:${cover.mimeType};base64,${cover.data}`
      : cover?.source === "unsplash"
      ? cover.url
      : null;

  const loadingMessage = (() => {
    if (progress < 28) return "Interpretando el reto";
    if (progress < 56) return "Conectando usuario, web e IA";
    if (progress < 78) return "Diseñando la solución";
    return "Preparando el caso de producto";
  })();

  return (
    <div className="experience-shell min-h-screen text-[#11110f]">
      <FluidAtmosphereWebGL />
      <Navbar />

      <main>
        <section id="inicio" className="relative mx-auto grid min-h-[78vh] w-full max-w-[1440px] items-end gap-12 px-5 pb-20 pt-16 sm:px-8 lg:grid-cols-[1.35fr_0.65fr] lg:px-14 lg:pb-24">
          <div>
            <p className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em]">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5c35]" />
              Experimento interactivo · Desarrollo web + IA
            </p>
            <h1 className="max-w-5xl font-serif text-[clamp(4.25rem,10vw,9.5rem)] leading-[0.76] tracking-[-0.075em]">
              La próxima web no se predice.
              <span className="mt-3 block pl-[8vw] italic text-[#4468ff]">
                Se construye.
              </span>
            </h1>
          </div>

          <div className="border-l-2 border-[#11110f] pl-6 lg:mb-2">
            <p className="text-xl leading-snug">
              Una experiencia para imaginar productos, interfaces y agentes web
              con inteligencia artificial, partiendo de algo irremplazable:
              <strong className="font-semibold"> tu manera de mirar.</strong>
            </p>
            <a
              href="#experiencia"
              className="mt-8 inline-flex items-center gap-3 border-b-2 border-[#11110f] pb-1 text-sm font-bold uppercase tracking-[0.16em] transition hover:text-[#4468ff]"
            >
              Entrar en la experiencia
              <span aria-hidden="true">↓</span>
            </a>
          </div>
        </section>

        <div className="marquee-band" aria-hidden="true">
          <div>
            DISEÑAR · PROGRAMAR · PROTOTIPAR · PROBAR · APRENDER · DISEÑAR · PROGRAMAR · PROTOTIPAR · PROBAR · APRENDER ·
          </div>
        </div>

        <section id="experiencia" className="mx-auto w-full max-w-[1440px] px-5 py-24 sm:px-8 lg:px-14 lg:py-32">
          <header className="mb-14 grid gap-8 lg:grid-cols-[0.45fr_1fr]">
            <p className="step-label">01 / Tu pulso</p>
            <div>
              <h2 className="max-w-4xl font-serif text-5xl leading-[0.95] tracking-[-0.045em] sm:text-7xl">
                Todo producto digital nace desde una decisión.
              </h2>
              <p className="mt-6 max-w-xl text-lg leading-relaxed text-black/65">
                Elige el principio desde el que quieres construir. No define una
                tecnología: define cómo tomarás decisiones con ella.
              </p>
            </div>
          </header>

          <div className="grid border-l border-t border-black lg:grid-cols-4">
            {HUMAN_LENSES.map((lens, index) => {
              const isSelected = selectedLensId === lens.id;
              return (
                <button
                  key={lens.id}
                  type="button"
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedLensId(lens.id);
                    setSelectedTerritory(null);
                    setState("idle");
                    setError("");
                  }}
                  className={`human-lens group min-h-56 border-b border-r border-black p-6 text-left transition-colors ${
                    isSelected ? "is-selected" : ""
                  }`}
                >
                  <span className="flex items-start justify-between">
                    <span className="text-xs font-bold tracking-[0.18em]">0{index + 1}</span>
                    <span className="lens-mark" aria-hidden="true" />
                  </span>
                  <span className="mt-20 block font-serif text-4xl tracking-[-0.04em]">
                    {lens.label}
                  </span>
                  <span className="mt-3 block max-w-[15rem] text-sm leading-relaxed opacity-65">
                    {lens.description}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-[#11110f] text-[#f4f0e6]">
          <div className="mx-auto grid w-full max-w-[1440px] gap-16 px-5 py-24 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:px-14 lg:py-32">
            <div className="flex flex-col justify-between">
              <div>
                <p className="step-label text-[#d7ff52]">02 / El azar</p>
                <h2 className="mt-8 max-w-xl font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
                  Deja que el azar defina el reto.
                </h2>
                <p className="mt-7 max-w-lg text-lg leading-relaxed text-white/60">
                  La ruleta combina tu principio con uno de seis territorios del
                  desarrollo web con IA. La intersección será el punto de partida.
                </p>
              </div>

              <div className="mt-12 hidden border-t border-white/25 pt-5 text-sm text-white/45 lg:block">
                <p>Una máquina propone.</p>
                <p>Una persona decide qué hacer con ello.</p>
              </div>
            </div>

            <div className="flex flex-col items-center">
              <div className="wheel-stage">
                <div className="wheel-pointer" aria-hidden="true" />
                <FutureWheelWebGL
                  labels={TERRITORY_NUMBERS}
                  rotation={wheelRotation}
                  spinning={isSpinning}
                />
                <button
                  type="button"
                  onClick={spinWheel}
                  disabled={isSpinning || !selectedLensId}
                  className="wheel-trigger"
                  aria-label="Girar la ruleta de desarrollo web e inteligencia artificial"
                >
                  <span>{isSpinning ? "Girando" : "Girar"}</span>
                  <span aria-hidden="true" className="text-xl">↻</span>
                </button>
              </div>

              {!selectedLensId ? (
                <p className="mt-8 text-center text-sm text-[#d7ff52]">
                  Primero elige tu pulso humano en el paso 01.
                </p>
              ) : null}

              <div aria-live="polite" className="mt-10 min-h-40 w-full max-w-2xl">
                {selectedTerritory ? (
                  <div className="territory-reveal">
                    <div className="flex items-start justify-between gap-6">
                      <p className="font-mono text-sm text-[#d7ff52]">
                        SEÑAL {selectedTerritory.number}
                      </p>
                      <p className="text-right text-xs uppercase tracking-[0.16em] text-white/45">
                        {selectedTerritory.signal}
                      </p>
                    </div>
                    <h3 className="mt-6 font-serif text-5xl tracking-[-0.04em] sm:text-6xl">
                      {selectedTerritory.title}
                    </h3>
                  </div>
                ) : (
                  <p className="border-t border-white/25 pt-5 text-center text-sm text-white/40">
                    {isSpinning
                      ? "Las señales se están alineando…"
                      : "Aquí aparecerá tu reto de desarrollo web e IA."}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#ff5c35] text-[#11110f]">
          <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 py-24 sm:px-8 lg:grid-cols-[0.7fr_1.3fr] lg:px-14 lg:py-32">
            <div>
              <p className="step-label">03 / Tu huella</p>
              <h2 className="mt-8 font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
                Ahora entra el problema que quieres resolver.
              </h2>
            </div>

            <form onSubmit={handleSubmit} className="self-end">
              <label htmlFor="human-spark" className="block text-sm font-bold uppercase tracking-[0.16em]">
                Añade un reto, una idea, un usuario o una obsesión
              </label>
              <textarea
                id="human-spark"
                value={topic}
                onChange={(event) => setTopic(event.target.value)}
                placeholder="Por ejemplo: un portfolio que converse con cada visitante sin perder accesibilidad…"
                disabled={state === "loading"}
                rows={4}
                className="mt-5 w-full resize-none border-0 border-b-2 border-[#11110f] bg-transparent px-0 py-4 font-serif text-3xl leading-tight outline-none placeholder:text-black/35 focus:border-white disabled:opacity-60 sm:text-4xl"
              />

              <div className="mt-8 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
                <p className="max-w-sm text-sm leading-relaxed text-black/65">
                  {selectedTerritory && selectedLens
                    ? `${selectedLens.label} × ${selectedTerritory.title}. La combinación está lista.`
                    : "Completa los dos primeros pasos para diseñar tu caso web con IA."}
                </p>
                <button
                  type="submit"
                  disabled={
                    state === "loading" || !selectedTerritory || !selectedLens
                  }
                  className="create-button"
                >
                  {state === "loading" ? "Creando…" : "Crear con IA"}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>

              {state === "loading" ? (
                <div className="mt-10" aria-live="polite">
                  <div className="flex justify-between text-xs font-bold uppercase tracking-[0.16em]">
                    <span>{loadingMessage}</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden bg-black/20">
                    <div
                      className="h-full bg-[#11110f] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              ) : null}

              {state === "error" ? (
                <p role="alert" className="mt-8 border-l-4 border-[#11110f] pl-4 font-semibold">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </section>

        <section ref={resultRef} id="resultado" className="scroll-mt-6 bg-[#f4f0e6]">
          {state === "success" ? (
            <div className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8 lg:px-14 lg:py-32">
              <header className="mb-14 flex flex-col justify-between gap-8 border-b-2 border-black pb-8 md:flex-row md:items-end">
                <div>
                  <p className="step-label text-[#4468ff]">04 / La pieza</p>
                  <h2 className="mt-5 font-serif text-5xl tracking-[-0.045em] sm:text-7xl">
                    Tu caso de producto ya existe.
                  </h2>
                </div>
                <div className="max-w-xs text-sm leading-relaxed text-black/60">
                  <p>{resultMessage}</p>
                  <p className="mt-3 font-semibold text-black">
                    Todavía no se ha enviado a WordPress.
                  </p>
                </div>
              </header>

              <section className="cover-review mb-20">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="step-label text-[#ff5c35]">La portada</p>
                    <h3 className="mt-3 font-serif text-4xl tracking-[-0.04em] sm:text-5xl">
                      Elige la imagen que abre la historia.
                    </h3>
                  </div>
                  {cover?.source === "unsplash" ? (
                    <p className="text-xs text-black/55">
                      Foto de{" "}
                      <a
                        href={cover.attribution.photographerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-b border-black/40"
                      >
                        {cover.attribution.photographerName}
                      </a>{" "}
                      en{" "}
                      <a
                        href={cover.attribution.unsplashUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="border-b border-black/40"
                      >
                        Unsplash
                      </a>
                    </p>
                  ) : null}
                </div>

                <div className="cover-frame">
                  {coverPreviewUrl ? (
                    <Image
                      src={coverPreviewUrl}
                      alt={cover?.alt || "Portada de la pieza"}
                      fill
                      sizes="(max-width: 768px) 100vw, 1100px"
                      unoptimized={cover?.source === "generated"}
                      className="object-cover"
                    />
                  ) : (
                    <div className="grid h-full place-items-center bg-[#11110f] px-8 text-center text-[#f4f0e6]">
                      <p className="max-w-md font-serif text-3xl">
                        {cover?.source === "none"
                          ? cover.reason
                          : "La historia está lista, pero aún necesita una portada."}
                      </p>
                    </div>
                  )}
                  {coverPreviewUrl ? (
                    <span className="cover-source-badge">
                      {cover?.source === "generated"
                        ? "Imagen creada con IA"
                        : "Fotografía · Unsplash"}
                    </span>
                  ) : null}
                  {isRefreshingCover ? (
                    <div className="absolute inset-0 z-10 grid place-items-center bg-black/65 text-sm font-bold uppercase tracking-[0.16em] text-white">
                      Buscando otra mirada…
                    </div>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => refreshCover("generated")}
                    disabled={isRefreshingCover}
                    className="cover-action"
                  >
                    Otra imagen IA <span aria-hidden="true">↻</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => refreshCover("unsplash")}
                    disabled={isRefreshingCover}
                    className="cover-action"
                  >
                    Buscar fotografía <span aria-hidden="true">⌕</span>
                  </button>
                  <p className="text-xs text-black/50">
                    Tú eliges. Nada se publica hasta que lo confirmes.
                  </p>
                </div>
                {coverError ? (
                  <p role="alert" className="mt-4 border-l-4 border-[#ff5c35] pl-4 text-sm font-semibold">
                    {coverError}
                  </p>
                ) : null}
              </section>

              <div
                className="generated-story"
                dangerouslySetInnerHTML={{ __html: article }}
              />

              <section className="publish-decision mt-20 bg-[#11110f] p-7 text-[#f4f0e6] sm:p-10">
                <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="step-label text-[#d7ff52]">05 / Tu decisión</p>
                    <h3 className="mt-4 max-w-2xl font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
                      La última palabra sigue siendo humana.
                    </h3>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
                      Guarda un borrador para revisarlo con calma o publícalo ahora
                      con la portada elegida.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => publishPiece("draft")}
                      disabled={publishState === "publishing"}
                      className="publish-secondary"
                    >
                      Guardar borrador
                    </button>
                    <button
                      type="button"
                      onClick={() => publishPiece("publish")}
                      disabled={publishState === "publishing"}
                      className="publish-primary"
                    >
                      {publishState === "publishing"
                        ? "Enviando…"
                        : "Publicar ahora ↗"}
                    </button>
                  </div>
                </div>

                {publishMessage ? (
                  <div
                    role={publishState === "error" ? "alert" : "status"}
                    className={`mt-7 border-t pt-5 text-sm ${
                      publishState === "error"
                        ? "border-red-400 text-red-300"
                        : "border-[#d7ff52]/40 text-[#d7ff52]"
                    }`}
                  >
                    {publishMessage}{" "}
                    {publishedLink ? (
                      <a
                        href={publishedLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="ml-2 border-b border-current font-bold"
                      >
                        Abrir en WordPress ↗
                      </a>
                    ) : null}
                  </div>
                ) : null}
              </section>

              <button
                type="button"
                onClick={() => {
                  setSelectedTerritory(null);
                  setTopic("");
                  setArticle("");
                  setCover(null);
                  setCoverPrompt("");
                  setCoverError("");
                  setPublishedLink(null);
                  setPublishState("idle");
                  setPublishMessage("");
                  setState("idle");
                  document
                    .getElementById("experiencia")
                    ?.scrollIntoView({ behavior: "smooth" });
                }}
                className="mx-auto mt-16 flex items-center gap-3 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-[0.16em]"
              >
                Volver a jugar <span aria-hidden="true">↻</span>
              </button>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="flex flex-col justify-between gap-5 border-t border-white/20 bg-[#11110f] px-5 py-8 text-xs uppercase tracking-[0.16em] text-white/50 sm:flex-row sm:px-8 lg:px-14">
        <span>El Salto Web · Laboratorio Web + IA</span>
        <span>Diseñado por humanos · Ampliado con IA · 2026</span>
      </footer>
    </div>
  );
}
