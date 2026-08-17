import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Guía para crear apps con Codex | Laboratorio Codex",
  description:
    "Una guía práctica para convertir una necesidad en encargos claros, cambios verificables y una aplicación construida con Codex.",
};

const principles = [
  {
    number: "01",
    title: "Resultado antes que código",
    description:
      "Define quién utilizará la app, qué podrá hacer y qué evidencia demostrará que la primera versión funciona.",
  },
  {
    number: "02",
    title: "Contexto antes que instrucciones",
    description:
      "Comparte la estructura del proyecto, sus convenciones, restricciones y comandos de validación antes de pedir cambios.",
  },
  {
    number: "03",
    title: "Cambios pequeños y comprobables",
    description:
      "Divide el trabajo por recorridos completos y pide que cada fase termine con pruebas o una verificación visible.",
  },
  {
    number: "04",
    title: "La aceptación sigue siendo humana",
    description:
      "Revisa decisiones de producto, permisos, seguridad, datos y despliegue antes de aceptar o publicar el resultado.",
  },
];

const phases = [
  {
    title: "Define la aplicación",
    items: [
      "Problema y usuario concretos.",
      "Flujo principal de principio a fin.",
      "Alcance mínimo útil y exclusiones.",
      "Criterios de aceptación observables.",
    ],
  },
  {
    title: "Prepara el contexto",
    items: [
      "Repositorio, stack y estado actual.",
      "Convenciones descritas en AGENTS.md.",
      "Restricciones de diseño, seguridad y datos.",
      "Comandos para ejecutar, probar y validar.",
    ],
  },
  {
    title: "Trabaja con Codex",
    items: [
      "Pide primero explorar y explicar lo relevante.",
      "Acordad un plan antes de editar muchas piezas.",
      "Implementa una fase completa cada vez.",
      "Solicita evidencia y riesgos pendientes al terminar.",
    ],
  },
];

const questions = [
  {
    question: "¿La aplicación debe incluir inteligencia artificial?",
    answer:
      "No. Codex puede ayudarte a construir cualquier tipo de software. Solo añade IA al producto si resuelve una necesidad concreta y puedes definir cómo validarla.",
  },
  {
    question: "¿Qué hago si todavía no existe un repositorio?",
    answer:
      "Empieza por el usuario, el flujo principal, el entorno objetivo y los criterios de aceptación. Después pide una propuesta de stack y un esqueleto mínimo que puedas ejecutar.",
  },
  {
    question: "¿Cuándo debo dividir el trabajo?",
    answer:
      "Cuando una tarea mezcla varios resultados, afecta muchas capas o no puede comprobarse con una señal clara. Cada encargo debería producir un cambio revisable.",
  },
  {
    question: "¿Qué debería revisar personalmente?",
    answer:
      "El comportamiento del producto, el diff, los datos sensibles, los permisos, las pruebas relevantes y cualquier acción externa o difícil de revertir.",
  },
];

export default function DocumentationPage() {
  return (
    <main className="min-h-screen bg-[#f4f0e6] text-[#11110f]">
      <header className="border-b border-black bg-[#d7ff52]">
        <div className="mx-auto max-w-[1200px] px-5 py-20 sm:px-8 lg:px-14 lg:py-28">
          <p className="text-xs font-bold uppercase tracking-[0.2em]">
            Guía práctica · Laboratorio Codex
          </p>
          <h1 className="mt-8 max-w-5xl font-serif text-6xl leading-[0.9] tracking-[-0.055em] sm:text-8xl">
            Dale a Codex un resultado que pueda construir y comprobar.
          </h1>
          <p className="mt-8 max-w-2xl text-lg leading-relaxed text-black/65">
            Una buena colaboración no empieza pidiendo código. Empieza
            definiendo el problema, preparando el contexto y acordando cómo se
            verificará cada cambio.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <Link
              href="/"
              className="rounded-full bg-[#11110f] px-6 py-3 text-sm font-bold text-[#f4f0e6]"
            >
              Crear un plan con Codex ←
            </Link>
            <a
              href="https://developers.openai.com/codex"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-full border border-black px-6 py-3 text-sm font-bold"
            >
              Documentación oficial ↗
            </a>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1200px] space-y-24 px-5 py-24 sm:px-8 lg:px-14">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4468ff]">
            Cuatro principios
          </p>
          <div className="mt-8 grid border-l border-t border-black md:grid-cols-2">
            {principles.map((principle) => (
              <article
                key={principle.number}
                className="min-h-64 border-b border-r border-black p-7"
              >
                <p className="font-mono text-sm">{principle.number}</p>
                <h2 className="mt-14 font-serif text-4xl tracking-[-0.04em]">
                  {principle.title}
                </h2>
                <p className="mt-4 max-w-md leading-relaxed text-black/60">
                  {principle.description}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-[#11110f] p-7 text-[#f4f0e6] sm:p-10">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#d7ff52]">
            Un encargo útil
          </p>
          <pre className="mt-7 overflow-x-auto whitespace-pre-wrap font-mono text-sm leading-7 text-white/75">
            {`Objetivo: [qué debe poder hacer la persona usuaria]

Contexto: [repositorio, stack, estado actual y restricciones]

Alcance: [qué incluye esta fase y qué queda fuera]

Criterios de aceptación:
- [comportamiento observable 1]
- [comportamiento observable 2]
- [estado vacío, error o accesibilidad relevante]

Antes de editar: explora el proyecto, señala dudas y propón un plan.

Al terminar: ejecuta las validaciones relevantes y resume cambios, evidencia y riesgos pendientes.`}
          </pre>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#ff5c35]">
            Flujo recomendado
          </p>
          <div className="mt-8 grid gap-6 lg:grid-cols-3">
            {phases.map((phase, index) => (
              <article key={phase.title} className="border-2 border-black p-7">
                <p className="font-mono text-sm">0{index + 1}</p>
                <h2 className="mt-8 font-serif text-4xl tracking-[-0.04em]">
                  {phase.title}
                </h2>
                <ul className="mt-6 space-y-3 text-sm leading-relaxed text-black/65">
                  {phase.items.map((item) => (
                    <li key={item} className="border-t border-black/20 pt-3">
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section>
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#4468ff]">
            Preguntas frecuentes
          </p>
          <div className="mt-8 grid gap-x-10 gap-y-12 md:grid-cols-2">
            {questions.map(({ question, answer }) => (
              <article key={question} className="border-t-2 border-black pt-5">
                <h2 className="font-serif text-3xl tracking-[-0.03em]">
                  {question}
                </h2>
                <p className="mt-4 leading-relaxed text-black/60">{answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="border-t-2 border-black py-12 text-center">
          <h2 className="font-serif text-5xl tracking-[-0.045em]">
            Empieza por algo pequeño que puedas verificar.
          </h2>
          <Link
            href="/"
            className="mt-8 inline-flex border-b-2 border-black pb-1 text-sm font-bold uppercase tracking-[0.14em]"
          >
            Diseñar mi app con Codex →
          </Link>
        </section>
      </div>
    </main>
  );
}
