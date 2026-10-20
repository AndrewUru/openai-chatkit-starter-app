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
    title: "Tutorial",
    signal: "Convierte una novedad en algo útil",
    instruction:
      "Encuentra una herramienta, técnica o flujo reciente que pueda explicarse paso a paso y aplicarse de verdad.",
  },
  {
    id: "opinion",
    number: "02",
    title: "Opinión",
    signal: "Detecta un debate con tensión",
    instruction:
      "Encuentra un debate tecnológico actual que permita defender una mirada propia, matizada y poco obvia.",
  },
  {
    id: "trend",
    number: "03",
    title: "Tendencia",
    signal: "Interpreta una señal emergente",
    instruction:
      "Busca una tendencia reciente con evidencias suficientes y conviértela en una explicación clara de qué está cambiando.",
  },
  {
    id: "case-study",
    number: "04",
    title: "Caso real",
    signal: "Aprende de algo que ya ocurrió",
    instruction:
      "Localiza un lanzamiento, proyecto o experimento documentado del que puedan extraerse decisiones y aprendizajes útiles.",
  },
  {
    id: "discovery",
    number: "05",
    title: "Hallazgo",
    signal: "Encuentra algo que merezca atención",
    instruction:
      "Descubre una investigación, producto, comunidad o uso inesperado con potencial para una pieza divulgativa sorprendente.",
  },
  {
    id: "experiment",
    number: "06",
    title: "Experimento",
    signal: "Propón una prueba con resultado abierto",
    instruction:
      "Combina señales actuales para proponer un experimento editorial concreto, reproducible y con una pregunta interesante.",
  },
];

// Newsroom beats drawn at random on every spin. A random UUID does not steer a
// language model; a concrete beat does, and keeps the wheel from circling back
// to the same "AI and human creativity" piece.
export const IDEA_BEATS = [
  "videojuegos y motores de juego",
  "desarrollo web, navegadores y estándares",
  "diseño de interfaces y accesibilidad",
  "privacidad, seguridad y fraude digital",
  "hardware, dispositivos y electrónica DIY",
  "código abierto y comunidades de desarrollo",
  "música, audio y sonido digital",
  "fotografía, vídeo e imagen",
  "economía de creadores y plataformas",
  "educación y aprendizaje con tecnología",
  "ciencia, datos y visualización",
  "regulación, derechos digitales y la UE",
  "sostenibilidad y coste energético de la tecnología",
  "internet en España y Latinoamérica",
  "herramientas de productividad y automatización",
  "historia de la informática y cultura retro",
  "móvil, apps y tiendas de aplicaciones",
  "WordPress, CMS y publicación web",
] as const;

export function pickIdeaBeat(): string {
  return IDEA_BEATS[Math.floor(Math.random() * IDEA_BEATS.length)];
}

export function findIdeaTerritory(id: string): IdeaTerritory | undefined {
  return IDEA_TERRITORIES.find((territory) => territory.id === id);
}
