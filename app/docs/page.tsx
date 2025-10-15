import Link from "next/link";

export const metadata = {
  title: "Documentación de ChatKit | AgentKit demo",
  description:
    "Guía para que los editores y creadores aprovechen ChatKit dentro de la demo de AgentKit.",
};

const roadmap = [
  {
    title: "1. Preparar tu espacio",
    items: [
      "Revisa las variables `PUBLIC_EXPERIMENT_KEY`, `OPENAI_API_KEY` y credenciales de WordPress.",
      "Configura los permisos de WordPress para permitir publicaciones con HTML enriquecido.",
    ],
  },
  {
    title: "2. Generar contenido",
    items: [
      "Desde la página principal ingresa el tema del artículo.",
      "Revisa la previsualización con el diseño IA antes de publicarlo.",
    ],
  },
  {
    title: "3. Publicar y compartir",
    items: [
      "El artículo se publica automáticamente en WordPress con estilos integrados.",
      "Comparte el enlace y supervisa el rendimiento del post.",
    ],
  },
];

const faq = [
  {
    question: "¿Qué modelos usa la demo?",
    answer:
      "El flujo genera el cuerpo del artículo con `gpt-4o-mini` y utiliza `gpt-image-1` para obtener una imagen destacada inspirada en el tema indicado.",
  },
  {
    question: "¿Puedo personalizar el estilo del artículo?",
    answer:
      "Sí. Edita las reglas CSS de `.ia-generated` en `app/globals.css` y mantén sincronizada la constante `IA_GENERATED_INLINE_STYLES` en `app/api/workflow/route.ts` para que WordPress reciba los mismos estilos.",
  },
  {
    question: "¿Cómo cambio el estado por defecto de la publicación?",
    answer:
      "En `publishToWordPress` ajusta el campo `status` (por ejemplo, `draft`) si prefieres revisar los posts antes de publicarlos.",
  },
];

