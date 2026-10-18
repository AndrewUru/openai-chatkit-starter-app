import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

export const runtime = "nodejs";
export const maxDuration = 60;

type RewriteInput = {
  blocks_html?: string;
  instruction?: string;
  article_context?: string;
};

const MAX_BLOCKS_LENGTH = 12_000;
const MAX_CONTEXT_LENGTH = 8_000;
const MAX_INSTRUCTION_LENGTH = 400;

const REWRITE_PROMPT = `
Eres editor de una publicación digital en español. Recibes uno o varios bloques HTML de un artículo y una instrucción de la persona que lo revisa. Reescribe solo esos bloques siguiendo la instrucción.

REGLAS

- Devuelve únicamente el HTML de reemplazo de los bloques: sin explicaciones, sin Markdown, sin bloques de código, sin comentarios.
- Conserva el tipo de bloque (<p>, <li>, <h2>, <blockquote>…) salvo que la instrucción pida otra estructura. Si recibes elementos <li>, devuelve elementos <li>.
- Usa solo estas etiquetas: h1, h2, h3, p, ul, ol, li, strong, em, blockquote, a.
- Conserva los enlaces <a> existentes con su href exacto, salvo que la instrucción pida quitarlos. No añadas enlaces nuevos.
- Respeta los hechos del artículo. No inventes cifras, fechas, citas, nombres, estudios ni experiencias personales. Si la instrucción pide un ejemplo, usa un ejemplo ilustrativo genérico y preséntalo como tal.
- Mantén la voz, la variante del español y el tono del resto del artículo, salvo que la instrucción pida cambiarlos.
- El texto debe encajar con lo que va antes y después: no repitas ideas de otras partes del artículo.
`.trim();

export async function POST(request: Request) {
  const publicKey = process.env.PUBLIC_EXPERIMENT_KEY;
  if (!publicKey) {
    return new Response("Missing PUBLIC_EXPERIMENT_KEY.", { status: 500 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("key") !== publicKey) {
    return new Response("Acceso no autorizado", { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as RewriteInput;
  const blocksHtml = body.blocks_html?.trim();
  const instruction = body.instruction?.trim();
  if (!blocksHtml || !instruction) {
    return new Response("La solicitud debe incluir blocks_html e instruction.", {
      status: 400,
    });
  }
  if (blocksHtml.length > MAX_BLOCKS_LENGTH) {
    return new Response(
      "La selección es demasiado larga. Selecciona menos párrafos.",
      { status: 413 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return new Response("Missing OPENAI_API_KEY.", { status: 500 });
  }

  const apiBase =
    process.env.OPENAI_API_BASE?.trim()?.replace(/\/+$/, "") ||
    "https://api.openai.com";
  const textModel =
    process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.6-luna";
  const openai = createOpenAI({
    apiKey,
    baseURL: `${apiBase}/v1`,
  });

  const result = streamText({
    model: openai.responses(textModel),
    abortSignal: request.signal,
    system: REWRITE_PROMPT,
    prompt: [
      "ARTÍCULO COMPLETO (solo como contexto, no lo reescribas):",
      (body.article_context ?? "").slice(0, MAX_CONTEXT_LENGTH),
      "",
      "BLOQUES A REESCRIBIR:",
      blocksHtml,
      "",
      "INSTRUCCIÓN:",
      instruction.slice(0, MAX_INSTRUCTION_LENGTH),
    ].join("\n"),
    onError({ error }) {
      console.error("Error en la reescritura:", error);
    },
  });

  return result.toTextStreamResponse({
    headers: {
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
