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
  const article = await generateStyledArticle(topic, openaiApiKey);
  // Generar imagen con DALL·E
  const imageUrl = await generateImage(topic, openaiApiKey);
  // Publicar en WordPress con la imagen destacada
  const wordpressUrl = await publishToWordPress(article, imageUrl);
  return { article, imageUrl, wordpressUrl };
}
// 🧠 Prompt mejorado con HTML moderno y estilo visual
const STYLED_ARTICLE_PROMPT = `
Eres un redactor especializado en desarrollo web y marketing digital.
Escribe un artículo optimizado para SEO sobre el tema "{{topic}}" usando HTML moderno.
Estructura:
- <h1> título principal </h1>
- <section> con introducción en <p>
- Subtítulos con <h2> y secciones detalladas con <p> o <ul>
- Conclusión en <section> final
Estilo visual:
- Usa párrafos claros (<p>) y listas con <ul><li>.
- No uses etiquetas <html>, <head> o <body>.
- Usa lenguaje profesional, inspirador y cercano.
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
  const [firstLine, ...rest] = article.split("\n");
  const title = firstLine.replace(/<[^>]*>/g, "").trim() || "Nuevo artículo";
  const content = rest.join("\n").trim();
  let featuredImageId: number | null = null;
  // Subir imagen si existe
  if (imageUrl) {
    try {
      const imgResponse = await fetch(imageUrl);
      const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
      const uploadResponse = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
        method: "POST",
        headers: {
          "Content-Disposition": `attachment; filename="${title.replace(
            /\s+/g,
            "_"
          )}.jpg"`,
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
  // Crear post con imagen destacada
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
      status: "publish", // cambia a "draft" si prefieres revisarlo antes
      featured_media: featuredImageId || undefined,
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
