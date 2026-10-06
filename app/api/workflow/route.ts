import type { CoverAsset, UnsplashCover } from "@/lib/creative-assets";
import { EDITORIAL_PUBLICATION_PROMPT } from "@/lib/editorial-generation";

export const runtime = "nodejs";
export const maxDuration = 180;

type WorkflowInput = {
  input_as_text: string;
  cover_prompt?: string;
  action?: "create" | "article" | "cover" | "finalize";
  cover_source?: "auto" | "generated" | "unsplash";
  cover_variant?: number;
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
          ? "Portada preparada para revisar."
          : body.action === "finalize"
          ? "El artículo está listo. La portada se está preparando por separado."
          : body.action === "article"
          ? "El artículo está listo. La portada se está preparando por separado."
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
  const coverVariant = workflow.cover_variant ?? 0;

  if (workflow.action === "finalize") {
    if (!/<h1[\s>]/i.test(topic)) {
      throw new Error("La publicación generada no incluye un título válido.");
    }
    return {
      article: wrapGeneratedArticle(topic),
      coverPrompt: requestedCoverPrompt,
    };
  }

  if (workflow.action === "cover") {
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    const cover =
      workflow.cover_source === "unsplash"
        ? await searchUnsplashCover(requestedCoverPrompt)
        : workflow.cover_source === "auto"
        ? await generateCoverWithFallback(
            requestedCoverPrompt,
            requireOpenAiKey(openaiApiKey),
            coverVariant
          )
        : await generateAiCover(
            requestedCoverPrompt,
            requireOpenAiKey(openaiApiKey),
            coverVariant
          );

    if (
      !cover ||
      (cover.source === "none" && workflow.cover_source !== "auto")
    ) {
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
  const article = wrapGeneratedArticle(editorialPackage.articleHtml);

  if (workflow.action === "article") {
    return { article, coverPrompt: editorialPackage.coverPrompt };
  }

  const cover = await generateCoverWithFallback(
    editorialPackage.coverPrompt,
    openaiApiKey,
    coverVariant
  );
  return { article, cover, coverPrompt: editorialPackage.coverPrompt };
}

function wrapGeneratedArticle(articleHtml: string): string {
  return `${IA_GENERATED_INLINE_STYLES}
<article class="ia-generated">
${articleHtml.trim()}
</article>`;
}

function requireOpenAiKey(apiKey?: string): string {
  if (!apiKey) throw new Error("Missing OPENAI_API_KEY.");
  return apiKey;
}
type EditorialPackage = {
  articleHtml: string;
  coverPrompt: string;
};

type CoverArtDirection = {
  name: string;
  medium: string;
  composition: string;
  palette: string;
  people: string;
  lightAndTexture: string;
};

const COVER_ART_DIRECTIONS: CoverArtDirection[] = [
  {
    name: "Editorial suizo",
    medium:
      "diseño editorial minimalista con fotografía limpia, tipografía sans serif contemporánea y composición basada en retícula",
    composition:
      "un único elemento visual protagonista, titular alineado con precisión y mucho espacio negativo alrededor",
    palette:
      "blanco, negro, gris cálido y un único color de acento muy controlado",
    people:
      "retratos naturales y sobrios, mirada espontánea o gesto cotidiano; nunca pose corporativa",
    lightAndTexture:
      "luz natural suave, contraste moderado, fondos limpios y textura prácticamente imperceptible",
  },

  {
    name: "Objeto editorial",
    medium:
      "fotografía de estudio minimalista de un único objeto relacionado conceptualmente con el tema",
    composition:
      "objeto aislado con escala generosa, encuadre preciso y titular pequeño integrado en el espacio negativo",
    palette:
      "blanco roto, carbón, gris piedra y tonos naturales del objeto",
    people:
      "sin personas; una mano puede aparecer únicamente cuando sea necesaria para aportar contexto o escala",
    lightAndTexture:
      "luz lateral suave, sombras naturales, materiales reales y acabado fotográfico limpio",
  },

  {
    name: "Retrato contemporáneo",
    medium:
      "fotografía editorial contemporánea con tratamiento cercano a revista de diseño, cultura y tecnología",
    composition:
      "retrato amplio o primer plano acompañado por un titular breve, con composición asimétrica y mucho aire",
    palette:
      "tonos neutros, piel natural, negro y un acento cromático extraído de la propia fotografía",
    people:
      "expresiones relajadas, gestos reales y situaciones vinculadas al tema; evitar poses artificiales",
    lightAndTexture:
      "luz natural o de estudio muy difusa, profundidad suave y grano fotográfico extremadamente sutil",
  },

  {
    name: "Tipografía protagonista",
    medium:
      "composición editorial puramente tipográfica inspirada en publicaciones contemporáneas de diseño",
    composition:
      "titular de gran escala ocupando buena parte del formato, acompañado por pequeños datos o elementos secundarios",
    palette:
      "blanco, negro y un único tono de acento",
    people:
      "sin personas ni ilustraciones salvo que sean absolutamente necesarias",
    lightAndTexture:
      "superficies planas, bordes precisos, sin efectos decorativos ni texturas innecesarias",
  },

  {
    name: "Tecnología silenciosa",
    medium:
      "fotografía minimalista de hardware, pantallas, componentes o espacios tecnológicos tratados como objetos editoriales",
    composition:
      "detalle técnico aislado, encuadre arquitectónico y texto reducido situado fuera del foco principal",
    palette:
      "negro, plata, blanco frío, gris grafito y pequeños acentos provenientes del propio dispositivo",
    people:
      "sin retratos; manos o siluetas solo cuando ayuden a comprender la interacción",
    lightAndTexture:
      "reflejos suaves, metal, cristal, luz ambiental y contraste preciso sin estética futurista exagerada",
  },

  {
    name: "Arquitectura digital",
    medium:
      "composición abstracta basada en geometría, interfaces simplificadas y estructuras modulares",
    composition:
      "bloques, líneas o paneles organizados mediante una retícula estricta con un foco visual claramente definido",
    palette:
      "blanco roto, negro, gris y un color funcional de acento",
    people:
      "sin personas; la estructura visual comunica el concepto",
    lightAndTexture:
      "formas planas, sombras mínimas, líneas finas y acabado extremadamente limpio",
  },

  {
    name: "Editorial conceptual",
    medium:
      "fotografía conceptual minimalista donde una escena sencilla representa visualmente la idea principal del contenido",
    composition:
      "una sola metáfora visual, pocos elementos y gran cantidad de espacio negativo reservado para el titular",
    palette:
      "colores naturales y desaturados con uno o dos tonos dominantes",
    people:
      "personas únicamente cuando formen parte esencial de la idea, mostradas de forma cotidiana y no publicitaria",
    lightAndTexture:
      "luz natural, materiales reales, sombras suaves y tratamiento editorial sobrio",
  },
];
function selectCoverArtDirection(
  editorialDirection: string,
  variant: number
): CoverArtDirection {
  let hash = 0;
  for (const character of editorialDirection) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }
  const baseIndex = Math.abs(hash) % COVER_ART_DIRECTIONS.length;
  const safeVariant = Number.isFinite(variant) ? Math.max(0, variant) : 0;
  return COVER_ART_DIRECTIONS[
    (baseIndex + Math.floor(safeVariant)) % COVER_ART_DIRECTIONS.length
  ];
}


// Mantener sincronizado con las reglas en app/globals.css para vista previa local.
const IA_GENERATED_INLINE_STYLES = `
<style>
.ia-cover {
  max-width: min(900px, 100%);
  margin: 2rem auto;
}
.ia-cover img {
  display: block;
  width: 100%;
  aspect-ratio: 3 / 2;
  object-fit: cover;
  border-radius: .5rem;
}
.ia-cover figcaption {
  margin-top: .75rem;
  color: #a3a3a3;
  font: .85rem/1.6 Arial, sans-serif;
}
.ia-cover a { color: #d7ff52; }
.ia-generated {
  box-sizing: border-box;
  font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  max-width: min(780px, 100%);
  margin: 2rem auto;
  padding: clamp(1.25rem, 4vw, 3rem);
  background: #111110;
  border: 1px solid #30302d;
  border-radius: .5rem;
  box-shadow: none;
  color: #d4d4cf;
  overflow-wrap: anywhere;
  color-scheme: dark;
}
.ia-generated::before, .ia-generated::after, .ia-generated h2::before { content: none; }
.ia-generated h1 {
  margin: 0 0 2rem;
  font-size: clamp(2rem, 5vw, 3.5rem);
  line-height: 1.12;
  letter-spacing: -.04em;
  font-weight: 700;
  color: #fafaf5;
}
.ia-generated h2 {
  margin: 2.5rem 0 1rem;
  padding: 0;
  font-size: clamp(1.4rem, 3vw, 2rem);
  line-height: 1.3;
  letter-spacing: -.025em;
  font-weight: 600;
  color: #fafaf5;
}
.ia-generated p { margin: 1rem 0; color: #d4d4cf; font-size: 1.05rem; line-height: 1.85; }
.ia-generated ul, .ia-generated ol { margin: 1.25rem 0; padding-left: 1.5rem; color: #d4d4cf; }
.ia-generated li { margin-bottom: .65rem; font-size: 1.05rem; line-height: 1.8; }
.ia-generated li::marker { color: #d7ff52; }
.ia-generated strong { color: #fafaf5; }
.ia-generated a {
  color: #d7ff52;
  text-decoration: underline;
  text-decoration-color: #71852c;
  text-underline-offset: .2em;
}
.ia-generated a:hover { color: #e6ff96; text-decoration-color: currentColor; }
.ia-generated a:focus-visible, .ia-cover a:focus-visible { outline: 2px solid #d7ff52; outline-offset: 4px; }
.ia-generated blockquote {
  margin: 2rem 0;
  padding: 1rem 1.5rem;
  background: #1b1b18;
  border-left: 3px solid #d7ff52;
  color: #e5e5df;
}
.ia-generated figure { margin: 2rem auto; }
.ia-generated figcaption { margin-top: .75rem; font-size: .9rem; color: #a3a3a3; }
.ia-generated table { display: block; max-width: 100%; overflow-x: auto; margin: 2rem 0; border-collapse: collapse; }
.ia-generated table th, .ia-generated table td { padding: .85rem 1rem; border: 1px solid #3b3b36; text-align: left; background: #161614; color: #d4d4cf; }
.ia-generated table th { background: #252520; font-weight: 600; color: #fafaf5; }
.ia-generated hr { margin: 2.5rem 0; border: 0; height: 1px; background: #3b3b36; }
.ia-generated img { display: block; max-width: 100%; height: auto; border-radius: .5rem; margin: 2rem auto; }
.ia-generated section { margin-top: 2rem; }
.ia-generated footer { margin-top: 3rem; font-size: .9rem; color: #a3a3a3; }
@media (max-width: 680px) {
  .ia-generated { margin: 1rem 0; padding: 1.25rem; }
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
  const textModel =
    process.env.OPENAI_TEXT_MODEL?.trim() || "gpt-5.6-luna";
  const response = await fetch(`${apiBase}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: textModel,
      messages: [
        {
          role: "system",
          content: EDITORIAL_PUBLICATION_PROMPT,
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
    throw new Error(
      `OpenAI article generation failed (${textModel}): ${detail}`
    );
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
  apiKey: string,
  variant = 0
): Promise<CoverAsset> {
  const artDirection = selectCoverArtDirection(editorialDirection, variant);
  const coverText = extractCoverText(editorialDirection);
  const prompt = `
Crea una imagen horizontal original que funcione como thumbnail de YouTube, portada de una publicación y pieza para redes sociales:
${editorialDirection}

TEXTO OBLIGATORIO EN LA IMAGEN: "${coverText}"
- Escríbelo exactamente una vez, con letras grandes, nítidas y perfectamente legibles.
- Debe entenderse incluso al reducir la imagen al tamaño de una miniatura móvil.
- Reserva una zona segura alrededor del texto para permitir recortes a 16:9, 4:5 y 1:1.

VARIACIÓN VISUAL OBLIGATORIA: ${artDirection.name}
- Medio: ${artDirection.medium}.
- Composición: ${artDirection.composition}.
- Paleta exclusiva de esta variante: ${artDirection.palette}.
- Presencia humana: ${artDirection.people}.
- Luz y textura: ${artDirection.lightAndTexture}.

Reglas de contenido:
- Representa el tema específico de la publicación mediante su entorno, objetos, materiales, acción o evidencia de resultado.
- Conserva del concepto editorial únicamente el asunto, el objeto central y el contexto relevantes. La dirección visual anterior no prevalece sobre la variación obligatoria.
- El resultado debe sentirse desenfadado, contemporáneo, techy y compartible; evita la estética corporativa o de banco de imágenes.
- Construye una jerarquía inmediata: titular, sujeto visual y uno o dos acentos gráficos. No llenes cada rincón.
- No uses por defecto la escena de una persona de espaldas trabajando ante un portátil o monitor.
- Una pantalla nunca debe ser el único sujeto ni ocupar el centro como una captura de interfaz genérica.
- Evita oficinas domésticas decorativas, plantas usadas como relleno, logotipos, marcas de agua, robots humanoides, cerebros luminosos y hologramas genéricos.
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

function extractCoverText(editorialDirection: string): string {
  const match = editorialDirection.match(
    /TEXTO EN PORTADA:\s*["“”]?([^\n"“”]+)["“”]?/i
  );
  const candidate = match?.[1]?.replace(/\s+/g, " ").trim();
  if (candidate) return candidate.slice(0, 72);

  return editorialDirection
    .replace(/TEXTO EN PORTADA:/gi, "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .slice(0, 6)
    .join(" ")
    .slice(0, 72);
}
// 📤 Publicar en WordPress con featured image
async function generateCoverWithFallback(
  topic: string,
  apiKey: string,
  variant = 0
): Promise<CoverAsset> {
  try {
    return await generateAiCover(topic, apiKey, variant);
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
    `editorial documentary ${topic.slice(0, 180)}`
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
