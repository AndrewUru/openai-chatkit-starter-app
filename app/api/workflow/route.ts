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
Crea un artículo técnico editorial en español sobre desarrollo web e inteligencia artificial, acompañado de una dirección visual, a partir del briefing proporcionado.

OBJETIVO

Transforma la aportación humana del briefing en un caso técnico de producto web plausible.

La pieza debe analizar:
- el problema;
- el contexto de uso;
- la solución propuesta;
- la arquitectura;
- la interacción;
- el papel específico de la IA;
- las decisiones de implementación;
- las limitaciones;
- los riesgos.

No escribas una historia ni una pieza narrativa.
No construyas personajes ficticios, escenas dramatizadas ni situaciones noveladas.

La aportación humana debe funcionar como requisito, problema o caso de uso real que estructura todo el artículo.

PRINCIPIO CENTRAL

La "chispa aportada por la persona" es el punto de partida técnico del análisis.

Debes interpretar esa aportación como uno o varios de estos elementos:

- problema de usuario;
- necesidad;
- requisito funcional;
- comportamiento;
- fricción;
- oportunidad de automatización;
- hipótesis de producto;
- caso de uso.

Preserva su significado original.

No la conviertas en:
- una metáfora;
- una anécdota;
- un recurso narrativo;
- una keyword añadida artificialmente;
- una excusa para hablar genéricamente de IA.

CASO DE PRODUCTO

A partir del briefing, define un producto o experiencia web concreta.

El artículo debe permitir entender:

- qué problema aborda;
- quién podría utilizarlo;
- en qué contexto;
- cuál sería el flujo principal;
- qué información introduce el usuario;
- qué procesa el sistema;
- qué resultado devuelve;
- qué parte corresponde a lógica convencional;
- qué parte corresponde a IA;
- qué decisiones siguen dependiendo de una persona.

Evita expresiones vagas como:

"plataforma inteligente"
"experiencia impulsada por IA"
"sistema revolucionario"
"solución personalizada"

si no explicas inmediatamente qué hacen técnicamente.

ESTRUCTURA DEL ARTÍCULO

Organiza el contenido alrededor de una estructura técnica similar a esta:

1. Problema

Explica con precisión qué necesidad plantea el briefing y por qué puede convertirse en un problema de producto web.

2. Propuesta de producto

Define qué podría construirse.

Describe:
- objetivo;
- usuarios;
- funcionalidad principal;
- flujo de interacción;
- estados importantes de la interfaz.

3. Arquitectura de la solución

Explica una arquitectura plausible.

Cuando sea relevante, aborda:

- frontend;
- backend;
- APIs;
- almacenamiento;
- autenticación;
- procesamiento de datos;
- servicios externos;
- infraestructura;
- despliegue.

No añadas tecnologías únicamente para aparentar profundidad técnica.

Cada decisión debe estar relacionada con una necesidad concreta del producto.

4. Papel de la inteligencia artificial

Define exactamente para qué se utiliza IA.

Puede incluir, cuando tenga sentido:

- clasificación;
- extracción;
- generación;
- embeddings;
- búsqueda semántica;
- RAG;
- recomendación;
- resumen;
- transformación;
- visión;
- análisis de texto;
- detección de patrones;
- asistencia contextual.

Explica también qué NO debería delegarse a la IA.

Diferencia entre:
- reglas deterministas;
- lógica de aplicación;
- procesamiento con modelos;
- decisiones humanas.

5. Flujo de datos

Cuando sea relevante, explica de forma comprensible:

entrada del usuario → validación → procesamiento → modelo → resultado → interfaz

Indica qué datos se almacenan y cuáles podrían procesarse temporalmente.

6. Interfaz y experiencia de usuario

Describe cómo se materializaría la solución en una interfaz web.

Puedes tratar aspectos como:

- formularios;
- dashboards;
- edición;
- estados de carga;
- streaming;
- feedback;
- errores;
- historial;
- confirmaciones;
- accesibilidad;
- diseño responsive.

La interfaz debe responder al funcionamiento real del sistema.

7. Limitaciones y riesgos

Analiza al menos una limitación importante.

Por ejemplo:

- errores del modelo;
- alucinaciones;
- privacidad;
- coste;
- latencia;
- dependencia de proveedores;
- seguridad;
- sesgos;
- accesibilidad;
- calidad de datos;
- mantenimiento;
- escalabilidad.

No presentes la IA como una solución automática o infalible.

8. Implementación viable hoy

Aclara qué partes del producto podrían desarrollarse actualmente con tecnologías existentes.

Distingue claramente cualquier elemento experimental o especulativo.

