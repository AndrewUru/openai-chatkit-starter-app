import { createOpenAI } from "@ai-sdk/openai";
import { Output, streamText } from "ai";
import { EDITORIAL_PUBLICATION_PROMPT } from "@/lib/editorial-generation";
import {
  editorialStreamSchema,
  type EditorialStreamEvent,
} from "@/lib/editorial-stream";

export const runtime = "nodejs";
export const maxDuration = 180;

type ArticleStreamInput = {
  input_as_text?: string;
  cover_prompt?: string;
};

export async function POST(request: Request) {
  const publicKey = process.env.PUBLIC_EXPERIMENT_KEY;
  if (!publicKey) {
    return new Response("Missing PUBLIC_EXPERIMENT_KEY.", { status: 500 });
  }

  const url = new URL(request.url);
  if (url.searchParams.get("key") !== publicKey) {
    return new Response("Acceso no autorizado", { status: 403 });
  }

  const body = (await request.json()) as ArticleStreamInput;
  const creativeBrief = body.input_as_text?.trim();
  const visualSignals = body.cover_prompt?.trim() || creativeBrief;
  if (!creativeBrief) {
    return new Response("La solicitud debe incluir input_as_text.", {
      status: 400,
    });
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

  let streamError: Error | null = null;
  const result = streamText({
    model: openai.chat(textModel),
    system: EDITORIAL_PUBLICATION_PROMPT,
    prompt: [
      "BRIEFING EDITORIAL:",
      creativeBrief,
      "",
      "SEÑALES VISUALES SELECCIONADAS POR LA PERSONA:",
      visualSignals,
    ].join("\n"),
    output: Output.object({ schema: editorialStreamSchema }),
    onError({ error }) {
      streamError =
        error instanceof Error ? error : new Error("La generación se interrumpió.");
      console.error("Error en el streaming editorial:", error);
    },
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: EditorialStreamEvent) => {
        controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      try {
        for await (const partial of result.partialOutputStream) {
          send({ type: "partial", data: partial });
        }

        if (streamError) throw streamError;

        const complete = editorialStreamSchema.parse(await result.output);
        send({ type: "done", data: complete });
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "No se pudo completar la publicación.";
        send({ type: "error", message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
