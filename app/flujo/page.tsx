import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Flujo del Agente | AgentKit demo",
  description:
    "Descripción paso a paso del flujo del agente que genera y publica artículos con ChatKit.",
};

const stages = [
  {
    title: "1. Validación y seguridad",
    description:
      "El endpoint recibe la solicitud desde la interfaz, verifica la clave pública `PUBLIC_EXPERIMENT_KEY` y solo continúa si coincide.",
  },
  {
    title: "2. Generación del contenido",
    description:
      "Se invoca a `gpt-4o-mini` con un prompt estructurado para crear el artículo HTML. El resultado se envuelve con la clase `.ia-generated` y estilos inline.",
  },
  {
    title: "3. Diseño y recursos visuales",
    description:
      "El flujo solicita a `gpt-image-1` una imagen destacada siguiendo la estética definida en el prompt, lista para subirse como media en WordPress.",
  },
  {
    title: "4. Publicación automatizada",
    description:
      "Si las credenciales de WordPress están disponibles, se crea el post con título derivado del `<h1>`, contenido estilizado.",
  },
  {
    title: "5. Retroalimentación a la UI",
    description:
      "La API responde con el HTML final, la URL de la imagen y el enlace publicado para que la interfaz muestre la vista previa y confirme el éxito.",
  },
];

export default function FlowPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-32 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-emerald-500/15 blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[30rem] w-[30rem] rounded-full bg-sky-500/15 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-12 px-6 pb-20 pt-16 sm:pt-20 lg:px-12">
        <header className="space-y-6 text-center">
          <p className="inline-flex items-center justify-center rounded-full border border-emerald-400/50 bg-emerald-400/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-emerald-200">
            Flujo del agente
          </p>
          <h1 className="text-4xl font-semibold leading-tight text-emerald-100 sm:text-5xl">
            Cómo ChatKit produce y publica un artículo
          </h1>
          <p className="mx-auto max-w-3xl text-base text-slate-300 sm:text-lg">
            Este recorrido explica las etapas que recorre la demo: desde que el
            usuario propone un tema hasta que el contenido estilizado queda
            publicado en WordPress con un look consistente.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/60 bg-emerald-400/20 px-5 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              Volver al generador
            </Link>
            <Link
              href="/docs"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/80 px-5 py-2 text-sm font-semibold text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Ver documentación completa
            </Link>
          </div>
        </header>

        <section className="space-y-8">
          <div className="grid gap-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-emerald-500/10 sm:grid-cols-2">
            <article className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-slate-200">
              <h2 className="mb-3 text-base font-semibold text-emerald-100">
                Resumen técnico
              </h2>
              <ul className="space-y-2">
                <li>• API principal: `POST /api/workflow`.</li>
                <li>• Modelos utilizados: `gpt-4o-mini` y `gpt-image-1`.</li>
                <li>• Salida: HTML con clase `.ia-generated` + imagen.</li>
                <li>• Destino: publicación directa en WordPress.</li>
              </ul>
            </article>
            <article className="rounded-2xl border border-slate-700/80 bg-slate-900/80 p-6 text-sm text-slate-300">
              <h2 className="mb-3 text-base font-semibold text-slate-100">
                Buenas prácticas
              </h2>
              <ul className="space-y-2">
                <li>
                  • Limita la longitud del tema para obtener textos precisos.
                </li>
                <li>
                  • Ajusta la clase `.ia-generated` para mantener identidad.
                </li>
                <li>
                  • Usa estado `draft` en WordPress si necesitas revisión.
                </li>
                <li>• Loggea respuestas de error para facilitar el soporte.</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="space-y-8">
          <h2 className="text-2xl font-semibold text-emerald-100">
            Etapas del pipeline
          </h2>
          <div className="space-y-6">
            {stages.map((stage) => (
              <article
                key={stage.title}
                className="rounded-3xl border border-slate-800 bg-slate-900/70 p-6 text-sm text-slate-300 shadow-lg shadow-slate-900/40"
              >
                <h3 className="text-lg font-semibold text-emerald-200">
                  {stage.title}
                </h3>
                <p className="mt-2 leading-relaxed">{stage.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 text-sm text-slate-300 shadow-xl shadow-emerald-500/10">
          <h2 className="text-2xl font-semibold text-emerald-100">
            Diagrama simplificado
          </h2>
          <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-left font-mono text-xs text-emerald-200 md:text-sm">
            {`Usuario → /api/workflow?key=PUBLIC_EXPERIMENT_KEY
  ├─> Validar clave
  ├─> generateStyledArticle(topic)
  │     └─> gpt-4o-mini produce HTML
  ├─> generateImage(topic)
  │     └─> gpt-image-1 devuelve URL
  ├─> publishToWordPress(html, imageUrl)
  │     ├─> Subir imagen destacada
  │     └─> Crear post con contenido IA
  └─> Responder a la UI con enlaces y mensaje`}
          </pre>
          <p>
            Puedes extender este flujo añadiendo pasos de moderación, chequeo
            SEO o analítica de engagement antes de publicar.
          </p>
        </section>
      </div>
    </main>
  );
}
