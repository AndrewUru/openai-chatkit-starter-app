import type { CoverAsset, UnsplashCover } from "@/lib/creative-assets";

export const runtime = "nodejs";
export const maxDuration = 180;

type WorkflowInput = {
  input_as_text: string;
  cover_prompt?: string;
  action?: "create" | "cover";
  cover_source?: "generated" | "unsplash";
};
export async function POST(req: Request) {
  try {
    const publicKey = process.env.PUBLIC_EXPERIMENT_KEY;
    if (!publicKey) throw new Error("Missing PUBLIC_EXPERIMENT_KEY.");
    const url = new URL(req.url);
    const providedKey = url.searchParams.get("key");
    if (providedKey !== publicKey) {
      return new Response("Acceso no autorizado", { status: 403 });
    }
    const body: WorkflowInput = await req.json();
    const result = await runWorkflow(body);
    return Response.json({
      success: true,
      message:
        body.action === "cover"
          ? "Nueva portada preparada para revisar."
          : "Tu pieza está lista. Revísala antes de publicarla.",
      ...result,
    });
  } catch (error: unknown) {
    console.error("Error en workflow:", error);
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "string"
        ? error
        : "Internal server error";
    return new Response(message, {
      status: 500,
    });
  }
}

async function runWorkflow(workflow: WorkflowInput) {
  const topic = workflow.input_as_text?.trim();
  if (!topic) throw new Error("The request body must include input_as_text.");
  const requestedCoverPrompt = workflow.cover_prompt?.trim() || topic;

  if (workflow.action === "cover") {
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    const cover =
      workflow.cover_source === "unsplash"
        ? await searchUnsplashCover(requestedCoverPrompt)
        : await generateAiCover(
            requestedCoverPrompt,
            requireOpenAiKey(openaiApiKey)
          );

    if (!cover || cover.source === "none") {
      throw new Error(
        workflow.cover_source === "unsplash"
          ? "Unsplash no está configurado o no encontró una imagen adecuada."
          : "No se pudo generar una nueva portada."
      );
    }

    return { cover };
  }

  const openaiApiKey = requireOpenAiKey(process.env.OPENAI_API_KEY?.trim());
  const editorialPackage = await generateEditorialPackage(
    topic,
    requestedCoverPrompt,
    openaiApiKey
  );
  const cover = await generateCoverWithFallback(
    editorialPackage.coverPrompt,
    openaiApiKey
  );
  const article = `${IA_GENERATED_INLINE_STYLES}
<article class="ia-generated">
${editorialPackage.articleHtml.trim()}
</article>`;
  return { article, cover, coverPrompt: editorialPackage.coverPrompt };
}

function requireOpenAiKey(apiKey?: string): string {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return apiKey;
}
type EditorialPackage = {
  articleHtml: string;
  coverPrompt: string;
};

