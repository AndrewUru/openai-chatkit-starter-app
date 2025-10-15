"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

type WorkflowState = "idle" | "loading" | "success" | "error";

interface WorkflowResponse {
  article?: string;
  imageUrl?: string;
  wordpressUrl?: string | null;
  wordpress_url?: string | null;
  message?: string;
  success?: boolean;
}

const PUBLIC_KEY =
  process.env.NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY ?? "demo2025";

export function ArticleGenerator() {
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<WorkflowState>("idle");
  const [error, setError] = useState("");
  const [article, setArticle] = useState("");
  const [resultMessage, setResultMessage] = useState("");
  const [publishedLink, setPublishedLink] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (state === "loading") {
      setProgress(12);
      const interval = window.setInterval(() => {
        setProgress((current) => {
          const next = current + Math.random() * 12;
          return next >= 90 ? 90 : next;
        });
      }, 260);
      return () => window.clearInterval(interval);
    }

    if (state === "success") {
      setProgress(100);
      const timeout = window.setTimeout(() => setProgress(0), 800);
      return () => window.clearTimeout(timeout);
    }

    setProgress(0);
    return undefined;
  }, [state]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmed = topic.trim();

      if (!trimmed) {
        setError("Escribe un tema para comenzar.");
        setState("error");
        return;
      }

      setState("loading");
      setError("");
      setArticle("");
      setResultMessage("");
      setPublishedLink(null);

      try {
        const response = await fetch(
          `/api/workflow?key=${encodeURIComponent(PUBLIC_KEY)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ input_as_text: trimmed }),
          }
        );

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(
            detail || `Error ${response.status} al generar el articulo.`
          );
        }

        const data = (await response.json()) as WorkflowResponse;
        const generated = data.article?.trim();
        if (!generated) {
          throw new Error("La respuesta no incluyo contenido para el articulo.");
        }

        const link = data.wordpressUrl ?? data.wordpress_url ?? null;
        setArticle(generated);
        setPublishedLink(link ?? null);
        setResultMessage(
          data.message || "Articulo publicado con exito en WordPress."
        );
        setState("success");
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Ocurrio un error inesperado al generar el articulo.";
        setError(message);
        setState("error");
      }
    },
    [topic]
  );

  const statusLabel = useMemo(() => {
    if (state === "loading") {
      return "Generando y publicando en tiempo real...";
    }
    if (state === "success") {
      return resultMessage || "Articulo publicado con exito.";
    }
    if (state === "error") {
      return error || "No se pudo completar la publicacion.";
    }
    return "Comparte un tema y ve como la IA crea un articulo real.";
  }, [state, resultMessage, error]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-40 -left-32 h-72 w-72 rounded-full bg-emerald-500/25 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[32rem] w-[32rem] rounded-full bg-sky-500/20 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_-20%,rgba(56,189,248,0.35),transparent)]" />
      </div>

      <main className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-between px-6 pb-16 pt-14 sm:pt-20">
        <section className="space-y-12">
          <div className="space-y-6 text-center">
            <span className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-1 text-xs font-medium uppercase tracking-[0.24em] text-emerald-200">
              Experimento abierto
            </span>
            <div className="space-y-4">
              <h1 className="text-4xl font-semibold leading-tight sm:text-5xl lg:text-6xl">
                Tu idea, nuestra inteligencia
              </h1>
              <p className="mx-auto max-w-3xl text-base text-slate-300 sm:text-lg">
                Escribe un tema y mira como la IA lo transforma en un articulo
                listo para publicarse en{" "}
                <span className="font-semibold text-emerald-300">
                  El Salto Web
                </span>{" "}
                en tiempo real. Comparte tus ideas, explora la creatividad
                colectiva y observa el resultado publicado al instante.
              </p>
            </div>
          </div>

          <div className="mx-auto w-full max-w-3xl rounded-3xl border border-slate-800/60 bg-slate-900/60 p-8 shadow-2xl backdrop-blur transition hover:border-emerald-400/40 hover:shadow-[0_0_55px_rgba(45,212,191,0.25)]">
            <form className="space-y-4" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-3 text-left">
                <span className="text-sm font-semibold uppercase tracking-wide text-slate-300">
                  Tema del articulo
                </span>
                <input
                  type="text"
                  value={topic}
                  onChange={(event) => setTopic(event.target.value)}
                  placeholder="Ej. Futuro de la energia solar en barrios colaborativos"
                  disabled={state === "loading"}
                  className="w-full rounded-xl border border-slate-700/70 bg-slate-950/40 px-5 py-4 text-base text-slate-100 shadow-inner transition focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 disabled:cursor-wait disabled:opacity-60"
                />
              </label>

              <button
                type="submit"
                disabled={state === "loading"}
                className="group relative inline-flex w-full items-center justify-center overflow-hidden rounded-xl bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-500 px-6 py-3 text-base font-semibold text-slate-950 transition focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-950 disabled:cursor-wait disabled:opacity-70"
              >
                <span className="absolute inset-0 opacity-0 transition group-hover:opacity-20 group-hover:blur-md">
                  <span className="absolute inset-0 bg-white" />
                </span>
                <span className="relative flex items-center gap-2">
                  {state === "loading" ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/40 border-t-slate-950" />
                      Generando articulo en vivo...
                    </>
                  ) : (
                    "Publicar articulo con IA"
                  )}
                </span>
              </button>
            </form>

            <p
              className={`mt-5 text-center text-sm transition ${
                state === "error"
                  ? "text-rose-400"
                  : state === "success"
                  ? "text-emerald-300"
                  : "text-slate-400"
              }`}
            >
              {statusLabel}
            </p>

            {state === "loading" ? (
              <div className="mt-6 h-2 w-full overflow-hidden rounded-full bg-slate-800/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-sky-400 to-emerald-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            ) : null}
          </div>
        </section>

        {state === "success" ? (
          <section className="relative mt-12 space-y-6">
            <div className="mx-auto w-full max-w-4xl space-y-4 rounded-3xl border border-emerald-500/30 bg-slate-900/60 p-8 shadow-[0_0_65px_rgba(16,185,129,0.25)] backdrop-blur">
              <div className="space-y-3 text-center sm:text-left">
                <h2 className="text-2xl font-semibold text-emerald-200">
                  Articulo publicado
                </h2>
                <p className="text-sm text-slate-300">{resultMessage}</p>
                {publishedLink ? (
                  <a
                    href={publishedLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-2 self-start rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-2 text-sm font-medium text-emerald-200 transition hover:border-emerald-300 hover:text-emerald-100"
                  >
                    Ver articulo publicado
                    <span aria-hidden="true" className="text-base">
                      →
                    </span>
                  </a>
                ) : (
                  <p className="text-xs text-slate-400">
                    Revisa tu panel de WordPress para ver la publicacion.
                  </p>
                )}
              </div>

              <div className="max-h-[28rem] overflow-y-auto rounded-2xl border border-slate-800/60 bg-slate-950/60 p-6 shadow-inner">
                <div
                  className="prose prose-invert max-w-none leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: article }}
                />
              </div>
            </div>
          </section>
        ) : null}

        {state === "error" ? (
          <section className="mt-10">
            <div className="mx-auto w-full max-w-3xl rounded-2xl border border-rose-500/30 bg-rose-500/10 px-6 py-4 text-sm text-rose-200 shadow-[0_0_45px_rgba(244,63,94,0.2)]">
              {error}
            </div>
          </section>
        ) : null}

        <footer className="relative z-10 mt-16 flex flex-col items-center gap-2 text-center text-xs text-slate-500 sm:flex-row sm:justify-center sm:gap-4">
          <span>Experimento abierto</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
          <span>Powered by El Salto Web</span>
          <span className="hidden h-1 w-1 rounded-full bg-slate-600 sm:block" />
          <span>Creado con IA</span>
        </footer>
      </main>
    </div>
  );
}
