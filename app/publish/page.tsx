"use client";

import { FormEvent, useState } from "react";

const EXPERIMENT_KEY =
  process.env.NEXT_PUBLIC_PUBLIC_EXPERIMENT_KEY ?? "demo2025";

type PublishState =
  | { status: "idle"; message: string }
  | { status: "loading"; message: string }
  | { status: "error"; message: string }
  | { status: "success"; message: string; link?: string | null };

export default function PublishPage() {
  const [topic, setTopic] = useState("");
  const [state, setState] = useState<PublishState>({
    status: "idle",
    message: "Comparte un tema y publicaremos un artículo en WordPress.",
  });

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!topic.trim()) {
      setState({
        status: "error",
        message: "Por favor, escribe un tema antes de enviar.",
      });
      return;
    }

    setState({
      status: "loading",
      message: "Generando artículo y publicando en WordPress...",
    });

    try {
      const response = await fetch(`/api/workflow?key=${EXPERIMENT_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input_as_text: topic.trim() }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(detail || "Error inesperado al publicar.");
      }

      const result = await response.json();
      setState({
        status: "success",
        message: result.message ?? "Artículo publicado con éxito.",
        link: result.wordpressUrl ?? result.wordpress_url ?? null,
      });
      setTopic("");
    } catch (error) {
      console.error("Fallo publicando artículo:", error);
      const message =
        error instanceof Error ? error.message : "No se pudo publicar.";
      setState({ status: "error", message });
    }
  }

  const disabled = state.status === "loading";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-6 py-12 text-slate-100">
      <div className="w-full max-w-xl space-y-6 rounded-2xl bg-slate-900/60 p-8 shadow-xl backdrop-blur">
        <header className="space-y-2 text-center">
          <h1 className="text-3xl font-semibold sm:text-4xl">
            🧠 Publica en El Salto Web
          </h1>
          <p className="text-sm text-slate-300 sm:text-base">
            Introduce un tema breve; generaremos y publicaremos un artículo
            automáticamente durante el experimento.
          </p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-200">
              Tema del artículo
            </span>
            <input
              type="text"
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              placeholder="Ej. Tendencias del desarrollo web sostenible"
              className="w-full rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-base text-slate-100 placeholder:text-slate-500 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition"
              disabled={disabled}
            />
          </label>

          <button
            type="submit"
            disabled={disabled}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-400 px-4 py-3 text-base font-semibold text-emerald-950 transition hover:bg-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-60"
          >
            {disabled ? "Publicando…" : "Publicar artículo"}
          </button>
        </form>

        <footer className="space-y-2 text-center text-sm">
          <p
            className={
              state.status === "error"
                ? "text-rose-400"
                : state.status === "success"
                ? "text-emerald-400"
                : "text-slate-300"
            }
          >
            {state.message}
          </p>
          {state.status === "success" && state.link ? (
            <a
              href={state.link}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-emerald-300 hover:text-emerald-200"
            >
              Ver artículo publicado →
            </a>
          ) : null}
          <p className="text-xs text-slate-500">
            Esta demo usa la clave pública temporal del experimento (
            <code>{EXPERIMENT_KEY}</code>). Cámbiala o desactívala cuando
            termine la prueba.
          </p>
        </footer>
      </div>
    </div>
  );
}