const EDITORIAL_PACKAGE_PROMPT = `
Crea una pieza editorial técnica y cultural en español sobre desarrollo web e inteligencia artificial, junto con su dirección visual, a partir del briefing proporcionado.

Principio central:
- La "chispa aportada por la persona" es el corazón concreto de la historia. No puede aparecer como chiste, ejemplo lateral, mención forzada o simple palabra clave.
- Interpreta esa chispa como un problema, necesidad o comportamiento humano que podría abordarse mediante una experiencia web con IA. No cambies ni trivialices su significado.
- El desarrollo web y la inteligencia artificial deben ser estructurales en la propuesta: concreta la interfaz, el flujo, los datos, la automatización o la arquitectura implicada. No los añadas como una mención decorativa.
- Artículo e imagen deben compartir el mismo sujeto, objeto central, conflicto emocional y mundo narrativo.

Artículo:
- Escribe entre 700 y 1.000 palabras con mirada humana, técnica, curiosa y crítica; evita el tono genérico de marketing y el tecnosolucionismo.
- Abre con una escena concreta construida alrededor de la aportación humana.
- Convierte esa escena en un caso de producto web: explica quién lo usaría, qué problema resuelve, cómo sería la interacción y qué función específica desempeña la IA.
- Incluye decisiones de desarrollo plausibles —interfaz, frontend, backend, APIs, datos, accesibilidad, privacidad, evaluación o despliegue— solo cuando ayuden a comprender el caso.
- Distingue con claridad entre capacidades disponibles hoy y posibilidades especulativas. No inventes herramientas, métricas ni resultados.
- No inventes que la aportación sucede en un videojuego, metaverso o simulador salvo que el briefing lo diga.
- Termina con una pregunta abierta para la comunidad de diseño y desarrollo web.
- Devuelve HTML semántico: un solo <h1>, <section>, <h2>, <p> y, cuando ayude, <ul><li>.
- No incluyas <html>, <head>, <body>, <style>, Markdown ni bloques de código.

Dirección visual:
- Describe una sola escena editorial horizontal, concreta y fotografiable que represente el núcleo del artículo.
- Incluye explícitamente la persona, el objeto o deseo central, un entorno real de creación o uso web, el gesto y la tensión emocional.
- La conexión con el artículo debe entenderse sin depender de un pie de foto.
- Evita clichés de IA: no pidas texto legible, logotipos, marcas de agua, interfaces flotantes, cerebros luminosos ni robots humanoides.
`.trim();
// Mantener sincronizado con las reglas en app/globals.css para vista previa local.
const IA_GENERATED_INLINE_STYLES = `
<style>
.ia-cover {
  max-width: min(900px, 100%);
  margin: clamp(7.25rem, 8vw, 8rem) auto 2.5rem;
}
.ia-cover img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: 1.5rem;
}
.ia-cover figcaption {
  margin-top: 0.65rem;
  color: #64748b;
  font: 0.8rem/1.5 Arial, sans-serif;
}
.ia-cover a {
  color: inherit;
}
.ia-generated {
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  max-width: min(780px, 100%);
  margin: clamp(2rem, 4vw, 3.5rem) auto;
  padding: clamp(2rem, 3vw, 3rem);
  background: linear-gradient(150deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.1)), #ffffff;
  border-radius: 1.75rem;
  border: 1px solid rgba(37, 99, 235, 0.22);
  box-shadow: 0 28px 55px rgba(15, 23, 42, 0.15);
  color: #0f172a;
  position: relative;
  overflow: hidden;
}
.ia-generated::before {
  content: "";
  position: absolute;
  inset: 1.25rem;
  border-radius: 1.35rem;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  pointer-events: none;
}
.ia-generated::after {
  content: "Articulo generado por IA";
  position: absolute;
  top: 1.4rem;
  right: 1.8rem;
  padding: 0.45rem 0.95rem;
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  background: rgba(14, 165, 233, 0.12);
  color: #0f172a;
  border-radius: 999px;
  font-weight: 600;
  box-shadow: inset 0 0 0 1px rgba(14, 165, 233, 0.35);
}
.ia-generated h1 {
  font-size: clamp(2.2rem, 4vw, 2.9rem);
  margin-bottom: 1.75rem;
  line-height: 1.1;
  font-weight: 700;
  color: #0f172a;
}
.ia-generated h2 {
  position: relative;
  font-size: clamp(1.5rem, 2.5vw, 1.95rem);
  margin: 2.15rem 0 1rem;
  padding-left: 1.3rem;
  color: #1d4ed8;
}
.ia-generated h2::before {
  content: "";
  position: absolute;
  left: 0;
  top: 0.75rem;
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 50%;
  background: linear-gradient(135deg, #38bdf8, #60a5fa);
  box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.18);
}
.ia-generated p {
  margin: 1rem 0;
  line-height: 1.8;
  color: #1f2937;
}
.ia-generated ul,
.ia-generated ol {
  margin: 1.2rem 0 1.6rem 0;
  padding-left: 1.4rem;
  color: #1f2937;
}
.ia-generated li {
  margin-bottom: 0.75rem;
  line-height: 1.65;
}
.ia-generated ul li::marker {
  color: #2563eb;
}
.ia-generated ol li::marker {
  font-weight: 600;
  color: #0f172a;
}
.ia-generated strong {
  color: #0f172a;
}
.ia-generated a {
  color: #0284c7;
  font-weight: 600;
  text-decoration: none;
  border-bottom: 1px solid rgba(2, 132, 199, 0.35);
}
.ia-generated a:hover {
  color: #0369a1;
  border-bottom-color: rgba(2, 132, 199, 0.6);
}
.ia-generated blockquote {
  margin: 1.8rem 0;
  padding: 1.4rem 1.8rem;
  background: rgba(191, 219, 254, 0.35);
  border-left: 5px solid #2563eb;
  border-radius: 0 1.25rem 1.25rem 0;
  font-style: italic;
  color: #1e293b;
  box-shadow: inset 0 0 0 1px rgba(148, 163, 184, 0.2);
}
.ia-generated figure {
  margin: 2.2rem auto;
  text-align: center;
}
.ia-generated figcaption {
  margin-top: 0.75rem;
  font-size: 0.9rem;
  color: #64748b;
}
.ia-generated table {
  width: 100%;
  margin: 2rem 0;
  border-collapse: collapse;
  border-radius: 1rem;
  overflow: hidden;
  box-shadow: 0 12px 25px rgba(15, 23, 42, 0.1);
}
.ia-generated table th,
.ia-generated table td {
  padding: 0.85rem 1rem;
  border: 1px solid rgba(148, 163, 184, 0.35);
  text-align: left;
  background: rgba(255, 255, 255, 0.92);
}
.ia-generated table th {
  background: rgba(59, 130, 246, 0.12);
  font-weight: 600;
  color: #1d4ed8;
}
.ia-generated hr {
  margin: 2.75rem auto;
  border: none;
  height: 1px;
  width: 75%;
  background: linear-gradient(90deg, rgba(59, 130, 246, 0.1), rgba(14, 165, 233, 0.45), rgba(59, 130, 246, 0.1));
}
.ia-generated img {
  display: block;
  max-width: 100%;
  border-radius: 1.25rem;
  margin: 2rem auto;
  box-shadow: 0 18px 35px rgba(15, 23, 42, 0.18);
}
.ia-generated section {
  margin-top: 2rem;
}
.ia-generated footer {
  margin-top: 3rem;
  text-align: right;
  font-size: 0.92rem;
  font-weight: 500;
  color: #475569;
  font-style: italic;
}
@media (max-width: 680px) {
  .ia-generated {
    margin: 1.5rem 0;
    padding: 1.6rem;
    border-radius: 1.35rem;
  }
  .ia-generated::before {
    inset: 0.9rem;
  }
  .ia-generated::after {
    position: static;
    display: inline-flex;
    margin-bottom: 1rem;
  }
  .ia-generated h1 {
    font-size: 2.1rem;
  }
  .ia-generated h2 {
    padding-left: 1rem;
  }
}
</style>
`.trim();
async function generateEditorialPackage(
  creativeBrief: string,
  visualSignals: string,
  apiKey: string
): Promise<EditorialPackage> {
  const apiBase =
    process.env.OPENAI_API_BASE?.trim()?.replace(/\/+$/, "") ||
    "https://api.openai.com";
  const response = await fetch(`${apiBase}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: EDITORIAL_PACKAGE_PROMPT,
        },
        {
          role: "user",
          content: [
            "BRIEFING EDITORIAL:",
            creativeBrief,
            "",
            "SEÑALES VISUALES SELECCIONADAS POR LA PERSONA:",
            visualSignals,
          ].join("\n"),
        },
      ],
      temperature: 0.6,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "editorial_package",
          strict: true,
          schema: {
            type: "object",
            properties: {
              article_html: { type: "string" },
              cover_prompt: { type: "string" },
            },
            required: ["article_html", "cover_prompt"],
            additionalProperties: false,
          },
        },
      },
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI article generation failed: ${detail}`);
  }
  const data = (await response.json()) as {
    choices?: Array<{
      message?: { content?: string | null; refusal?: string | null };
    }>;
  };
  const message = data.choices?.[0]?.message;
  if (message?.refusal) {
    throw new Error(`OpenAI rechazó el briefing: ${message.refusal}`);
  }
  if (!message?.content) {
    throw new Error("OpenAI no devolvió la dirección editorial.");
  }

  let parsed: { article_html?: unknown; cover_prompt?: unknown };
  try {
    parsed = JSON.parse(message.content) as typeof parsed;
  } catch {
    throw new Error("OpenAI devolvió una dirección editorial no válida.");
  }

  const articleHtml =
    typeof parsed.article_html === "string" ? parsed.article_html.trim() : "";
  const coverPrompt =
    typeof parsed.cover_prompt === "string" ? parsed.cover_prompt.trim() : "";
  if (!articleHtml || !/<h1[\s>]/i.test(articleHtml)) {
    throw new Error("La dirección editorial no incluyó un artículo HTML válido.");
  }
  if (coverPrompt.length < 80) {
    throw new Error("La dirección editorial no incluyó una escena visual suficiente.");
  }

  return { articleHtml, coverPrompt };
}
// Generar una portada a partir de la misma dirección editorial del artículo.
async function generateAiCover(
  editorialDirection: string,
  apiKey: string
): Promise<CoverAsset> {
  const prompt = `
Crea una portada editorial horizontal que represente fielmente esta escena:
${editorialDirection}

Dirección de arte:
- Conserva el sujeto, el objeto central, el entorno y la emoción descritos. No los sustituyas por metáforas tecnológicas genéricas.
- La escena debe conectar tecnología e inteligencia artificial con la vida cotidiana de forma visible pero natural.
- Estética de revista cultural independiente: composición audaz, textura táctil, luz natural y un detalle inesperado.
- Paleta con negro tinta, marfil cálido, azul eléctrico, coral y verde ácido.
- Reserva espacio visual tranquilo para que la imagen respire.
- Sin texto, letras, logotipos, marcas de agua, interfaces flotantes ni clichés de robots humanoides.
`.trim();
  const apiBase =
    process.env.OPENAI_API_BASE?.trim()?.replace(/\/+$/, "") ||
    "https://api.openai.com";
  const response = await fetch(`${apiBase}/v1/images/generations`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: process.env.OPENAI_IMAGE_MODEL?.trim() || "gpt-image-2",
      prompt,
      size: "1536x1024",
      quality: "medium",
      output_format: "webp",
      output_compression: 82,
    }),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    console.error("OpenAI image generation failed", {
      status: response.status,
      requestId: response.headers.get("x-request-id"),
      detail,
    });
    throw new Error("OpenAI no pudo generar la portada.");
  }
  const data = (await response.json()) as {
    data?: Array<{ b64_json?: string }>;
  };
  const imageData = data.data?.[0]?.b64_json;
  if (!imageData) {
    throw new Error("OpenAI no devolvió datos para la portada.");
  }

  return {
    source: "generated",
    alt: buildCoverAlt(editorialDirection),
    mimeType: "image/webp",
    data: imageData,
    width: 1536,
    height: 1024,
  };
}
// 📤 Publicar en WordPress con featured image
async function generateCoverWithFallback(
  topic: string,
  apiKey: string
): Promise<CoverAsset> {
  try {
    return await generateAiCover(topic, apiKey);
  } catch (error) {
    console.warn("La portada generada falló; probando Unsplash.", error);
  }

  const unsplashCover = await searchUnsplashCover(topic);
  if (unsplashCover) return unsplashCover;

  return {
    source: "none",
    alt: buildCoverAlt(topic),
    reason:
      "No se pudo generar la portada y Unsplash no está configurado o no devolvió resultados.",
  };
}

