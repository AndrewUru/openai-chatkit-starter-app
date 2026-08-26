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

export function findIdeaTerritory(id: string): IdeaTerritory | undefined {
  return IDEA_TERRITORIES.find((territory) => territory.id === id);
}
