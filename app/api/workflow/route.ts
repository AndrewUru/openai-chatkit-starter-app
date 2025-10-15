// C:\openai-chatkit-starter-app2\app\api\workflow\route.ts
type WorkflowInput = { input_as_text: string };
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
      message: "Art\u00edculo publicado con \u00e9xito",
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
  const openaiApiKey = process.env.OPENAI_API_KEY?.trim();
  if (!openaiApiKey) throw new Error("Missing OPENAI_API_KEY.");
  const topic = workflow.input_as_text?.trim();
  if (!topic) throw new Error("The request body must include input_as_text.");
  // Generar artículo con estilo
  const rawArticle = await generateStyledArticle(topic, openaiApiKey);
  const article = `${IA_GENERATED_INLINE_STYLES}
<article class="ia-generated">
${rawArticle.trim()}
</article>`;
  // Generar imagen con DALL·E
  const imageUrl = await generateImage(topic, openaiApiKey);
  // Publicar en WordPress con la imagen destacada
  const wordpressUrl = await publishToWordPress(article, imageUrl);
  return { article, imageUrl, wordpressUrl };
}
// 🧠 Prompt mejorado con HTML moderno y estilo visual
const STYLED_ARTICLE_PROMPT = `
Eres un redactor especializado en desarrollo web y marketing digital.
Redacta un artículo optimizado para SEO centrado en el tema "{{topic}}" usando HTML moderno.

Instrucciones:
- No incluyas frases como "publica un artículo" o "escribe sobre" en el título ni en el contenido.
- El título debe ser atractivo, natural y relevante para el tema, sin mencionar la instrucción.
- Estructura el contenido en formato HTML:
  - <h1> título principal </h1>
  - <section> introducción en <p> </section>
  - <h2> subtítulos temáticos </h2> con secciones detalladas en <p> o <ul><li>
  - <section> conclusión </section>
- Usa párrafos claros y legibles (<p>), listas (<ul><li>) y subtítulos bien organizados.
- No incluyas etiquetas <html>, <head> o <body>.
- Mantén un tono profesional, inspirador y cercano, orientado a lectores interesados en tecnología, desarrollo web y marketing digital.
`.trim();
// Mantener sincronizado con las reglas en app/globals.css para vista previa local.
const IA_GENERATED_INLINE_STYLES = `
<style>
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
async function generateStyledArticle(
  topic: string,
  apiKey: string
): Promise<string> {
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
          content:
            "Eres un asistente que genera artículos HTML con estilo moderno y limpio.",
        },
        {
          role: "user",
          content: STYLED_ARTICLE_PROMPT.replace("{{topic}}", topic),
        },
      ],
      temperature: 0.7,
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`OpenAI article generation failed: ${detail}`);
  }
  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || "Artículo no generado.";
}
// 🖼️ Generar imagen con DALL·E
async function generateImage(topic: string, apiKey: string): Promise<string> {
  const dallePrompt = `Crea una imagen moderna, minimalista y elegante relacionada con: ${topic}. 
  Estilo: fondo limpio, colores suaves, iluminación natural, formato horizontal 16:9.`;
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-image-1",
      prompt: dallePrompt,
      size: "1024x1024",
    }),
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("❌ Error generando imagen:", detail);
    return "";
  }
  const data = await response.json();
  return data.data?.[0]?.url || "";
}
// 📤 Publicar en WordPress con featured image
async function publishToWordPress(
  article: string,
  imageUrl?: string
): Promise<string | null> {
  const baseUrl = process.env.WORDPRESS_BASE_URL?.replace(/\/+$/, "");
  const username = process.env.WORDPRESS_USERNAME;
  const appPassword = process.env.WORDPRESS_APP_PASSWORD;
  if (!baseUrl || !username || !appPassword) {
    console.warn(
      "⚠️ WordPress environment variables not set, skipping publish."
    );
    return null;
  }
  const articleMarkup = article.trim();
  const titleMatch = articleMarkup.match(/<h1[^>]*>(.*?)<\/h1>/i);
  const title =
    titleMatch?.[1]?.replace(/<[^>]*>/g, "").trim() || "Nuevo articulo";
  const content = articleMarkup;
  let featuredImageId: number | null = null;
  // Subir imagen si existe
  if (imageUrl) {
    try {
      const imgResponse = await fetch(imageUrl);
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const uploadResponse = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Content-Disposition": `attachment; filename="${title
            .replace(/\s+/g, "_")
            .toLowerCase()}.jpg"`,
          "Content-Type": "image/jpeg",
          Authorization:
            "Basic " +
            Buffer.from(`${username}:${appPassword}`).toString("base64"),
        },
        body: imgBuffer,
      });
      if (uploadResponse.ok) {
        const uploadData = await uploadResponse.json();
        featuredImageId = uploadData.id;
        console.log(`🖼️ Imagen subida con ID ${featuredImageId}`);
      } else {
        console.warn("⚠️ No se pudo subir la imagen destacada.");
      }
    } catch (error) {
      console.error("❌ Error subiendo imagen destacada:", error);
    }
  }
  // 📰 Crear post con imagen destacada y categoría fija
  const postResponse = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization:
        "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64"),
    },
    body: JSON.stringify({
      title,
      content,
      status: "publish", // o "draft" si prefieres revisarlo antes
      featured_media: featuredImageId || undefined,
      categories: [20], // 👈 ID de tu categoría "IA Generada"
    }),
  });

  if (!postResponse.ok) {
    const text = await postResponse.text();
    throw new Error(`WordPress API error: ${text}`);
  }
  const data = await postResponse.json();
  console.log(`✅ Artículo publicado en WordPress: ${data.link}`);
  return data.link;
}
