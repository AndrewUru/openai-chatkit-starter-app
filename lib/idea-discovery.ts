export type IdeaTerritory = {
  id: string;
  number: string;
  title: string;
  signal: string;
  instruction: string;
};

export type IdeaSource = {
  title: string;
  url: string;
};

export type DiscoveredIdea = {
  number: string;
  territory: string;
  title: string;
  signal: string;
  prompt: string;
  sources: IdeaSource[];
};

export const IDEA_TERRITORIES: IdeaTerritory[] = [
  {
    id: "tutorial",
    number: "01",
    title: "Manos al código",
    signal: "Resuelve un problema concreto paso a paso",
    instruction:
      "Propón un tutorial práctico relacionado con WordPress, Elementor, Astro, Next.js, APIs o automatizaciones. Parte de una necesidad concreta de un profesional o pequeño negocio. Define qué se construirá, los requisitos y cómo comprobar que funciona. Prioriza ejemplos aplicables al trabajo de ElSaltoWeb y documentación oficial.",
  },
  {
    id: "opinion",
    number: "02",
    title: "Criterio propio",
    signal: "Pon una decisión tecnológica sobre la mesa",
    instruction:
      "Encuentra una decisión que genere dudas al desarrollar webs y herramientas para clientes: WordPress o desarrollo a medida, plugins o código, no-code o programación, IA o procesos convencionales. Plantea una opinión argumentada considerando presupuesto, mantenimiento, autonomía del cliente y complejidad. Evita posiciones absolutas y no atribuyas al autor experiencias que no estén documentadas.",
  },
  {
    id: "trend",
    number: "03",
    title: "Del cambio al uso",
    signal: "Explica qué merece la pena aplicar",
    instruction:
      "Busca una novedad verificable en desarrollo web, inteligencia artificial, comercio electrónico o automatización. Explica qué problema puede resolver para un freelance, una agencia pequeña o una pyme, qué limitaciones tiene y cuándo merece la pena probarla. Prioriza cambios con aplicaciones concretas sobre anuncios llamativos.",
  },
  {
  id: "case-study",
  number: "04",
  title: "Desde mi GitHub",
  signal: "Explora un repositorio y descubre cómo está construido",
  instruction:
    "Selecciona un repositorio público de https://github.com/AndrewUru y propón un caso de estudio basado en su código, README y estructura. Explica qué permite hacer el proyecto, qué tecnologías utiliza y qué aprendizajes prácticos pueden extraerse de su implementación. Centra el artículo en una funcionalidad, integración o decisión técnica concreta e incluye enlaces al repositorio y a los archivos relevantes. Distingue las funcionalidades implementadas de las propuestas o pendientes. Si deriva de una plantilla o proyecto externo, reconoce su origen y no atribuyas todo el desarrollo al autor. No inventes motivaciones, métricas, resultados ni usos en producción. Si no puedes acceder al contenido del repositorio, indícalo y solicita el material necesario.",
},
  {
    id: "discovery",
    number: "05",
    title: "En el radar",
    signal: "Encuentra una herramienta con una utilidad clara",
    instruction:
      "Descubre una herramienta, repositorio de código abierto, API o recurso útil para crear webs, integrar IA, gestionar contenido o automatizar tareas de pequeños negocios. Explica qué permite hacer, en qué proyecto encajaría y qué habría que comprobar antes de adoptarlo: licencia, costes, mantenimiento y dependencia del proveedor. Evita listas genéricas de herramientas.",
  },
  {
    id: "experiment",
    number: "06",
    title: "Laboratorio web",
    signal: "Construye una prueba y comprueba sus límites",
    instruction:
      "Propón un experimento acotado relacionado con los intereses del autor: widgets para Elementor, interfaces interactivas, chatbots embebibles, QR creativos, herramientas de gestión o automatizaciones. Define una pregunta, un prototipo mínimo y criterios observables para evaluar el resultado. Preséntalo como una prueba pendiente, sin dar por hecho que funcionará ni atribuir resultados al autor.",
  },
];

// Temas ligados a los proyectos y ámbitos de trabajo de ElSaltoWeb.
// Cada selección aporta un contexto concreto al generador de ideas.
export const IDEA_BEATS = [
  "WordPress y Elementor: widgets HTML, código personalizado y mantenimiento",
  "Astro para blogs, páginas de servicios y webs orientadas al contenido",
  "Next.js para aplicaciones web, paneles privados y herramientas de negocio",
  "WordPress headless con Astro o Next.js: integración, ventajas y complejidad",
  "WooCommerce: catálogos grandes, migraciones e integración mediante APIs",
  "chatbots con IA embebidos en WordPress y otras páginas web",
  "RAG y asistentes que responden a partir de documentos de un negocio",
  "interfaces de voz y asistentes conversacionales para sitios web",
  "automatización de tareas con APIs, webhooks, Google Sheets y herramientas no-code",
  "plataformas multiempresa: almacenes, clientes, agencias y gestión de transportes",
  "inventario y control de herramientas mediante aplicaciones web y móviles",
  "Airtable frente a una aplicación a medida para gestionar un pequeño negocio",
  "autenticación, permisos y aislamiento de datos en aplicaciones multiusuario",
  "Supabase, PostgreSQL y MySQL aplicados a proyectos web",
  "despliegues en Vercel y Netlify y gestión de hosting WordPress",
  "errores de producción: builds, dependencias, variables de entorno y APIs",
  "rendimiento, accesibilidad y SEO técnico en webs de pequeños negocios",
  "diseño de interfaces con Tailwind y componentes reutilizables",
  "animaciones con GSAP, ScrollTrigger y WebGL con un propósito en la interfaz",
  "herramientas y editores visuales integrados mediante scripts o widgets",
  "landing pages, formularios y conexiones con plataformas de email marketing",
  "flujos de contenido para redes sociales: vídeo, edición y reutilización",
  "gestión y almacenamiento de archivos multimedia para trabajar con clientes",
  "IA aplicada al trabajo de un desarrollador freelance: pruebas y revisión de código",
  "proyectos de código abierto que se pueden adaptar a necesidades de clientes",
  "aprendizaje autodidacta mediante proyectos con HTML, CSS, JavaScript y frameworks",
  "presupuestos, alcance y mantenimiento de proyectos web para pymes",
  "pasar de un prototipo a un producto: validación, costes y decisiones técnicas",
] as const;

export function pickIdeaBeat(): string {
  return IDEA_BEATS[Math.floor(Math.random() * IDEA_BEATS.length)];
}

export function findIdeaTerritory(
  id: string
): IdeaTerritory | undefined {
  return IDEA_TERRITORIES.find((territory) => territory.id === id);
}