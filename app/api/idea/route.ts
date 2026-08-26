import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, stepCountIs } from "ai";
import { z } from "zod";
import { findIdeaTerritory } from "@/lib/idea-discovery";

export const runtime = "nodejs";
export const maxDuration = 90;

const requestSchema = z.object({
  territory: z.string().min(1).max(40),
});

const ideaSchema = z.object({
  title: z
    .string()
    .min(12)
    .max(120)
    .describe(
      "Titular editorial completo, específico y atractivo, sin clickbait ni una preposición suelta al final."
    ),
  signal: z
    .string()
    .min(12)
    .max(100)
    .describe("Una frase breve que explique por qué esta idea importa ahora."),
  prompt: z
    .string()
    .min(60)
    .max(500)
    .describe("Briefing autónomo para escribir el artículo investigado."),
});

type NormalizedSource = {
  title?: string;
  url: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractToolSources(toolResults: unknown[]): NormalizedSource[] {
  return toolResults.flatMap((toolResult) => {
    if (!isRecord(toolResult) || !isRecord(toolResult.output)) return [];
    const rawSources = toolResult.output.sources;
    if (!Array.isArray(rawSources)) return [];

    return rawSources.flatMap((source) => {
      if (!isRecord(source) || typeof source.url !== "string") return [];
      return [
        {
          url: source.url,
          title: typeof source.title === "string" ? source.title : undefined,
        },
      ];
    });
  });
}

export async function POST(request: Request) {
  const publicKey = process.env.PUBLIC_EXPERIMENT_KEY;
  if (!publicKey) {
    return new Response("Missing PUBLIC_EXPERIMENT_KEY.", { status: 500 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("key") !== publicKey) {
    return new Response("Acceso no autorizado", { status: 403 });
  }

  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return new Response("El territorio editorial no es válido.", { status: 400 });
  }

  const territory = findIdeaTerritory(parsed.data.territory);
  if (!territory) {
    return new Response("El territorio editorial no existe.", { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY.", { status: 500 });
  }

  const apiBase =
    process.env.OPENAI_API_BASE?.trim()?.replace(/\/+$/, "") ||
    "https://api.openai.com";
  const textModel = process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.6-luna";
  const openai = createOpenAI({ apiKey, baseURL: `${apiBase}/v1` });
  const today = new Intl.DateTimeFormat("es-ES", { dateStyle: "long" }).format(
    new Date()
  );

  try {
    const result = await generateText({
      model: openai.responses(textModel),
      tools: {
        web_search: openai.tools.webSearch({
          externalWebAccess: true,
          searchContextSize: "medium",
          userLocation: {
            type: "approximate",
            country: "ES",
            timezone: "Europe/Madrid",
          },
        }),
      },
      prepareStep: ({ stepNumber }) =>
        stepNumber === 0
          ? {
              toolChoice: { type: "tool", toolName: "web_search" },
              activeTools: ["web_search"],
            }
          : { toolChoice: "none", activeTools: [] },
      stopWhen: stepCountIs(3),
      output: Output.object({ schema: ideaSchema }),
      system: `
Eres un radar editorial para una publicación digital en español sobre tecnología, IA, cultura digital, creatividad y producto.
Primero investiga la web. Después propone una sola idea de artículo basada en señales reales y recientes.
No inventes hechos, cifras, lanzamientos ni fuentes. Evita temas genéricos, titulares de marketing y el tópico de que la IA lo cambiará todo.
La idea debe ser específica, publicable y suficientemente distinta en cada ejecución.
Escribe en español natural y peninsular.
      `.trim(),
      prompt: [
        `Fecha de la búsqueda: ${today}.`,
        `Territorio: ${territory.title}.`,
        `Dirección: ${territory.instruction}`,
        `Semilla de novedad: ${crypto.randomUUID()}.`,
        "Busca información actual y devuelve un ángulo que pueda sostener un artículo de 700 a 1.000 palabras.",
        "El briefing debe mencionar qué conviene investigar y qué pregunta central debe responder, sin incluir URLs ni fingir experiencias personales.",
      ].join("\n"),
    });

    const allSources: NormalizedSource[] = [
      ...result.sources
        .filter((source) => source.sourceType === "url")
        .map((source) => ({ url: source.url, title: source.title })),
      ...extractToolSources(result.toolResults),
    ];
    const sources = allSources
      .filter(
        (source, index, all) =>
          all.findIndex((candidate) => candidate.url === source.url) === index
      )
      .slice(0, 4)
      .map((source) => ({
        title: source.title?.trim() || new URL(source.url).hostname,
        url: source.url,
      }));

    return Response.json({
      number: territory.number,
      territory: territory.title,
      ...result.output,
      sources,
    });
  } catch (error) {
    console.error("No se pudo descubrir una idea:", error);
    return new Response("La IA no pudo investigar una idea nueva. Prueba otro giro.", {
      status: 502,
    });
  }
}
