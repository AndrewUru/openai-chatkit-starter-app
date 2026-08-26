"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import dynamic from "next/dynamic";
import type {
  CoverAsset,
  CreativeWorkflowResponse,
} from "@/lib/creative-assets";
import type {
  EditorialStreamEvent,
  EditorialStreamPackage,
} from "@/lib/editorial-stream";
import { Navbar } from "./Navbar";
import { FluidAtmosphereWebGL } from "./FluidAtmosphereWebGL";

const FutureWheelWebGL = dynamic(
  () =>
    import("./FutureWheelWebGL").then((module) => module.FutureWheelWebGL),
  { ssr: false }
);

type WorkflowState = "idle" | "loading" | "success" | "error";
type PublishState = "idle" | "publishing" | "published" | "error";

type PublishResponse = {
  post?: { link?: string; status?: string };
  error?: string;
  message?: string;
};

type SurpriseIdea = {
  number: string;
  title: string;
  signal: string;
  prompt: string;
};

type EditorialOption = {
  id: string;
  label: string;
  instruction: string;
};

const SURPRISE_IDEAS: SurpriseIdea[] = [
  {
    number: "01",
    title: "Tutorial",
    signal: "Explica un proceso útil",
    prompt:
      "Cómo convertir una tarea repetitiva de WordPress en un flujo sencillo con inteligencia artificial",
  },
  {
    number: "02",
    title: "Opinión",
    signal: "Defiende una mirada propia",
    prompt:
      "Qué perdemos cuando automatizamos demasiado pronto nuestro trabajo creativo",
  },
  {
    number: "03",
    title: "Tendencia",
    signal: "Interpreta un cambio",
    prompt:
      "Por qué las herramientas de IA están pasando de responder preguntas a completar flujos de trabajo",
  },
  {
    number: "04",
    title: "Caso real",
    signal: "Cuenta una experiencia",
    prompt:
      "Lo que aprendí al conectar un generador de contenido con una publicación real en WordPress",
  },
  {
    number: "05",
    title: "Aprendizaje",
    signal: "Comparte una lección",
    prompt:
      "La importancia de mantener una decisión humana al final de cualquier automatización editorial",
  },
  {
    number: "06",
    title: "Experimento",
    signal: "Plantea una prueba",
    prompt:
      "Qué ocurre si partimos de una sola frase para crear y publicar un artículo completo",
  },
];

const SURPRISE_NUMBERS = SURPRISE_IDEAS.map((idea) => idea.number);

const CONTENT_TYPES: EditorialOption[] = [
  {
    id: "articulo",
    label: "Artículo",
    instruction: "un artículo editorial con una estructura natural",
  },
  {
    id: "tutorial",
    label: "Tutorial",
    instruction: "un tutorial práctico, ordenado y accionable",
  },
  {
    id: "caso-real",
    label: "Caso real",
    instruction: "un caso real centrado en contexto, decisiones y aprendizajes",
  },
  {
    id: "opinion",
    label: "Opinión",
    instruction: "una pieza de opinión argumentada y honesta",
  },
  {
    id: "guia",
    label: "Guía",
    instruction: "una guía útil y fácil de consultar",
  },
];

const EDITORIAL_FOCUSES: EditorialOption[] = [
  {
    id: "divulgativo",
    label: "Claro y divulgativo",
    instruction: "claro, divulgativo y sin jerga innecesaria",
  },
  {
    id: "tecnico",
    label: "Técnico",
    instruction: "técnico, preciso y dirigido a una audiencia con experiencia",
  },
  {
    id: "personal",
    label: "Personal",
    instruction: "personal y cercano, sin inventar vivencias que no aparezcan en la idea",
  },
  {
    id: "seo",
    label: "SEO",
    instruction: "orientado a búsqueda, con intención clara y lenguaje natural",
  },
];

