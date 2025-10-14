"use client";

import { useCallback, useState } from "react";

type GenerationStatus =
  | { state: "idle"; article: ""; error: "" }
  | { state: "loading"; article: ""; error: "" }
  | { state: "success"; article: string; error: "" }
  | { state: "error"; article: ""; error: string };

type PublishStatus =
  | { state: "idle"; url: ""; error: "" }
  | { state: "loading"; url: ""; error: "" }
  | { state: "success"; url: string; error: "" }
  | { state: "error"; url: ""; error: string };

const INITIAL_STATUS: GenerationStatus = { state: "idle", article: "", error: "" };
const INITIAL_PUBLISH_STATUS: PublishStatus = { state: "idle", url: "", error: "" };

export function ArticleGenerator() {
  const [topic, setTopic] = useState("");
  const [status, setStatus] = useState<GenerationStatus>(INITIAL_STATUS);
  const [publishStatus, setPublishStatus] =
    useState<PublishStatus>(INITIAL_PUBLISH_STATUS);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const trimmedTopic = topic.trim();
      if (!trimmedTopic) {
        setStatus({
          state: "error",
          article: "",
          error: "Ingresa un tema para generar el articulo.",
        });
        return;
      }

      setStatus({ state: "loading", article: "", error: "" });
    try {
      const response = await fetch("/api/workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_as_text: trimmedTopic }),
        });

        if (!response.ok) {
          const detail = await response.text().catch(() => "");
          throw new Error(detail || `Error ${response.status} al generar el articulo.`);
        }

        const { article } = (await response.json()) as { article?: string };
        if (!article?.trim()) {
          throw new Error("La respuesta no incluyo un articulo.");
        }

        setStatus({ state: "success", article: article.trim(), error: "" });
        setPublishStatus(INITIAL_PUBLISH_STATUS);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Ocurrio un error inesperado al generar el articulo.";
        setStatus({ state: "error", article: "", error: message });
        setPublishStatus(INITIAL_PUBLISH_STATUS);
      }
    },
    [topic]
  );

  const handlePublish = useCallback(async () => {
    if (status.state !== "success") {
      return;
    }

    const trimmedTopic = topic.trim();
    setPublishStatus({ state: "loading", url: "", error: "" });

    try {
      const response = await fetch("/api/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: trimmedTopic || undefined,
          content: status.article,
          status: "draft",
        }),
      });

      if (!response.ok) {
        const detailText = await response.text().catch(() => "");
        let errorMessage = `Error ${response.status} al publicar en WordPress.`;

        if (detailText) {
          try {
            const parsed = JSON.parse(detailText) as { message?: string };
            if (parsed && typeof parsed.message === "string") {
              errorMessage = parsed.message;
            }
          } catch {
            errorMessage = detailText;
          }
        }

        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { post?: { link?: string } };
      const link =
        data.post && typeof data.post.link === "string" ? data.post.link : "";

      setPublishStatus({ state: "success", url: link, error: "" });
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Ocurrio un error inesperado al publicar en WordPress.";
      setPublishStatus({ state: "error", url: "", error: message });
    }
  }, [status, topic]);

  const isLoading = status.state === "loading";
  const showError = status.state === "error";
  const showArticle = status.state === "success";
  const isPublishing = publishStatus.state === "loading";
  const showPublishSuccess = publishStatus.state === "success";
  const showPublishError = publishStatus.state === "error";

  return (
    <section className="flex flex-col gap-6 rounded-2xl bg-white p-8 shadow-md dark:bg-slate-900">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">
          Generador de articulos SEO
        </h1>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Escribe un tema y la aplicacion generara un articulo optimizado utilizando el endpoint local
          `/api/workflow`.
        </p>
      </header>

      <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300" htmlFor="topic">
          Tema del articulo
        </label>
        <input
          id="topic"
          name="topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          placeholder="Ejemplo: Como optimizar tu web con TailwindCSS y Astro"
          disabled={isLoading}
          className="rounded-lg border border-slate-300 px-4 py-3 text-base text-slate-900 shadow-sm focus:border-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-500 disabled:cursor-not-allowed disabled:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-slate-500 dark:disabled:bg-slate-800/60"
        />
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center justify-center rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-500 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200 dark:focus:ring-slate-300 dark:focus:ring-offset-slate-900"
        >
          {isLoading ? "Generando articulo..." : "Generar articulo"}
        </button>
      </form>

      {showArticle && (
        <div className="flex flex-col gap-3">
          <article className="prose prose-slate max-w-none whitespace-pre-wrap dark:prose-invert">
            {status.article}
          </article>
          <button
            type="button"
            onClick={handlePublish}
            disabled={isPublishing}
            className="inline-flex items-center justify-center self-start rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-emerald-400 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:focus:ring-emerald-300 dark:focus:ring-offset-slate-900"
          >
            {isPublishing ? "Publicando..." : "Publicar en WordPress"}
          </button>
        </div>
      )}

      {showError && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
          {status.error}
        </div>
      )}

      {showPublishError && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-700 dark:bg-rose-900/40 dark:text-rose-200">
          {publishStatus.error}
        </div>
      )}

      {showPublishSuccess && (
        <div className="rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
          Articulo enviado a WordPress como borrador.
          {publishStatus.url ? (
            <>
              {" "}
              <a
                href={publishStatus.url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                Ver entrada
              </a>
              .
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}