export default function DocumentationPage() {
  return (
    <main className="relative min-h-screen bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-emerald-500/10 via-slate-950 to-slate-950" />
      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 py-16 lg:px-12">
        <header className="rounded-3xl border border-emerald-400/30 bg-slate-900/50 p-10 text-center shadow-[0_0_80px_rgba(16,185,129,0.25)] backdrop-blur">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-200">
            Guía de Usuario
          </p>
          <h1 className="text-4xl font-semibold text-emerald-100 md:text-5xl">
            Documentación para impulsar tu contenido con ChatKit
          </h1>
          <p className="mx-auto mt-4 max-w-3xl text-base text-slate-300 md:text-lg">
            Aprende a configurar la demo, generar artículos de calidad y
            publicarlos en WordPress con un diseño profesional asistido por IA.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4 text-sm">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/70 bg-emerald-400/20 px-5 py-2 font-medium text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              ← Volver al generador
            </Link>
            <a
              href="https://platform.openai.com/docs/guides/assistant"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/70 px-5 py-2 font-medium text-slate-200 transition hover:border-slate-500 hover:text-white"
            >
              Recursos oficiales de OpenAI
              <span aria-hidden="true">↗</span>
            </a>
          </div>
        </header>

        <section className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          <article className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/50 p-8 shadow-lg shadow-emerald-500/10">
            <h2 className="text-2xl font-semibold text-emerald-100">
              Visión general
            </h2>
            <p className="text-slate-300">
              Esta demo conecta ChatKit con un flujo automatizado que genera
              artículos en cuestión de segundos. El backend valida tu clave
              pública, solicita contenido e imagen a la API de OpenAI y publica
              el resultado en tu sitio de WordPress con una tarjeta visual
              optimizada para la lectura.
            </p>
            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-sm text-slate-200">
                <h3 className="mb-3 text-base font-semibold text-emerald-100">
                  Funciones clave
                </h3>
                <ul className="space-y-2">
                  <li>• Generación de artículos SEO-ready con GPT.</li>
                  <li>• Imagen destacada desde DALL·E lista para WordPress.</li>
                  <li>• Estilos visuales consistentes con firma IA.</li>
                  <li>• Publicación inmediata o modo borrador.</li>
                </ul>
              </div>
              <div className="rounded-2xl border border-slate-700/80 bg-slate-900/70 p-6 text-sm text-slate-300">
                <h3 className="mb-3 text-base font-semibold text-slate-100">
                  Requisitos previos
                </h3>
                <ul className="space-y-2">
                  <li>
                    • Cuenta de OpenAI con acceso a los modelos mencionados.
                  </li>
                  <li>
                    • WordPress con REST API y credenciales de aplicación.
                  </li>
                  <li>• Permisos para publicar contenido HTML enriquecido.</li>
                  <li>• Entorno Node 18+ para ejecutar la demo localmente.</li>
                </ul>
              </div>
            </div>
          </article>

          <aside className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/40 p-8 shadow-lg shadow-slate-900/40">
            <h2 className="text-2xl font-semibold text-emerald-100">
              Checklist rápida
            </h2>
            <ul className="space-y-4 text-sm text-slate-300">
              <li className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <strong className="block text-emerald-200">
                  Variables de entorno
                </strong>
                <span className="text-slate-400">
                  Configura `PUBLIC_EXPERIMENT_KEY`, `OPENAI_API_KEY`,
                  `WORDPRESS_BASE_URL`, `WORDPRESS_USERNAME` y
                  `WORDPRESS_APP_PASSWORD`.
                </span>
              </li>
              <li className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <strong className="block text-emerald-200">
                  Pruebas locales
                </strong>
                <span className="text-slate-400">
                  Ejecuta la app en local para validar el flujo completo antes
                  de interactuar con producción.
                </span>
              </li>
              <li className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4">
                <strong className="block text-emerald-200">Accesos</strong>
                <span className="text-slate-400">
                  Verifica que la cuenta de WordPress tenga permisos para subir
                  medios y publicar posts.
                </span>
              </li>
            </ul>
          </aside>
        </section>

        <section className="grid gap-10 lg:grid-cols-2">
          <article className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-900/40">
            <h2 className="text-2xl font-semibold text-emerald-100">
              Flujos paso a paso
            </h2>
            <div className="space-y-6">
              {roadmap.map((phase) => (
                <div
                  key={phase.title}
                  className="rounded-2xl border border-slate-700 bg-slate-900/70 p-6"
                >
                  <h3 className="mb-4 text-lg font-semibold text-emerald-100">
                    {phase.title}
                  </h3>
                  <ul className="space-y-3 text-sm text-slate-300">
                    {phase.items.map((item) => (
                      <li key={item} className="flex items-start gap-3">
                        <span
                          aria-hidden="true"
                          className="mt-1 text-emerald-300"
                        >
                          ●
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </article>

          <article className="space-y-6 rounded-3xl border border-slate-800 bg-slate-900/60 p-8 shadow-xl shadow-slate-900/40">
            <h2 className="text-2xl font-semibold text-emerald-100">
              Consumo del endpoint
            </h2>
            <p className="text-slate-300">
              El endpoint `/api/workflow` es el núcleo del proceso. Requiere la
              clave pública para autorizar la solicitud y un cuerpo JSON con el
              texto base que la IA utilizará como contexto.
            </p>
            <pre className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/70 p-5 text-sm text-emerald-200">
              {`POST /api/workflow?key=<PUBLIC_EXPERIMENT_KEY>
Content-Type: application/json

{
  "input_as_text": "Tema del artículo a generar"
}`}
            </pre>
            <p className="text-sm text-slate-400">
              La respuesta incluye el HTML estilizado (`article`), el enlace de
              la imagen (`imageUrl`) y la URL final publicada en WordPress
              (`wordpressUrl`). Usa estos campos para construir dashboards,
              enviar recordatorios o auditar publicaciones.
            </p>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 text-sm text-slate-300">
              <h3 className="mb-3 text-base font-semibold text-emerald-100">
                Buenas prácticas
              </h3>
              <ul className="space-y-2">
                <li>
                  • Asegura que el parámetro `key` no se exponga públicamente.
                </li>
                <li>
                  • Controla la longitud de `input_as_text` para guiar al
                  modelo.
                </li>
                <li>• Valida la respuesta antes de enviarla a WordPress.</li>
              </ul>
            </div>
          </article>
        </section>

        <section className="space-y-8 rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-xl shadow-emerald-500/10">
          <h2 className="text-2xl font-semibold text-emerald-100">
            Preguntas frecuentes
          </h2>
          <div className="grid gap-6 lg:grid-cols-3">
            {faq.map(({ question, answer }) => (
              <article
                key={question}
                className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-6 text-sm text-slate-300"
              >
                <h3 className="text-base font-semibold text-emerald-100">
                  {question}
                </h3>
                <p>{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-8 text-center text-sm text-emerald-100 shadow-[0_0_60px_rgba(16,185,129,0.3)]">
          <h2 className="text-2xl font-semibold text-emerald-50">
            ¿Listo para experimentar?
          </h2>
          <p className="mx-auto max-w-3xl text-emerald-50/80">
            Ajusta los prompts, refresca la identidad visual del artículo y
            comparte tus resultados con el equipo. Esta documentación se
            mantendrá viva para incorporar nuevos flujos, analíticas y pautas de
            estilo.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-400/80 bg-emerald-400/20 px-6 py-2 font-medium text-white transition hover:border-white/70"
            >
              Volver al generador IA
            </Link>
            <a
              href="mailto:atobio459@gmail.com?subject=Feedback%20ChatKit"
              className="inline-flex items-center gap-2 rounded-full border border-emerald-100/60 bg-emerald-100/10 px-6 py-2 font-medium text-emerald-50 transition hover:border-emerald-100 hover:text-white"
            >
              Enviar feedback
            </a>
          </div>
        </section>
      </div>
    </main>
  );
}