const TOPIC_EXAMPLES = [
  {
    label: "IA y desarrollo",
    prompt: "Cómo estoy utilizando IA para automatizar tareas en WordPress",
  },
  {
    label: "Mi proyecto",
    prompt: "Lo que he aprendido creando mi primer producto digital con IA",
  },
  {
    label: "Una experiencia",
    prompt: "Una decisión difícil que mejoró la forma en que trabajo con clientes",
  },
  {
    label: "Un tutorial",
    prompt: "Cómo preparar una publicación de WordPress desde una idea inicial",
  },
  {
    label: "Una opinión",
    prompt: "Por qué automatizar no debería significar perder el criterio humano",
  },
];

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY ?? "demo2025";

function countWords(html: string): number {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;]+;/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function extractHeading(html: string): string {
  const match = html.match(/<h1[^>]*>([\s\S]*?)(?:<\/h1>|$)/i);
  return match?.[1]?.replace(/<[^>]*>/g, "").trim() || "La idea está tomando forma";
}

export function ArticleGenerator() {
  const [topic, setTopic] = useState("");
  const [selectedContentTypeId, setSelectedContentTypeId] =
    useState<string | null>(null);
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
  const [showDirection, setShowDirection] = useState(false);
  const [showSurprise, setShowSurprise] = useState(false);
  const [selectedSurprise, setSelectedSurprise] =
    useState<SurpriseIdea | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);
  const [wheelRotation, setWheelRotation] = useState(0);
  const [state, setState] = useState<WorkflowState>("idle");
  const [error, setError] = useState("");
  const [article, setArticle] = useState("");
  const [liveArticleHtml, setLiveArticleHtml] = useState("");
  const [liveCoverDirection, setLiveCoverDirection] = useState("");
  const [cover, setCover] = useState<CoverAsset | null>(null);
  const [coverPrompt, setCoverPrompt] = useState("");
  const [isRefreshingCover, setIsRefreshingCover] = useState(false);
  const [coverElapsedSeconds, setCoverElapsedSeconds] = useState(0);
  const [coverError, setCoverError] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [publishedLink, setPublishedLink] = useState<string | null>(null);
  const [publishState, setPublishState] = useState<PublishState>("idle");
  const [publishMessage, setPublishMessage] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const resultRef = useRef<HTMLElement>(null);
  const generationRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const workflowAbortRef = useRef<AbortController | null>(null);
  const coverVariantRef = useRef(0);

  const selectedContentType =
    CONTENT_TYPES.find((option) => option.id === selectedContentTypeId) ?? null;
  const selectedFocus =
    EDITORIAL_FOCUSES.find((option) => option.id === selectedFocusId) ?? null;

  const cancelActiveWorkflow = useCallback(() => {
    workflowAbortRef.current?.abort();
    workflowAbortRef.current = null;
    setIsRefreshingCover(false);
  }, []);

  useEffect(
    () => () => {
      workflowAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (state === "loading") {
      const startedAt = Date.now();
      setElapsedSeconds(0);
      const scrollTimer = window.setTimeout(() => {
        generationRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 180);
      const interval = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => {
        window.clearTimeout(scrollTimer);
        window.clearInterval(interval);
      };
    }

    if (state === "success") {
      const scrollTimer = window.setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 180);
      return () => window.clearTimeout(scrollTimer);
    }

    setElapsedSeconds(0);
    return undefined;
  }, [state]);

  useEffect(() => {
    if (!isRefreshingCover) {
      setCoverElapsedSeconds(0);
      return undefined;
    }

    const startedAt = Date.now();
    setCoverElapsedSeconds(0);
    const interval = window.setInterval(() => {
      setCoverElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isRefreshingCover]);

  const spinWheel = useCallback(() => {
    if (isSpinning) return;

    cancelActiveWorkflow();

    const index = Math.floor(Math.random() * SURPRISE_IDEAS.length);
    const currentPosition = ((wheelRotation % 360) + 360) % 360;
    const targetPosition = (330 - index * 60 + 360) % 360;
    const landingDistance = (targetPosition - currentPosition + 360) % 360;

    setIsSpinning(true);
    setSelectedSurprise(null);
    setState("idle");
    setError("");
    setWheelRotation((current) => current + 4 * 360 + landingDistance);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    window.setTimeout(() => {
      const surprise = SURPRISE_IDEAS[index];
      setSelectedSurprise(surprise);
      setTopic(surprise.prompt);
      setIsSpinning(false);
    }, prefersReducedMotion ? 50 : 1700);
  }, [cancelActiveWorkflow, isSpinning, wheelRotation]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();

      const humanContribution = topic.trim();
      if (!humanContribution) {
        setError("Cuéntanos una idea, un tema, una experiencia o una pregunta.");
        setState("error");
        return;
      }

      const creativeBrief = [
        `Idea aportada por la persona: ${humanContribution}.`,
        selectedContentType
          ? `Tipo de contenido solicitado: ${selectedContentType.instruction}.`
          : "Elige el tipo de contenido que mejor sirva a la idea.",
        selectedFocus
          ? `Enfoque editorial solicitado: ${selectedFocus.instruction}.`
          : "Elige el enfoque y el tono que mejor sirvan a la idea y a una lectura web.",
        "Convierte la idea en una publicación completa, autónoma y lista para revisar antes de enviarla a WordPress.",
        "Respeta la información proporcionada. No inventes experiencias personales, citas, cifras, resultados ni fuentes.",
      ].join(" ");
      const visualBrief = [
        `Publicación editorial sobre: ${humanContribution}`,
        selectedContentType?.label || "Formato decidido por la IA",
        selectedFocus?.label || "Enfoque decidido por la IA",
      ].join(" · ");

      workflowAbortRef.current?.abort();
      const workflowController = new AbortController();
      workflowAbortRef.current = workflowController;

      setState("loading");
      setError("");
      setArticle("");
      setLiveArticleHtml("");
      setLiveCoverDirection("");
      setCover(null);
      coverVariantRef.current = 0;
      setIsRefreshingCover(false);
      setCoverPrompt(visualBrief);
      setCoverError("");
      setResultMessage("");
      setPublishedLink(null);
      setPublishState("idle");
      setPublishMessage("");

      try {
        const response = await fetch(
          `/api/article-stream?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: workflowController.signal,
            body: JSON.stringify({
              input_as_text: creativeBrief,
              cover_prompt: visualBrief,
            }),
          }
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(detail || `Error ${response.status} al crear la pieza.`);
        }

        if (!response.body) {
          throw new Error("La respuesta no incluyó un flujo de contenido.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let completePackage: EditorialStreamPackage | null = null;

        const processLine = (line: string) => {
          if (!line.trim()) return;
          const event = JSON.parse(line) as EditorialStreamEvent;
          if (event.type === "error") {
            throw new Error(event.message);
          }
          if (event.data.article_html) {
            setLiveArticleHtml(event.data.article_html);
          }
          if (event.data.cover_prompt) {
            setLiveCoverDirection(event.data.cover_prompt);
          }
          if (event.type === "done") {
            completePackage = event.data;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          buffer += decoder.decode(value, { stream: !done });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          lines.forEach(processLine);
          if (done) break;
        }
        processLine(buffer);

        const streamedPackage = completePackage as EditorialStreamPackage | null;
        if (!streamedPackage?.article_html?.trim()) {
          throw new Error("La IA no completó el contenido de la publicación.");
        }

        const generatedCoverPrompt =
          streamedPackage.cover_prompt?.trim() || visualBrief;
        const finalizeResponse = await fetch(
          `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: workflowController.signal,
            body: JSON.stringify({
              action: "finalize",
              input_as_text: streamedPackage.article_html,
              cover_prompt: generatedCoverPrompt,
            }),
          }
        );
        if (!finalizeResponse.ok) {
          const detail = await finalizeResponse.text().catch(() => "");
          throw new Error(detail || "No se pudo preparar la publicación final.");
        }
        const finalized =
          (await finalizeResponse.json()) as CreativeWorkflowResponse;
        const generated = finalized.article?.trim();
        if (!generated) {
          throw new Error("La respuesta no incluyó contenido para la publicación.");
        }

        setArticle(generated);
        setCover(null);
        setCoverPrompt(generatedCoverPrompt);
        setResultMessage(
          finalized.message ||
            "El artículo está listo. La portada se está preparando por separado."
        );
        setState("success");

        setIsRefreshingCover(true);
        try {
          const coverResponse = await fetch(
            `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              signal: workflowController.signal,
              body: JSON.stringify({
                action: "cover",
                cover_source: "auto",
                cover_variant: 0,
                input_as_text: generatedCoverPrompt,
                cover_prompt: generatedCoverPrompt,
              }),
            }
          );

          if (!coverResponse.ok) {
            const detail = await coverResponse.text().catch(() => "");
            throw new Error(detail || "No se pudo preparar la portada.");
          }

          const coverData =
            (await coverResponse.json()) as CreativeWorkflowResponse;
          if (!coverData.cover) {
            throw new Error("La respuesta no incluyó una portada.");
          }
          setCover(coverData.cover);
          setResultMessage(
            coverData.message ||
              "La pieza está lista para que tomes la decisión final."
          );
        } catch (coverRequestError) {
          if (
            coverRequestError instanceof DOMException &&
            coverRequestError.name === "AbortError"
          ) {
            return;
          }
          setCoverError(
            coverRequestError instanceof Error
              ? coverRequestError.message
              : "No se pudo preparar la portada."
          );
        } finally {
          if (workflowAbortRef.current === workflowController) {
            setIsRefreshingCover(false);
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setError(
          err instanceof Error
            ? err.message
            : "Ocurrió un error inesperado durante la creación."
        );
        setState("error");
      } finally {
        if (workflowAbortRef.current === workflowController) {
          workflowAbortRef.current = null;
        }
      }
    },
    [selectedContentType, selectedFocus, topic]
  );

  const refreshCover = useCallback(
    async (source: "generated" | "unsplash") => {
      if (!coverPrompt || isRefreshingCover) return;
      const coverVariant =
        source === "generated"
          ? coverVariantRef.current + 1
          : coverVariantRef.current;
      if (source === "generated") {
        coverVariantRef.current = coverVariant;
      }
      workflowAbortRef.current?.abort();
      const coverController = new AbortController();
      workflowAbortRef.current = coverController;
      setIsRefreshingCover(true);
      setCoverError("");

      try {
        const response = await fetch(
          `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            signal: coverController.signal,
            body: JSON.stringify({
              action: "cover",
              cover_source: source,
              cover_variant: coverVariant,
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
        if (
          coverRequestError instanceof DOMException &&
          coverRequestError.name === "AbortError"
        ) {
          return;
        }
        setCoverError(
          coverRequestError instanceof Error
            ? coverRequestError.message
            : "No se pudo cambiar la portada."
        );
      } finally {
        if (workflowAbortRef.current === coverController) {
          setIsRefreshingCover(false);
          workflowAbortRef.current = null;
        }
      }
    },
    [coverPrompt, isRefreshingCover]
  );

  const publishPiece = useCallback(
    async (status: "draft" | "publish") => {
      if (!article || isRefreshingCover || publishState === "publishing") return;
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
    [article, cover, isRefreshingCover, publishState]
  );

  const coverPreviewUrl =
    cover?.source === "generated"
      ? `data:${cover.mimeType};base64,${cover.data}`
      : cover?.source === "unsplash"
      ? cover.url
      : null;

  const liveWordCount = countWords(liveArticleHtml);
  const liveHeading = extractHeading(liveArticleHtml);
  const generationProgress = liveCoverDirection
    ? 94
    : Math.min(88, 10 + Math.round(liveWordCount / 10));

  const loadingMessage = (() => {
    if (!liveArticleHtml) return "Entendiendo tu idea";
    if (liveWordCount < 120) return "Encontrando el ángulo editorial";
    if (!liveCoverDirection) return "Escribiendo en directo";
    return "Definiendo la dirección visual";
  })();

  const loadingHint =
    liveArticleHtml
      ? "Ya puedes leer la publicación mientras la IA continúa escribiendo."
      : "Las primeras palabras aparecerán aquí en cuanto la IA encuentre la dirección.";

  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    "0"
  )}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  const coverElapsedLabel = `${String(
    Math.floor(coverElapsedSeconds / 60)
  ).padStart(2, "0")}:${String(coverElapsedSeconds % 60).padStart(2, "0")}`;

  return (
    <div className="experience-shell min-h-screen text-[#11110f]">
      <FluidAtmosphereWebGL />
      <Navbar />

      <main>
        <section
          id="inicio"
          className="relative mx-auto w-full max-w-[1440px] px-5 pb-16 pt-16 sm:px-8 lg:px-14 lg:pb-24"
        >
          <p className="mb-8 flex items-center gap-3 text-xs font-bold uppercase tracking-[0.24em]">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-[#ff5c35]" />
            El Salto Web · AI Lab
          </p>
          <div className="grid items-end gap-10 lg:grid-cols-[1.35fr_0.65fr]">
            <h1 className="max-w-5xl font-serif text-[clamp(4rem,9.5vw,9rem)] leading-[0.79] tracking-[-0.075em]">
              Una idea entra.
              <span className="mt-3 block pl-[6vw] italic text-[#4468ff]">
                Un artículo sale.
              </span>
            </h1>
            <div className="border-l-2 border-[#11110f] pl-6 lg:mb-2">
              <p className="text-xl leading-snug">
                Cuéntanos lo que quieres contar. La IA le dará forma y tú
                decidirás si se guarda o se publica.
              </p>
              <a
                href="#experiencia"
                className="mt-8 inline-flex items-center gap-3 border-b-2 border-[#11110f] pb-1 text-sm font-bold uppercase tracking-[0.16em] transition hover:text-[#4468ff]"
              >
                Crear una publicación
                <span aria-hidden="true">↓</span>
              </a>
            </div>
          </div>
        </section>

        <div className="marquee-band" aria-hidden="true">
          <div>
            IDEA · CONTENIDO · PORTADA · REVISIÓN · WORDPRESS · IDEA · CONTENIDO · PORTADA · REVISIÓN · WORDPRESS ·
          </div>
        </div>

        <section
          id="experiencia"
          className="scroll-mt-6 bg-[#ff5c35] text-[#11110f]"
        >
          <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
            <form onSubmit={handleSubmit}>
              <div className="grid gap-10 lg:grid-cols-[0.58fr_1.42fr]">
                <div>
                  <p className="step-label">01 / Idea</p>
                  <h2 className="mt-7 max-w-xl font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
                    ¿Qué quieres contar?
                  </h2>
                  <p className="mt-6 max-w-md text-lg leading-relaxed text-black/65">
                    Una idea, un tema, una experiencia o una pregunta bastan.
                    No necesitas escribir un prompt ni tener el artículo pensado.
                  </p>
                </div>

                <div className="self-end">
                  <label
                    htmlFor="editorial-idea"
                    className="block text-sm font-bold uppercase tracking-[0.16em]"
                  >
                    Cuéntanos tu idea
                  </label>
                  <textarea
                    id="editorial-idea"
                    value={topic}
                    onChange={(event) => {
                      setTopic(event.target.value);
                      setError("");
                    }}
                    placeholder="Quiero escribir sobre cómo estoy utilizando IA para automatizar tareas en WordPress…"
                    disabled={state === "loading" || isRefreshingCover}
                    rows={4}
                    required
                    className="mt-5 w-full resize-none border-0 border-b-2 border-[#11110f] bg-transparent px-0 py-4 font-serif text-3xl leading-tight outline-none placeholder:text-black/35 focus:border-white disabled:opacity-60 sm:text-4xl"
                  />

                  <div className="mt-5 flex flex-wrap gap-2" aria-label="Ejemplos de ideas">
                    {TOPIC_EXAMPLES.map((example) => (
                      <button
                        key={example.label}
                        type="button"
                        onClick={() => {
                          setTopic(example.prompt);
                          setError("");
                        }}
                        disabled={state === "loading" || isRefreshingCover}
                        className="idea-chip"
                      >
                        {example.label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-6 flex items-center gap-2 text-sm font-semibold">
                    <span aria-hidden="true">✓</span>
                    No se publicará nada sin tu confirmación.
                  </p>
                </div>
              </div>

              <div className="mt-16 border-t-2 border-black pt-8">
                <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                  <div>
                    <p className="step-label">02 / Dirección opcional</p>
                    <p className="mt-3 max-w-xl text-sm leading-relaxed text-black/65">
                      Elige el tipo y el enfoque si quieres tener más control.
                      Si no, dejaremos que la IA decida.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDirection((current) => !current)}
                    aria-expanded={showDirection}
                    aria-controls="editorial-direction"
                    className="direction-toggle"
                  >
                    {showDirection ? "Ocultar opciones" : "Elegir dirección"}
                    <span aria-hidden="true">{showDirection ? "−" : "+"}</span>
                  </button>
                </div>

                {showDirection ? (
                  <div id="editorial-direction" className="mt-8 grid gap-8 lg:grid-cols-2">
                    <fieldset>
                      <legend className="text-sm font-bold uppercase tracking-[0.14em]">
                        Tipo de contenido
                      </legend>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {CONTENT_TYPES.map((option) => {
                          const isSelected = selectedContentTypeId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setSelectedContentTypeId((current) =>
                                  current === option.id ? null : option.id
                                )
                              }
                              className={`editorial-option ${isSelected ? "is-selected" : ""}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <fieldset>
                      <legend className="text-sm font-bold uppercase tracking-[0.14em]">
                        Enfoque
                      </legend>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {EDITORIAL_FOCUSES.map((option) => {
                          const isSelected = selectedFocusId === option.id;
                          return (
                            <button
                              key={option.id}
                              type="button"
                              aria-pressed={isSelected}
                              onClick={() =>
                                setSelectedFocusId((current) =>
                                  current === option.id ? null : option.id
                                )
                              }
                              className={`editorial-option ${isSelected ? "is-selected" : ""}`}
                            >
                              {option.label}
                            </button>
                          );
                        })}
                      </div>
                    </fieldset>

                    <button
                      type="button"
                      onClick={() => {
                        setSelectedContentTypeId(null);
                        setSelectedFocusId(null);
                      }}
                      className="w-fit border-b border-black pb-1 text-sm font-bold"
                    >
                      Dejar que la IA decida
                    </button>
                  </div>
                ) : null}
              </div>

              <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-black/30 pt-8 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => setShowSurprise((current) => !current)}
                  aria-expanded={showSurprise}
                  aria-controls="surprise-panel"
                  className="border-b-2 border-[#11110f] pb-1 text-sm font-bold uppercase tracking-[0.14em]"
                >
                  {showSurprise ? "Cerrar sorpresa" : "Sorpréndeme"} <span aria-hidden="true">↗</span>
                </button>
                <button
                  type="submit"
                  disabled={state === "loading" || isRefreshingCover || !topic.trim()}
                  className="create-button"
                >
                  {state === "loading" ? "Generando…" : "Generar publicación"}
                  <span aria-hidden="true">↗</span>
                </button>
              </div>

              {state === "error" ? (
                <p role="alert" className="mt-8 border-l-4 border-[#11110f] pl-4 font-semibold">
                  {error}
                </p>
              ) : null}
            </form>
          </div>
        </section>

        {state === "loading" ? (
          <section
            ref={generationRef}
            id="generacion"
            className="ai-live-workbench scroll-mt-6 bg-[#11110f] text-[#f4f0e6]"
          >
            <div className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-8 lg:px-14 lg:py-24">
              <div className="grid gap-12 lg:grid-cols-[0.55fr_1.45fr]">
                <div className="flex flex-col justify-between">
                  <div>
                    <p className="step-label flex items-center gap-3 text-[#d7ff52]">
                      <span className="ai-live-dot" aria-hidden="true" />
                      03 / Generación en directo
                    </p>
                    <h2 className="mt-7 max-w-lg font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
                      La publicación está naciendo ahora.
                    </h2>
                    <p className="mt-6 max-w-md text-base leading-relaxed text-white/55">
                      No es una animación de espera: cada fragmento que ves llega
                      del modelo en tiempo real.
                    </p>
                  </div>

                  <div className="mt-12 border-t border-white/20 pt-5">
                    <div className="flex items-end justify-between gap-5">
                      <div>
                        <p aria-live="polite" className="text-sm font-bold text-[#d7ff52]">
                          {loadingMessage}
                        </p>
                        <p className="mt-2 text-sm leading-relaxed text-white/45">
                          {loadingHint}
                        </p>
                      </div>
                      <span className="font-mono text-sm tabular-nums text-white/55">
                        {elapsedLabel}
                      </span>
                    </div>
                    <div className="mt-5 h-1 overflow-hidden bg-white/15">
                      <div
                        className="ai-live-progress h-full bg-[#d7ff52]"
                        style={{ width: `${generationProgress}%` }}
                      />
                    </div>
                    <div className="mt-5 grid grid-cols-2 gap-4 font-mono text-xs uppercase tracking-[0.12em] text-white/40">
                      <p>
                        Palabras <span className="block pt-1 text-xl text-white">{liveWordCount}</span>
                      </p>
                      <p>
                        Portada <span className="block pt-1 text-sm text-white">{liveCoverDirection ? "Dirigida" : "Pendiente"}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="ai-live-page" aria-busy="true" aria-live="polite">
                  <div className="flex items-center justify-between border-b border-black/15 px-5 py-4 font-mono text-[.68rem] uppercase tracking-[0.14em] text-black/45 sm:px-8">
                    <span>Borrador vivo</span>
                    <span className="max-w-[55%] truncate text-right">{liveHeading}</span>
                  </div>
                  {liveArticleHtml ? (
                    <div className="generated-story ai-live-story px-5 py-8 sm:px-8 sm:py-10">
                      <article
                        className="ia-generated"
                        dangerouslySetInnerHTML={{ __html: liveArticleHtml }}
                      />
                    </div>
                  ) : (
                    <div className="space-y-5 px-7 py-12 sm:px-12">
                      <div className="ai-writing-line h-12 w-4/5" />
                      <div className="ai-writing-line h-4 w-full" />
                      <div className="ai-writing-line h-4 w-11/12" />
                      <div className="ai-writing-line h-4 w-3/4" />
                      <div className="ai-writing-line mt-10 h-8 w-2/3" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        {showSurprise ? (
          <section id="surprise-panel" className="bg-[#11110f] text-[#f4f0e6]">
            <div className="mx-auto grid w-full max-w-[1440px] gap-14 px-5 py-20 sm:px-8 lg:grid-cols-[0.72fr_1.28fr] lg:px-14 lg:py-24">
              <div>
                <p className="step-label text-[#d7ff52]">Desbloquea una idea</p>
                <h2 className="mt-7 max-w-xl font-serif text-5xl leading-[0.94] tracking-[-0.045em] sm:text-7xl">
                  Deja que el azar te dé un punto de partida.
                </h2>
                <p className="mt-6 max-w-lg text-lg leading-relaxed text-white/60">
                  La ruleta ya no es un paso obligatorio. Úsala solo cuando
                  quieras descubrir una dirección inesperada.
                </p>
              </div>

              <div className="flex flex-col items-center">
                <div className="wheel-stage">
                  <div className="wheel-pointer" aria-hidden="true" />
                  <FutureWheelWebGL
                    labels={SURPRISE_NUMBERS}
                    rotation={wheelRotation}
                    spinning={isSpinning}
                  />
                  <button
                    type="button"
                    onClick={spinWheel}
                    disabled={isSpinning}
                    className="wheel-trigger"
                    aria-label="Girar la ruleta de ideas editoriales"
                  >
                    <span>{isSpinning ? "Girando" : "Girar"}</span>
                    <span aria-hidden="true" className="text-xl">↻</span>
                  </button>
                </div>

                <div aria-live="polite" className="mt-10 min-h-40 w-full max-w-2xl">
                  {selectedSurprise ? (
                    <div className="territory-reveal">
                      <div className="flex items-start justify-between gap-6">
                        <p className="font-mono text-sm text-[#d7ff52]">
                          IDEA {selectedSurprise.number}
                        </p>
                        <p className="text-right text-xs uppercase tracking-[0.16em] text-white/45">
                          {selectedSurprise.signal}
                        </p>
                      </div>
                      <h3 className="mt-5 font-serif text-5xl tracking-[-0.04em] sm:text-6xl">
                        {selectedSurprise.title}
                      </h3>
                      <p className="mt-5 max-w-xl text-base leading-relaxed text-white/65">
                        {selectedSurprise.prompt}
                      </p>
                      <a
                        href="#experiencia"
                        className="mt-6 inline-flex border-b border-[#d7ff52] pb-1 text-sm font-bold text-[#d7ff52]"
                      >
                        Usar esta idea ↑
                      </a>
                    </div>
                  ) : (
                    <p className="border-t border-white/25 pt-5 text-center text-sm text-white/40">
                      {isSpinning
                        ? "Buscando una dirección…"
                        : "Tutorial · Opinión · Tendencia · Caso real · Aprendizaje · Experimento"}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : null}

        <section ref={resultRef} id="resultado" className="scroll-mt-6 bg-[#f4f0e6]">
          {state === "success" ? (
            <div className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8 lg:px-14 lg:py-32">
              <header className="mb-14 flex flex-col justify-between gap-8 border-b-2 border-black pb-8 md:flex-row md:items-end">
                <div>
                  <p className="step-label text-[#4468ff]">04 / Resultado</p>
                  <h2 className="mt-5 font-serif text-5xl tracking-[-0.045em] sm:text-7xl">
                    Revisa el contenido y decide qué quieres hacer con él.
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
                    <div
                      role="status"
                      className="absolute inset-0 z-10 grid place-items-center bg-black/70 px-8 text-center text-white"
                    >
                      <div>
                        <p className="text-sm font-bold uppercase tracking-[0.16em]">
                          {cover
                            ? "Buscando otra mirada…"
                            : "Creando la portada…"}
                        </p>
                        <p className="mt-3 font-mono text-sm tabular-nums text-white/70">
                          {coverElapsedLabel}
                        </p>
                        {!cover ? (
                          <>
                            <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">
                              Ya puedes revisar el artículo mientras termina la
                              imagen.
                            </p>
                            <button
                              type="button"
                              onClick={() =>
                                articleRef.current?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                })
                              }
                              className="mt-5 border-b border-white pb-1 text-xs font-bold uppercase tracking-[0.14em]"
                            >
                              Ir al artículo ↓
                            </button>
                          </>
                        ) : null}
                      </div>
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
                    Generar otra imagen <span aria-hidden="true">↻</span>
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
                ref={articleRef}
                className="generated-story"
                dangerouslySetInnerHTML={{ __html: article }}
              />

              <section className="publish-decision mt-20 bg-[#11110f] p-7 text-[#f4f0e6] sm:p-10">
                <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="step-label text-[#d7ff52]">05 / WordPress</p>
                    <h3 className="mt-4 max-w-2xl font-serif text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
                      La última palabra sigue siendo humana.
                    </h3>
                    <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/55">
                      Guarda un borrador para revisarlo con calma o publícalo ahora
                      con la portada elegida.
                    </p>
                    <p className="mt-3 max-w-xl text-xs leading-relaxed text-white/45">
                      Nada se enviará a WordPress hasta que elijas una de estas opciones.
                    </p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => publishPiece("draft")}
                      disabled={
                        isRefreshingCover || publishState === "publishing"
                      }
                      className="publish-secondary"
                    >
                      {isRefreshingCover
                        ? "Esperando portada…"
                        : "Guardar como borrador en WordPress"}
                    </button>
                    <button
                      type="button"
                      onClick={() => publishPiece("publish")}
                      disabled={
                        isRefreshingCover || publishState === "publishing"
                      }
                      className="publish-primary"
                    >
                      {isRefreshingCover
                        ? "Preparando portada…"
                        : publishState === "publishing"
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
                  cancelActiveWorkflow();
                  setSelectedSurprise(null);
                  setTopic("");
                  setArticle("");
                  setLiveArticleHtml("");
                  setLiveCoverDirection("");
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
                Crear otra publicación <span aria-hidden="true">↻</span>
              </button>
            </div>
          ) : null}
        </section>
      </main>

      <footer className="flex flex-col justify-between gap-5 border-t border-white/20 bg-[#11110f] px-5 py-8 text-xs uppercase tracking-[0.16em] text-white/50 sm:flex-row sm:px-8 lg:px-14">
        <span>El Salto Web · AI Lab</span>
        <span>Experimento construido con Next.js + Codex · 2026</span>
      </footer>
    </div>
  );
}
