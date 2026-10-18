"use client";

import {
  CSSProperties,
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import Image from "next/image";
import Link from "next/link";
import { EditableStory } from "./EditableStory";
import dynamic from "next/dynamic";
import type {
  CoverAsset,
  CreativeWorkflowResponse,
} from "@/lib/creative-assets";
import type {
  EditorialStreamEvent,
  EditorialStreamPackage,
} from "@/lib/editorial-stream";
import {
  IDEA_TERRITORIES,
  type DiscoveredIdea,
} from "@/lib/idea-discovery";

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

type EditorialOption = {
  id: string;
  label: string;
  instruction: string;
};

const SURPRISE_NUMBERS = IDEA_TERRITORIES.map((territory) => territory.number);

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

const HERO_WORDS = ["Empieza", "con", "una", "idea."];

export function ArticleGenerator() {
  const [topic, setTopic] = useState("");
  const [selectedContentTypeId, setSelectedContentTypeId] =
    useState<string | null>(null);
  const [selectedFocusId, setSelectedFocusId] = useState<string | null>(null);
  const [showDirection, setShowDirection] = useState(false);
  const [selectedSurprise, setSelectedSurprise] =
    useState<DiscoveredIdea | null>(null);
  const [ideaElapsedSeconds, setIdeaElapsedSeconds] = useState(0);
  const [discoveryTerritory, setDiscoveryTerritory] = useState("");
  const [generationPhase, setGenerationPhase] = useState<"researching" | "writing" | "finalizing">("researching");
  const [ideaError, setIdeaError] = useState("");
  const [isDiscoveringIdea, setIsDiscoveringIdea] = useState(false);
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
  const [publishTarget, setPublishTarget] = useState<"draft" | "publish" | null>(null);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "error">("idle");
  const [isPublishPanelVisible, setIsPublishPanelVisible] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const generationRef = useRef<HTMLElement>(null);
  const articleRef = useRef<HTMLDivElement>(null);
  const livePageRef = useRef<HTMLDivElement>(null);
  const followLiveDraftRef = useRef(true);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const publishPanelRef = useRef<HTMLElement>(null);
  const readingProgressRef = useRef<HTMLSpanElement>(null);
  const workflowAbortRef = useRef<AbortController | null>(null);
  const ideaAbortRef = useRef<AbortController | null>(null);
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
      ideaAbortRef.current?.abort();
    },
    []
  );

  useEffect(() => {
    if (state === "loading") {
      const startedAt = Date.now();
      setElapsedSeconds(0);
      followLiveDraftRef.current = true;
      // The generation theater is a full-screen overlay: lock the page behind it.
      const root = document.documentElement;
      const previousOverflow = root.style.overflow;
      root.style.overflow = "hidden";
      generationRef.current?.focus({ preventScroll: true });
      const interval = window.setInterval(() => {
        setElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
      return () => {
        root.style.overflow = previousOverflow;
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
    if (state === "error") {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return undefined;
  }, [state]);

  // Keep the live draft pinned to the newest text unless the reader scrolled up.
  useEffect(() => {
    const page = livePageRef.current;
    if (page && followLiveDraftRef.current) {
      page.scrollTop = page.scrollHeight;
    }
  }, [liveArticleHtml]);

  useEffect(() => {
    if (!confirmPublish) return undefined;
    const timer = window.setTimeout(() => setConfirmPublish(false), 5000);
    return () => window.clearTimeout(timer);
  }, [confirmPublish]);

  useEffect(() => {
    if (copyState === "idle") return undefined;
    const timer = window.setTimeout(() => setCopyState("idle"), 2200);
    return () => window.clearTimeout(timer);
  }, [copyState]);

  useEffect(() => {
    const panel = publishPanelRef.current;
    if (state !== "success" || !panel) {
      setIsPublishPanelVisible(false);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) =>
      setIsPublishPanelVisible(entry.isIntersecting)
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, [state]);

  useEffect(() => {
    const story = articleRef.current;
    const bar = readingProgressRef.current;
    if (state !== "success" || !story || !bar) return undefined;
    let frame = 0;
    const update = () => {
      frame = 0;
      const bounds = story.getBoundingClientRect();
      const travel = bounds.height - window.innerHeight * 0.6;
      const progress =
        travel > 0
          ? (window.innerHeight * 0.4 - bounds.top) / travel
          : bounds.top < window.innerHeight * 0.4
          ? 1
          : 0;
      bar.style.transform = `scaleX(${Math.min(1, Math.max(0, progress))})`;
    };
    const schedule = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", schedule);
    };
  }, [state, article]);

  useEffect(() => {
    const container = resultRef.current;
    if (state !== "success" || !container) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    container.querySelectorAll(".reveal").forEach((node) => observer.observe(node));
    return () => observer.disconnect();
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

  useEffect(() => {
    if (!isDiscoveringIdea) return;
    const startedAt = Date.now();
    setIdeaElapsedSeconds(0);
    const timer = window.setInterval(() => {
      setIdeaElapsedSeconds(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isDiscoveringIdea]);

  const spinWheel = useCallback(async () => {
    if (isSpinning || isDiscoveringIdea) return;

    cancelActiveWorkflow();
    ideaAbortRef.current?.abort();

    const ideaController = new AbortController();
    ideaAbortRef.current = ideaController;
    const index = Math.floor(Math.random() * IDEA_TERRITORIES.length);
    const territory = IDEA_TERRITORIES[index];
    const currentPosition = ((wheelRotation % 360) + 360) % 360;
    const targetPosition = (330 - index * 60 + 360) % 360;
    const landingDistance = (targetPosition - currentPosition + 360) % 360;

    setDiscoveryTerritory(territory.title);
    setIdeaElapsedSeconds(0);
    setIsSpinning(true);
    setIsDiscoveringIdea(true);
    setSelectedSurprise(null);
    setIdeaError("");
    setState("idle");
    setError("");
    setWheelRotation((current) => current + 4 * 360 + landingDistance);

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const animationDuration = prefersReducedMotion ? 50 : 1700;
    window.setTimeout(() => {
      setIsSpinning(false);
    }, animationDuration);

    try {
      const [response] = await Promise.all([
        fetch(`/api/idea?key=${encodeURIComponent(PUBLIC_KEY)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: ideaController.signal,
          body: JSON.stringify({ territory: territory.id }),
        }),
        new Promise((resolve) => window.setTimeout(resolve, animationDuration)),
      ]);

      if (!response.ok) {
        const detail = await response.text().catch(() => "");
        throw new Error(detail || "No se pudo descubrir una idea nueva.");
      }

      const idea = (await response.json()) as DiscoveredIdea;
      setSelectedSurprise(idea);
      setTopic(idea.prompt);
    } catch (ideaRequestError) {
      if (
        ideaRequestError instanceof DOMException &&
        ideaRequestError.name === "AbortError"
      ) {
        return;
      }
      setIdeaError(
        ideaRequestError instanceof Error
          ? ideaRequestError.message
          : "No se pudo descubrir una idea nueva. Prueba otro giro."
      );
    } finally {
      if (ideaAbortRef.current === ideaController) {
        ideaAbortRef.current = null;
        setIsDiscoveringIdea(false);
      }
    }
  }, [cancelActiveWorkflow, isDiscoveringIdea, isSpinning, wheelRotation]);

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
        selectedSurprise?.sources.length &&
        humanContribution === selectedSurprise.prompt.trim()
          ? `Fuentes iniciales descubiertas por la ruleta: ${selectedSurprise.sources
              .map((source) => source.url)
              .join(", ")}.`
          : "Investiga en la web fuentes fiables y recientes antes de redactar cuando el tema incluya afirmaciones verificables.",
        selectedContentType
          ? `Tipo de contenido solicitado: ${selectedContentType.instruction}.`
          : "Elige el tipo de contenido que mejor sirva a la idea.",
        selectedFocus
          ? `Enfoque editorial solicitado: ${selectedFocus.instruction}.`
          : "Elige el enfoque y el tono que mejor sirvan a la idea y a una lectura web.",
        "Convierte la idea en una publicación completa, autónoma y lista para revisar antes de enviarla a WordPress.",
        "Respeta la información proporcionada. No inventes experiencias personales, citas, cifras, resultados ni fuentes.",
        "Incluye enlaces a las fuentes consultadas cuando aporten hechos, datos o contexto reciente.",
      ].join(" ");
      const visualBrief = [
        `Publicación editorial sobre: ${humanContribution}`,
        selectedContentType?.label || "Formato decidido por la IA",
        selectedFocus?.label || "Enfoque decidido por la IA",
        "Portada tipo thumbnail para YouTube y redes sociales, con titular breve integrado y estética techy desenfadada",
      ].join(" · ");

      workflowAbortRef.current?.abort();
      const workflowController = new AbortController();
      workflowAbortRef.current = workflowController;

      setGenerationPhase("researching");
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
      setPublishTarget(null);
      setConfirmPublish(false);
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
          if (event.type === "status") {
            setGenerationPhase(event.phase);
            return;
          }
          if (event.data.article_html) {
            setGenerationPhase("writing");
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
        setGenerationPhase("finalizing");
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
    [selectedContentType, selectedFocus, selectedSurprise, topic]
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
      setConfirmPublish(false);
      setPublishTarget(status);
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

  const cancelGeneration = useCallback(() => {
    cancelActiveWorkflow();
    setLiveArticleHtml("");
    setLiveCoverDirection("");
    setState("idle");
    document
      .getElementById("experiencia")
      ?.scrollIntoView({ behavior: "smooth" });
  }, [cancelActiveWorkflow]);

  const copyArticleHtml = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(article);
      setCopyState("copied");
    } catch {
      setCopyState("error");
    }
  }, [article]);

  const startOver = useCallback(() => {
    if (
      publishState !== "published" &&
      !window.confirm(
        "El borrador actual no se ha enviado a WordPress y se perderá. ¿Quieres empezar otra publicación?"
      )
    ) {
      return;
    }
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
    setPublishTarget(null);
    setConfirmPublish(false);
    setPublishMessage("");
    setState("idle");
    document
      .getElementById("experiencia")
      ?.scrollIntoView({ behavior: "smooth" });
  }, [cancelActiveWorkflow, publishState]);

  const coverPreviewUrl =
    cover?.source === "generated"
      ? `data:${cover.mimeType};base64,${cover.data}`
      : cover?.source === "unsplash"
      ? cover.url
      : null;

  const liveWordCount = countWords(liveArticleHtml);
  const generationSteps = ["Investigar fuentes", "Redactar artículo", "Preparar borrador"];
  const activeGenerationStep = generationPhase === "researching" ? 0 : generationPhase === "writing" ? 1 : 2;
  const loadingMessage = generationPhase === "researching"
    ? "Buscando y contrastando fuentes en la web"
    : generationPhase === "writing"
    ? "Redactando tu publicación"
    : "Preparando el borrador para revisión";
  const loadingHint = generationPhase === "researching"
    ? "La IA está investigando el tema. El texto aparecerá aquí cuando comience la redacción."
    : generationPhase === "writing"
    ? "El artículo llega en directo. Puedes leerlo mientras se completa."
    : "El texto está completo. Estamos aplicando el formato final.";

  const elapsedLabel = `${String(Math.floor(elapsedSeconds / 60)).padStart(
    2,
    "0"
  )}:${String(elapsedSeconds % 60).padStart(2, "0")}`;

  const coverElapsedLabel = `${String(
    Math.floor(coverElapsedSeconds / 60)
  ).padStart(2, "0")}:${String(coverElapsedSeconds % 60).padStart(2, "0")}`;

  const studioStatus =
    state === "loading"
      ? { label: "Creando publicación", color: "#d7ff52", pulse: true }
      : isDiscoveringIdea
      ? { label: "Buscando idea", color: "#4468ff", pulse: true }
      : publishState === "published"
      ? { label: "Enviado a WordPress", color: "#50c8a8", pulse: false }
      : state === "success"
      ? { label: "Borrador listo para revisar", color: "#ffca3a", pulse: false }
      : { label: "Listo para crear", color: "#50c8a8", pulse: false };

  const directionSummary =
    [selectedContentType?.label, selectedFocus?.label]
      .filter(Boolean)
      .join(" · ") || "Automático";

  const isPublished = publishState === "published";
  const publishLocked =
    isRefreshingCover || publishState === "publishing" || isPublished;

  return (
    <div className="experience-shell min-h-screen text-[#11110f]">
      <main>
        <section id="experiencia" className="studio-workspace">
          <header className="studio-header">
            <div className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-[#11110f] text-xs font-black text-[#d7ff52]">
                ES
              </span>
              <div>
                <p className="text-sm font-black uppercase tracking-[-0.02em]">
                  El Salto Web
                </p>
                <p className="font-mono text-[.62rem] uppercase tracking-[.16em] text-black/45">
                  Estudio editorial con IA
                </p>
              </div>
            </div>
            <div className="flex items-center gap-5">
              <p
                aria-live="polite"
                className="hidden items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-black/45 sm:flex"
              >
                <span
                  className={`h-2 w-2 rounded-full ${studioStatus.pulse ? "status-pulse" : ""}`}
                  style={{ backgroundColor: studioStatus.color }}
                />
                {studioStatus.label}
              </p>
              <Link href="/flujo" className="nav-link hidden md:inline">
                Cómo funciona
              </Link>
            </div>
          </header>

          <div className="studio-grid">
            <div
              className="studio-form-panel"
              onPointerMove={(event) => {
                const bounds = event.currentTarget.getBoundingClientRect();
                event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
                event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
              }}
            >
              <div className="max-w-2xl">
                <p className="step-label text-[#4468ff]">01 / Crear publicación</p>
                <h1
                  aria-label={HERO_WORDS.join(" ")}
                  className="hero-title mt-4 font-serif text-[clamp(3rem,6vw,5.8rem)] leading-[.88] tracking-[-.06em]"
                >
                  {HERO_WORDS.map((word, index) => (
                    <span
                      key={word}
                      aria-hidden="true"
                      style={{ "--i": index } as CSSProperties}
                    >
                      {word}{" "}
                    </span>
                  ))}
                </h1>
                <p className="mt-5 max-w-xl text-base leading-relaxed text-black/55">
                  Escríbela tú o deja que la ruleta encuentre un ángulo editorial
                  y lo coloque aquí.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 flex flex-1 flex-col">
                <label
                  htmlFor="editorial-idea"
                  className="text-xs font-black uppercase tracking-[.16em]"
                >
                  Tu idea
                </label>
                <div className="studio-textarea-wrap mt-3">
                  <textarea
                    id="editorial-idea"
                    value={topic}
                    onChange={(event) => {
                      setTopic(event.target.value);
                      setError("");
                    }}
                    onKeyDown={(event) => {
                      if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                    placeholder="¿Sobre qué quieres escribir?"
                    disabled={state === "loading" || isRefreshingCover}
                    rows={5}
                    required
                    className="studio-textarea"
                  />
                  <span className="absolute bottom-4 right-4 font-mono text-[.65rem] uppercase tracking-[.12em] text-black/35">
                    {topic.trim().length} caracteres
                  </span>
                </div>

                {selectedSurprise ? (
                  <div className="mt-3 flex items-center justify-between gap-4 border-l-2 border-[#4468ff] pl-3 text-xs">
                    <p className="font-semibold">
                      Idea de la ruleta · {selectedSurprise.territory}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSurprise(null);
                        setTopic("");
                      }}
                      className="font-bold text-black/45 transition hover:text-black"
                    >
                      Limpiar
                    </button>
                  </div>
                ) : null}

                <div className="mt-6 border-t border-black/15 pt-5">
                  <button
                    type="button"
                    onClick={() => setShowDirection((current) => !current)}
                    aria-expanded={showDirection}
                    aria-controls="editorial-direction"
                    className="flex w-full items-center justify-between text-left text-xs font-black uppercase tracking-[.14em]"
                  >
                    Afinar formato y tono
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-[.65rem] font-normal normal-case tracking-normal text-black/50">
                        {directionSummary}
                      </span>
                      <span aria-hidden="true" className="text-lg">
                        {showDirection ? "−" : "+"}
                      </span>
                    </span>
                  </button>

                  {showDirection ? (
                    <div id="editorial-direction" className="mt-5 grid gap-5">
                      <fieldset>
                        <legend className="font-mono text-[.65rem] uppercase tracking-[.12em] text-black/45">
                          Formato
                        </legend>
                        <div className="mt-3 flex flex-wrap gap-2">
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
                        <legend className="font-mono text-[.65rem] uppercase tracking-[.12em] text-black/45">
                          Tono
                        </legend>
                        <div className="mt-3 flex flex-wrap gap-2">
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
                    </div>
                  ) : null}
                </div>

                <div className="mt-auto pt-8">
                  <button
                    type="submit"
                    disabled={state === "loading" || isDiscoveringIdea || isRefreshingCover || !topic.trim()}
                    className="studio-create-button"
                  >
                    <span>{state === "loading" ? "Creando…" : "Crear publicación"}</span>
                    <span aria-hidden="true" className="text-xl">→</span>
                  </button>
                  <p className="mt-3 text-center text-xs text-black/45">
                    Se genera un borrador. Nada se publica sin tu confirmación.
                    <span className="hidden sm:inline">
                      {" "}· <kbd className="font-mono">Ctrl</kbd> + <kbd className="font-mono">Enter</kbd> para crear
                    </span>
                  </p>
                  {state === "error" ? (
                    <p ref={errorRef} role="alert" className="mt-4 border-l-4 border-[#ff5c35] pl-4 text-sm font-semibold">
                      {error}
                    </p>
                  ) : null}
                </div>
              </form>
            </div>

            <aside
              id="ruleta"
              className="studio-wheel-panel"
              data-active={isSpinning || isDiscoveringIdea}
            >
              <div className="wheel-ambient" aria-hidden="true">
                <span />
                <span />
              </div>
              <div className="flex w-full items-start justify-between gap-4">
                <div>
                  <p className="step-label text-[#d7ff52]">¿Sin idea?</p>
                  <h2 className="mt-3 font-serif text-4xl leading-none tracking-[-.045em] sm:text-5xl">
                    Gira la ruleta.
                  </h2>
                </div>
                <p className="max-w-40 text-right text-xs leading-relaxed text-white/45">
                  Investiga una señal real y la convierte en punto de partida.
                </p>
              </div>

              <div className="my-auto flex flex-col items-center py-8">
                <div className="wheel-stage studio-wheel-stage">
                  <div className="wheel-pointer" aria-hidden="true" />
                  <FutureWheelWebGL
                    labels={SURPRISE_NUMBERS}
                    rotation={wheelRotation}
                    spinning={isSpinning}
                  />
                  <button
                    type="button"
                    onClick={spinWheel}
                    disabled={isSpinning || isDiscoveringIdea}
                    className="wheel-trigger"
                    aria-label="Girar la ruleta y buscar una idea editorial nueva"
                  >
                    <span>
                      {isSpinning
                        ? "Girando"
                        : isDiscoveringIdea
                        ? "Buscando"
                        : "Girar"}
                    </span>
                    <span aria-hidden="true" className="text-xl">↻</span>
                  </button>
                </div>

                <div aria-live="polite" className="mt-7 min-h-24 w-full max-w-xl">
                  {isDiscoveringIdea ? (
                    <div className="idea-search-panel" role="status" aria-busy="true">
                      <div className="flex items-center gap-4">
                        <span className="workflow-spinner" aria-hidden="true" />
                        <div>
                          <p className="font-mono text-xs uppercase tracking-widest text-[#d7ff52]">
                            {isSpinning ? "Seleccionando territorio" : "Investigando en la web"}
                          </p>
                          <h3 className="mt-2 text-xl font-semibold">
                            {isSpinning ? "Tu próxima idea está en camino" : `Buscando una idea sobre ${discoveryTerritory}`}
                          </h3>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-relaxed text-white/65">
                        Consultamos fuentes actuales para preparar una idea con contexto y referencias.
                      </p>
                      <div className="workflow-track mt-5" aria-hidden="true"><span /></div>
                      <p className="mt-3 text-xs text-white/50">
                        {ideaElapsedSeconds} s de búsqueda · {ideaElapsedSeconds >= 30 ? "La investigación sigue en curso. Algunas fuentes tardan más en responder." : "La idea aparecerá aquí en cuanto está lista."}
                      </p>
                    </div>
                  ) : selectedSurprise ? (
                    <div className="studio-idea-result">
                      <div className="flex items-center justify-between gap-4">
                        <p className="font-mono text-[.68rem] uppercase tracking-[.12em] text-[#d7ff52]">
                          {selectedSurprise.number} · {selectedSurprise.territory}
                        </p>
                        <p className="truncate text-right text-[.68rem] uppercase tracking-[.1em] text-white/35">
                          {selectedSurprise.signal}
                        </p>
                      </div>
                      <h3 className="mt-3 font-serif text-2xl leading-tight tracking-[-.03em] sm:text-3xl">
                        {selectedSurprise.title}
                      </h3>
                      <p className="mt-2 text-sm leading-relaxed text-white/55">
                        La idea ya está en el formulario. Puedes editarla antes de crear.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const field = document.getElementById("editorial-idea");
                          field?.scrollIntoView({ behavior: "smooth", block: "center" });
                          field?.focus({ preventScroll: true });
                        }}
                        className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#d7ff52] px-4 py-2 text-xs font-black uppercase tracking-[.12em] text-[#11110f] transition hover:bg-white"
                      >
                        Usar esta idea <span aria-hidden="true">↓</span>
                      </button>
                    </div>
                  ) : ideaError ? (
                    <p role="alert" className="border-l-2 border-[#ff5c35] pl-3 text-sm text-[#ff9b82]">
                      {ideaError}
                    </p>
                  ) : (
                    <p className="text-center text-sm text-white/40">
                      {isDiscoveringIdea
                        ? "Buscando una idea y fuentes actuales…"
                        : "Pulsa el centro para descubrir tu próxima publicación."}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 border-t border-white/15 pt-4 font-mono text-[.58rem] uppercase tracking-[.1em] text-white/35">
                {IDEA_TERRITORIES.map((territory) => (
                  <span key={territory.id}>{territory.title}</span>
                ))}
              </div>
            </aside>
          </div>
        </section>

        {state === "loading" ? (
          <section
            ref={generationRef}
            id="generacion"
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Generando la publicación"
            data-phase={generationPhase}
            className="ai-theater"
          >
            <div className="ai-theater-ambient" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
            <div className="ai-theater-grain" aria-hidden="true" />

            <header className="ai-theater-top">
              <p className="step-label flex shrink-0 items-center gap-3 text-[var(--phase)]">
                <span className="ai-live-dot" aria-hidden="true" />
                <span className="hidden sm:inline">02 / </span>Generación en directo
              </p>
              <p className="ai-theater-topic" title={topic}>
                «{topic.trim()}»
              </p>
              <div className="flex shrink-0 items-center gap-4">
                <span className="font-mono text-sm tabular-nums text-white/60">
                  {elapsedLabel}
                </span>
                <button
                  type="button"
                  onClick={cancelGeneration}
                  className="ai-theater-cancel"
                >
                  Cancelar <span aria-hidden="true">×</span>
                </button>
              </div>
            </header>

            <ol className="ai-theater-timeline" aria-label="Avance de la publicación">
              {generationSteps.map((label, index) => (
                <li
                  key={label}
                  data-active={index === activeGenerationStep}
                  data-complete={index < activeGenerationStep}
                  aria-current={index === activeGenerationStep ? "step" : undefined}
                >
                  <span className="ai-theater-timeline-bar" aria-hidden="true">
                    <span />
                  </span>
                  <span className="mt-3 flex items-center gap-2">
                    <span aria-hidden="true" className="font-mono text-[.65rem] opacity-60">
                      {index < activeGenerationStep ? "✓" : `0${index + 1}`}
                    </span>
                    {label}
                    <span className="sr-only">
                      {index === activeGenerationStep
                        ? " · En curso"
                        : index < activeGenerationStep
                        ? " · Listo"
                        : " · Pendiente"}
                    </span>
                  </span>
                </li>
              ))}
            </ol>

            <div
              ref={livePageRef}
              onScroll={(event) => {
                const page = event.currentTarget;
                followLiveDraftRef.current =
                  page.scrollHeight - page.scrollTop - page.clientHeight < 96;
              }}
              className="ai-theater-stage"
              aria-busy="true"
            >
              {liveArticleHtml ? (
                <div className="ai-live-story ai-theater-story">
                  <article
                    className="ia-generated is-streaming"
                    dangerouslySetInnerHTML={{ __html: liveArticleHtml }}
                  />
                </div>
              ) : (
                <div className="ai-theater-intro">
                  <div className="ai-orb" aria-hidden="true">
                    <span />
                    <span />
                    <span />
                  </div>
                  <h2 key={generationPhase} className="ai-theater-headline">
                    {loadingMessage}
                  </h2>
                  <p className="mt-5 max-w-md text-center text-sm leading-relaxed text-white/50">
                    {loadingHint}
                  </p>
                  <div className="mt-12 w-full max-w-xl space-y-4" aria-hidden="true">
                    <div className="ai-writing-line h-9 w-4/5" />
                    <div className="ai-writing-line h-3 w-full" />
                    <div className="ai-writing-line h-3 w-11/12" />
                    <div className="ai-writing-line h-3 w-3/4" />
                  </div>
                </div>
              )}
            </div>

            <footer className="ai-theater-bottom">
              <p aria-live="polite" className="min-w-0 truncate">
                <span className="text-[var(--phase)]">{loadingMessage}</span>
                {elapsedSeconds >= 45 ? (
                  <span className="hidden text-white/45 md:inline">
                    {" "}· Puede tardar unos minutos, la IA sigue trabajando.
                  </span>
                ) : null}
              </p>
              <div className="flex shrink-0 items-center gap-6 font-mono text-[.68rem] uppercase tracking-[.12em] text-white/45">
                <span>
                  <span className="tabular-nums text-white">{liveWordCount}</span> palabras
                </span>
                <span className="hidden sm:inline">
                  Portada{" "}
                  <span className="text-white">
                    {liveCoverDirection ? "dirigida" : "pendiente"}
                  </span>
                </span>
              </div>
            </footer>
          </section>
        ) : null}

        {state === "success" ? (
          <div className="reading-progress" aria-hidden="true">
            <span ref={readingProgressRef} />
          </div>
        ) : null}

        <section
          ref={resultRef}
          id="resultado"
          className="scroll-mt-6 bg-[#f4f0e6]"
        >
          {state === "success" ? (
            <div className="mx-auto w-full max-w-[1200px] px-5 py-24 sm:px-8 lg:px-14 lg:py-32">
              <header className="reveal mb-14 flex flex-col justify-between gap-8 border-b-2 border-black pb-8 md:flex-row md:items-end">
                <div>
                  <p className="step-label text-[#4468ff]">03 / Resultado</p>
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

              <section className="reveal cover-review mb-20">
                <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
                  <div>
                    <p className="step-label text-[#ff5c35]">La portada</p>
                    <h3 className="mt-3 font-serif text-4xl tracking-[-0.04em] sm:text-5xl">
                      Un thumbnail hecho para destacar.
                    </h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-black/55">
                      Titular integrado, composición adaptable a redes y una
                      dirección techy distinta en cada variación.
                    </p>
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
                        <span className="workflow-spinner mx-auto mb-5" aria-hidden="true" />
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
                    Otra versión techy <span aria-hidden="true">↻</span>
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

              <EditableStory
                html={article}
                onChange={setArticle}
                apiKey={PUBLIC_KEY}
                disabled={publishState === "publishing" || isPublished}
                storyRef={articleRef}
              />

              <section
                ref={publishPanelRef}
                id="publicar"
                className="reveal publish-decision mt-20 scroll-mt-6 bg-[#11110f] p-7 text-[#f4f0e6] sm:p-10"
              >
                <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-end">
                  <div>
                    <p className="step-label text-[#d7ff52]">04 / WordPress</p>
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
                  {isPublished && publishedLink ? (
                    <a
                      href={publishedLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="publish-primary text-center"
                    >
                      Ver en WordPress ↗
                    </a>
                  ) : (
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={() => publishPiece("draft")}
                      disabled={publishLocked}
                      className="publish-secondary"
                    >
                      {isRefreshingCover
                        ? "Esperando portada…"
                        : publishState === "publishing" && publishTarget === "draft"
                        ? "Guardando…"
                        : isPublished && publishTarget === "draft"
                        ? "Borrador guardado ✓"
                        : "Guardar como borrador en WordPress"}
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        confirmPublish
                          ? publishPiece("publish")
                          : setConfirmPublish(true)
                      }
                      disabled={publishLocked}
                      className={`publish-primary ${confirmPublish ? "is-confirming" : ""}`}
                    >
                      {isRefreshingCover
                        ? "Preparando portada…"
                        : publishState === "publishing" && publishTarget === "publish"
                        ? "Publicando…"
                        : isPublished && publishTarget === "publish"
                        ? "Publicado ✓"
                        : confirmPublish
                        ? "Confirmar: publicar ya"
                        : "Publicar ahora ↗"}
                    </button>
                  </div>
                  )}
                </div>

                {confirmPublish ? (
                  <p role="status" className="mt-5 text-sm text-[#ffca3a]">
                    Se hará público en WordPress de inmediato. Pulsa de nuevo para
                    confirmar o{" "}
                    <button
                      type="button"
                      onClick={() => setConfirmPublish(false)}
                      className="border-b border-current font-bold"
                    >
                      cancelar
                    </button>
                    .
                  </p>
                ) : null}

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
                onClick={startOver}
                className="mx-auto mt-16 flex items-center gap-3 border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-[0.16em]"
              >
                Crear otra publicación <span aria-hidden="true">↻</span>
              </button>
            </div>
          ) : null}

          {state === "success" && !isPublishPanelVisible ? (
            <div className="result-action-bar" role="region" aria-label="Acciones del borrador">
              <p className="hidden min-w-0 truncate text-xs text-white/60 sm:block">
                {isRefreshingCover
                  ? `Preparando portada · ${coverElapsedLabel}`
                  : isPublished
                  ? publishMessage
                  : "Borrador listo · aún no enviado a WordPress"}
              </p>
              <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
                <button
                  type="button"
                  onClick={copyArticleHtml}
                  className="publish-secondary result-action-button"
                >
                  {copyState === "copied"
                    ? "Copiado ✓"
                    : copyState === "error"
                    ? "No se pudo copiar"
                    : "Copiar HTML"}
                </button>
                {isPublished && publishedLink ? (
                  <a
                    href={publishedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="publish-primary result-action-button text-center"
                  >
                    Ver en WordPress ↗
                  </a>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      publishPanelRef.current?.scrollIntoView({
                        behavior: "smooth",
                        block: "start",
                      })
                    }
                    className="publish-primary result-action-button"
                  >
                    {isPublished ? "Ver estado ↓" : "Revisar y publicar ↓"}
                  </button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </main>
    </div>
  );
}
