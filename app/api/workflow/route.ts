import type { CoverAsset, UnsplashCover } from "@/lib/creative-assets";

export const runtime = "nodejs";
export const maxDuration = 180;

type WorkflowInput = {
  input_as_text: string;
  cover_prompt?: string;
  action?: "create" | "article" | "cover";
  cover_source?: "auto" | "generated" | "unsplash";
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

  if (workflow.action === "cover") {
    const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
    const cover =
      workflow.cover_source === "unsplash"
        ? await searchUnsplashCover(requestedCoverPrompt)
        : workflow.cover_source === "auto"
        ? await generateCoverWithFallback(
            requestedCoverPrompt,
            requireOpenAiKey(openaiApiKey)
          )
        : await generateAiCover(
            requestedCoverPrompt,
            requireOpenAiKey(openaiApiKey)
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
  const article = `${IA_GENERATED_INLINE_STYLES}
<article class="ia-generated">
${editorialPackage.articleHtml.trim()}
</article>`;

  if (workflow.action === "article") {
    return { article, coverPrompt: editorialPackage.coverPrompt };
  }

  const cover = await generateCoverWithFallback(
    editorialPackage.coverPrompt,
    openaiApiKey
  );
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
Crea un artículo técnico editorial en español que convierta el briefing en un plan concreto para diseñar, construir, probar y entregar una aplicación con Codex. Acompáñalo de una dirección visual coherente.

OBJETIVO

Transforma la aportación humana del briefing en una propuesta de aplicación plausible y en un flujo de trabajo útil con Codex.

La pieza debe analizar:
- el problema;
- el contexto de uso;
- el alcance de la primera versión;
- la arquitectura y la experiencia de usuario;
- el contexto que necesita Codex;
- las fases de implementación;
- la estrategia de pruebas y verificación;
- las decisiones que requieren revisión humana;
- las limitaciones y los riesgos.

No escribas una historia ni una pieza narrativa.
No construyas personajes ficticios, escenas dramatizadas ni situaciones noveladas.

La aportación humana debe funcionar como requisito, problema o caso de uso real que estructura todo el artículo. No conviertas Codex en el protagonista: el centro es la aplicación que una persona necesita construir.

PRINCIPIO CENTRAL

La "aplicación o necesidad aportada por la persona" es el punto de partida técnico del análisis.

Debes interpretar esa aportación como uno o varios de estos elementos:

- problema de usuario;
- necesidad;
- requisito funcional;
- comportamiento;
- fricción;
- flujo que hoy resulta manual o insuficiente;
- hipótesis de producto;
- caso de uso.

Preserva su significado original.

No la conviertas en:
- una metáfora;
- una anécdota;
- un recurso narrativo;
- una keyword añadida artificialmente;
- una excusa para hablar genéricamente de Codex o inteligencia artificial.

APLICACIÓN CONCRETA

A partir del briefing, define una aplicación concreta que pueda construirse de forma incremental con Codex.

El artículo debe permitir entender:

- qué problema aborda;
- quién podría utilizarlo;
- en qué contexto;
- cuál sería el flujo principal;
- qué información introduce el usuario;
- qué procesa el sistema;
- qué resultado devuelve;
- cuál es el alcance mínimo útil;
- qué deberá explorar, implementar y verificar Codex;
- qué decisiones siguen dependiendo de una persona.

Evita expresiones vagas como:

"Codex hará la aplicación"
"desarrollo totalmente automático"
"sistema revolucionario"
"solución personalizada"

si no explicas inmediatamente el trabajo, el contexto y los criterios de aceptación necesarios.

Codex es el agente que ayuda a desarrollar la aplicación. No presupongas que Codex, un modelo o una función generativa forman parte del producto final. Incluye IA dentro de la aplicación únicamente cuando el briefing lo requiera y exista una función de producto justificada.

ESTRUCTURA DEL ARTÍCULO

Organiza el contenido alrededor de esta estructura:

1. Problema

Explica con precisión qué necesidad plantea el briefing, quién la experimenta y qué resultado observable debería producir la aplicación.

2. Aplicación y primera versión

Define qué podría construirse.

Describe:
- objetivo;
- usuarios;
- funcionalidad principal;
- flujo de interacción;
- estados importantes de la interfaz;
- qué queda deliberadamente fuera de la primera versión.

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

4. Plan de trabajo con Codex

Explica cómo dividir el trabajo en encargos pequeños y verificables para Codex.

Incluye, cuando sea relevante:

- qué debería explorar primero en el repositorio;
- qué archivos, convenciones y restricciones necesita conocer;
- qué plan debería proponer antes de editar;
- en qué orden implementar los cambios;
- qué comandos, pruebas o recorridos debería ejecutar;
- qué evidencia debería presentar al terminar.

Propón ejemplos breves de encargos concretos, pero no redactes una conversación ficticia ni una colección de prompts genéricos.

Explica también qué decisiones de producto, seguridad, datos o publicación no deberían delegarse sin revisión.

5. Contexto e instrucciones

Describe la información que permitirá a Codex trabajar con precisión:

- objetivo y comportamiento esperado;
- estructura y estado actual del repositorio;
- restricciones técnicas y de diseño;
- convenciones del proyecto y contenido relevante de AGENTS.md;
- criterios de aceptación;
- comandos de validación;
- acciones que necesitan confirmación.

No inventes archivos ni configuraciones que el briefing no menciona. Si falta información, conviértela en una pregunta o una comprobación inicial.

6. Interfaz y comportamiento

Describe cómo se materializaría la solución para quien la usa.

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

7. Verificación y revisión

Define cómo comprobar el trabajo antes de aceptarlo:

- pruebas automatizadas relevantes;
- comprobaciones de tipos y lint;
- recorridos manuales o en navegador;
- estados vacíos, de carga y error;
- accesibilidad;
- seguridad y privacidad;
- regresiones posibles;
- evidencia que Codex debería devolver.

No des por terminada una fase solo porque el código compile.

8. Límites, riesgos y control humano

Analiza al menos una limitación importante.

Por ejemplo:

- privacidad;
- coste;
- dependencia de proveedores;
- seguridad;
- accesibilidad;
- calidad de datos;
- mantenimiento;
- escalabilidad.

Incluye riesgos propios del desarrollo asistido: requisitos ambiguos, cambios demasiado amplios, validación insuficiente, exposición de secretos o aceptación de código no revisado.

9. Primera iteración viable

Propón una primera iteración que pueda encargarse a Codex hoy, con un alcance acotado, una salida concreta y una lista breve de comprobaciones.

Distingue claramente cualquier elemento experimental o especulativo.

No inventes:
- métricas;
- resultados;
- estudios;
- usuarios;
- herramientas inexistentes;
- APIs inexistentes;
- capacidades técnicas no disponibles.

ARQUITECTURA Y TECNOLOGÍA

La ingeniería de software debe tener peso real en el artículo.

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

CODEX EN EL PROCESO

Describe a Codex como colaborador de desarrollo que trabaja con el contexto y los permisos disponibles. No le atribuyas acceso, memoria, integraciones, herramientas o autonomía que el briefing no establezca.

Un buen flujo debe conectar:

objetivo humano → exploración del proyecto → plan revisable → cambios pequeños → pruebas → evidencia → decisión humana

Cuando ayude al caso, explica cómo aprovechar:

- instrucciones persistentes del repositorio;
- habilidades o integraciones relevantes;
- revisión de código;
- terminal y pruebas;
- verificación visual;
- tareas repetibles o automatizadas.

Menciona solo capacidades necesarias para el plan y formula cualquier dependencia del entorno como condición, no como hecho garantizado.

ESTILO EDITORIAL

Escribe entre 700 y 1.000 palabras.

El tono debe ser:

- técnico;
- claro;
- crítico;
- preciso;
- accesible para personas que quieren construir software con Codex;
- editorial, no académico.

Evita:

- storytelling;
- escenas ficticias;
- dramatización;
- metáforas excesivas;
- introducciones genéricas;
- lenguaje de marketing;
- hype sobre inteligencia artificial o agentes;
- tecnosolucionismo;
- frases como "Codex lo hará todo" o "la IA está revolucionando...";
- conclusiones grandilocuentes.

El artículo debe parecer escrito por alguien que prepara un trabajo real con Codex, no por alguien intentando vender la herramienta.

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

Termina con una pregunta técnica o de producto dirigida a quienes construyen aplicaciones con Codex.

Debe surgir de alguna decisión o tensión real del caso.

Por ejemplo:

- qué debería incluir la primera versión;
- qué decisión debe seguir bajo control humano;
- qué evidencia es suficiente para aceptar un cambio;
- qué contexto falta antes de implementar;
- dónde dividir el trabajo entre fases.

DIRECCIÓN VISUAL

Después del artículo incluye:

<section>
  <h2>Dirección visual</h2>
  <p>...</p>
</section>

Describe una única imagen editorial horizontal relacionada directamente con el producto analizado.

La escena debe mostrar un entorno real de creación, revisión o prueba de la aplicación con Codex.

Puede incluir:

- una persona trabajando;
- un portátil o monitor;
- prototipos;
- notas de alcance o criterios de aceptación;
- una interfaz de aplicación visible de forma no legible;
- elementos de prueba o revisión;
- elementos del contexto real de uso.

La imagen debe comunicar visualmente qué aplicación se está construyendo y que existe un proceso de colaboración entre una persona y Codex.

No necesita representar una historia ni una escena emocional.

Prioriza:
- claridad;
- contexto técnico;
- realismo;
- composición editorial;
- coherencia con el artículo.

Evita clichés visuales de IA y representaciones literales de marca:

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

- ¿El artículo define una aplicación concreta?
- ¿El problema proviene directamente de la aportación humana?
- ¿Se entiende cómo funcionaría técnicamente?
- ¿Se entiende cómo colaborar con Codex para construirla?
- ¿Codex aparece como agente de desarrollo y no como funcionalidad obligatoria del producto?
- ¿La arquitectura es plausible?
- ¿Hay criterios de aceptación, pruebas y puntos de revisión humana?
- ¿Se explican límites y riesgos reales?
- ¿Podría una persona convertir el artículo en su siguiente encargo a Codex?

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
- La escena debe mostrar de forma natural el proceso de idear, construir, probar o revisar una aplicación con Codex.
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