async function searchUnsplashCover(
  topic: string
): Promise<UnsplashCover | null> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) return null;

  const searchUrl = new URL("https://api.unsplash.com/search/photos");
  searchUrl.searchParams.set(
    "query",
    `human technology future ${topic.slice(0, 180)}`
  );
  searchUrl.searchParams.set("orientation", "landscape");
  searchUrl.searchParams.set("per_page", "10");

  const response = await fetch(searchUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    console.error("Unsplash search failed", {
      status: response.status,
      detail: await response.text().catch(() => ""),
    });
    return null;
  }

  const payload = (await response.json()) as {
    results?: Array<{
      alt_description?: string | null;
      description?: string | null;
      urls: { raw: string };
      links: { html: string; download_location: string };
      user: { name: string; links: { html: string } };
    }>;
  };
  const candidates = payload.results?.slice(0, 5) ?? [];
  if (candidates.length === 0) return null;

  const photo = candidates[Math.floor(Math.random() * candidates.length)];
  const imageUrl = new URL(photo.urls.raw);
  imageUrl.searchParams.set("w", "1536");
  imageUrl.searchParams.set("h", "1024");
  imageUrl.searchParams.set("fit", "crop");
  imageUrl.searchParams.set("auto", "format");
  imageUrl.searchParams.set("q", "85");

  return {
    source: "unsplash",
    alt:
      photo.alt_description?.trim() ||
      photo.description?.trim() ||
      buildCoverAlt(topic),
    url: imageUrl.toString(),
    width: 1536,
    height: 1024,
    downloadLocation: photo.links.download_location,
    attribution: {
      photographerName: photo.user.name,
      photographerUrl: withUnsplashUtm(photo.user.links.html),
      unsplashUrl: withUnsplashUtm(photo.links.html),
    },
  };
}

function withUnsplashUtm(value: string): string {
  const url = new URL(value);
  url.searchParams.set("utm_source", "laboratorio_de_futuros");
  url.searchParams.set("utm_medium", "referral");
  return url.toString();
}

function buildCoverAlt(topic: string): string {
  const cleanTopic = topic.replace(/\s+/g, " ").trim().slice(0, 180);
  return `Portada editorial sobre ${cleanTopic}`;
}
