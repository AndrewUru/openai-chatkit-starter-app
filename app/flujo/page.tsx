import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Método Codex | Laboratorio Codex",
  description:
    "El recorrido desde una necesidad hasta una aplicación implementada, probada y revisada con Codex.",
};

const stages = [
  {
    number: "01",
    title: "Define el resultado",
    description:
      "Empieza por la persona usuaria, el problema y el comportamiento que debe poder observar. Una tecnología o una lista de pantallas todavía no son un objetivo.",
    deliverable: "Problema, usuario y criterio de éxito.",
  },
  {
    number: "02",
    title: "Delimita la primera versión",
    description:
      "Reduce la idea a un recorrido completo que aporte valor. Declara qué incluye esta fase y qué quedará para después.",
    deliverable: "Flujo principal, alcance y exclusiones.",
  },
  {
    number: "03",
    title: "Prepara el contexto",
    description:
      "Da a Codex acceso al proyecto relevante y explica sus convenciones, restricciones, comandos y criterios de aceptación. Las dudas deben aparecer antes de editar.",
    deliverable: "Brief técnico e instrucciones del repositorio.",
  },
  {
    number: "04",
    title: "Explora y acuerda un plan",
    description:
      "Pide a Codex que localice los puntos de cambio, explique dependencias y proponga fases pequeñas. Revisa el enfoque antes de una modificación amplia.",
    deliverable: "Plan revisable con riesgos y decisiones.",
  },
  {
    number: "05",
    title: "Implementa y verifica",
    description:
      "Cada fase debe producir comportamiento ejecutable y evidencia: pruebas, comprobación de tipos, lint, recorrido de interfaz o inspección del resultado.",
    deliverable: "Cambios funcionales y evidencia de validación.",
  },
  {
    number: "06",
    title: "Revisa y entrega",
    description:
      "La persona responsable revisa el comportamiento, el diff y los riesgos pendientes. Solo después decide integrar, desplegar o abrir la siguiente fase.",
    deliverable: "Decisión humana y siguiente paso concreto.",
  },
];

export default function FlowPage() {
  return (
    <main className="min-h-screen bg-[#11110f] text-[#f4f0e6]">
      <header className="border-b border-white/20">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7ff52]">
            Método Codex
          </p>
          <h1 className="mt-8 max-w-5xl font-serif text-6xl leading-[0.9] tracking-[-0.055em] sm:text-8xl">
            De una necesidad a una app que puedas comprobar.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-white/60">
            Codex puede explorar, proponer, implementar y verificar. El trabajo
            mejora cuando cada fase tiene contexto suficiente, una salida
            concreta y una decisión humana al final.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-full bg-[#d7ff52] px-6 py-3 text-sm font-bold text-[#11110f]"
            >
              Probar la experiencia ←
            </Link>
            <Link
              href="/docs"
              className="rounded-full border border-white/40 px-6 py-3 text-sm font-bold"
            >
              Abrir la guía →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] px-5 py-24 sm:px-8 lg:px-14">
        <section aria-labelledby="method-title">
          <h2 id="method-title" className="sr-only">
            Fases del método
          </h2>
          <div className="grid border-l border-t border-white/25 lg:grid-cols-2">
            {stages.map((stage) => (
              <article
                key={stage.number}
                className="border-b border-r border-white/25 p-7 sm:p-9"
              >
                <div className="flex items-start justify-between gap-6">
                  <p className="font-mono text-sm text-[#d7ff52]">
                    {stage.number}
                  </p>
                  <p className="text-right text-xs uppercase tracking-[0.14em] text-white/35">
                    Salida verificable
                  </p>
                </div>
                <h3 className="mt-12 font-serif text-4xl tracking-[-0.04em] sm:text-5xl">
                  {stage.title}
                </h3>
                <p className="mt-5 max-w-xl leading-relaxed text-white/55">
                  {stage.description}
                </p>
                <p className="mt-8 border-l-2 border-[#ff5c35] pl-4 text-sm font-semibold text-white/80">
                  {stage.deliverable}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-24 bg-[#4468ff] p-7 sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
            Secuencia resumida
          </p>
          <p className="mt-8 overflow-x-auto whitespace-nowrap font-mono text-sm leading-8 sm:text-base">
            Necesidad → Alcance → Contexto → Plan → Código → Pruebas → Revisión
            → Entrega
          </p>
        </section>

        <section className="mt-24 grid gap-10 border-t border-white/25 pt-12 lg:grid-cols-[0.8fr_1.2fr]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7ff52]">
            Una regla útil
          </p>
          <div>
            <h2 className="font-serif text-5xl leading-[0.95] tracking-[-0.045em]">
              Si no puedes describir cómo comprobarlo, todavía no está listo
              para delegarlo.
            </h2>
            <p className="mt-7 max-w-2xl leading-relaxed text-white/55">
              La verificación no es el último paso. Define el tamaño de cada
              encargo, orienta las decisiones de implementación y permite saber
              cuándo detenerse para revisar.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