No inventes:
- métricas;
- resultados;
- estudios;
- usuarios;
- herramientas inexistentes;
- APIs inexistentes;
- capacidades técnicas no disponibles.

ENFOQUE TÉCNICO

El desarrollo web debe tener peso real en el artículo.

Cuando ayude al caso, puedes discutir decisiones como:

- React;
- Next.js;
- Server Components;
- APIs REST;
- Server Actions;
- WebSockets;
- streaming;
- bases de datos;
- almacenamiento vectorial;
- caché;
- autenticación;
- colas;
- edge functions;
- observabilidad;
- rate limiting;
- arquitectura serverless.

No es obligatorio utilizar estas tecnologías.

Selecciona únicamente las que tengan sentido para el producto descrito.

Evita convertir el artículo en una lista de tecnologías.

IA Y ARQUITECTURA

Si utilizas un modelo generativo, explica:

- qué contexto recibe;
- qué información proporciona el usuario;
- qué información recupera el sistema;
- qué resultado genera;
- cómo se valida;
- qué ocurre cuando falla.

Cuando tenga sentido, explica si sería preferible utilizar:

- prompting;
- structured outputs;
- function calling;
- embeddings;
- RAG;
- modelos especializados;
- clasificación convencional;
- reglas deterministas.

No presupongas que un LLM es siempre la mejor solución.

ESTILO EDITORIAL

Escribe entre 700 y 1.000 palabras.

El tono debe ser:

- técnico;
- claro;
- crítico;
- preciso;
- accesible para desarrolladores web;
- editorial, no académico.

Evita:

- storytelling;
- escenas ficticias;
- dramatización;
- metáforas excesivas;
- introducciones genéricas;
- lenguaje de marketing;
- hype sobre inteligencia artificial;
- tecnosolucionismo;
- frases como "la IA está revolucionando...";
- conclusiones grandilocuentes.

El artículo debe parecer escrito por alguien que analiza cómo construir el producto, no por alguien intentando venderlo.

APERTURA

Empieza directamente explicando el problema planteado por el briefing.

No empieces con una historia.

Puedes abrir con:
- una observación;
- una limitación;
- un problema técnico;
- una necesidad de producto;
- una contradicción;
- una pregunta técnica.

FORMATO HTML

Devuelve exclusivamente HTML semántico válido para insertar dentro de una página existente.

Utiliza:

- un único <h1>;
- <section>;
- <h2>;
- <p>;
- <ul><li> cuando ayude a estructurar información técnica.

No incluyas:

- <html>;
- <head>;
- <body>;
- <style>;
- <script>;
- Markdown;
- bloques de código;
- comentarios HTML.

No añadas explicaciones fuera del HTML.

CIERRE

Termina con una pregunta técnica o de producto dirigida a la comunidad de desarrollo web.

Debe surgir de alguna decisión o tensión real del caso.

Por ejemplo:

- cuánto automatizar;
- qué debe seguir bajo control humano;
- dónde almacenar determinados datos;
- cuándo utilizar un modelo;
- cuándo una solución determinista sería mejor.

DIRECCIÓN VISUAL

Después del artículo incluye:

<section>
  <h2>Dirección visual</h2>
  <p>...</p>
</section>

Describe una única imagen editorial horizontal relacionada directamente con el producto analizado.

La escena debe mostrar un entorno real de desarrollo, diseño o uso del producto.

Puede incluir:

- una persona trabajando;
- un portátil o monitor;
- prototipos;
- componentes físicos relacionados con el caso;
- una interfaz web visible de forma no legible;
- elementos del contexto real de uso.

La imagen debe comunicar visualmente qué tipo de producto se está construyendo.

No necesita representar una historia ni una escena emocional.

Prioriza:
- claridad;
- contexto técnico;
- realismo;
- composición editorial;
- coherencia con el artículo.

Evita clichés visuales de IA:

- robots humanoides;
- cerebros luminosos;
- hologramas;
- interfaces flotantes;
- código binario decorativo;
- circuitos sobre rostros;
- estética cyberpunk genérica;
- texto legible;
- logotipos;
- marcas de agua.

CRITERIO FINAL

Antes de responder, comprueba internamente:

- ¿El artículo analiza un producto concreto?
- ¿El problema proviene directamente de la aportación humana?
- ¿Se entiende cómo funcionaría técnicamente?
- ¿La IA tiene una función específica y justificada?
- ¿Se distingue entre IA y lógica convencional?
- ¿La arquitectura es plausible?
- ¿Se explican limitaciones reales?
- ¿Podría un desarrollador imaginar cómo empezar a construirlo?

Si alguna respuesta es no, corrige la pieza antes de entregarla.
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
