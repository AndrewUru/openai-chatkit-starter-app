import type { CoverAsset, GeneratedCover, UnsplashCover } from "@/lib/creative-assets";

export const runtime = "nodejs";
export const maxDuration = 60;

type PublishRequestBody = {
  title?: string;
  content: string;
  status?: "publish" | "draft" | "pending";
  cover?: CoverAsset;
};

type UploadedMedia = {
  id: number;
  sourceUrl: string;
};

const DEFAULT_STATUS: PublishRequestBody["status"] = "draft";
const MAX_IMAGE_BASE64_LENGTH = 8_000_000;

export async function POST(req: Request) {
  try {
    validatePublicKey(req);
    const body = (await req.json().catch(() => null)) as
      | PublishRequestBody
      | null;

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return Response.json({ error: "Falta el contenido de la pieza." }, { status: 400 });
    }

    const wordpress = getWordPressConfig();
    const title =
      typeof body.title === "string" && body.title.trim()
        ? body.title.trim()
        : deriveTitleFromContent(body.content);
    const authHeader = `Basic ${Buffer.from(
      `${wordpress.username}:${wordpress.appPassword}`
    ).toString("base64")}`;

    let contentHtml = looksLikeHtml(body.content)
      ? body.content.trim()
      : toHtml(body.content);
    let featuredImageId: number | undefined;

    if (body.cover?.source === "generated") {
      const uploadedCover = await uploadGeneratedCover(
        body.cover,
        title,
        wordpress.baseUrl,
        authHeader
      );
      featuredImageId = uploadedCover.id;
      contentHtml = insertGeneratedCover(
        contentHtml,
        uploadedCover,
        body.cover.alt
      );
    } else if (body.cover?.source === "unsplash") {
      await trackUnsplashSelection(body.cover);
      contentHtml = insertUnsplashCover(contentHtml, body.cover);
    }

    const response = await fetch(`${wordpress.baseUrl}/wp-json/wp/v2/posts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        title,
        content: contentHtml,
        status: body.status ?? DEFAULT_STATUS,
        featured_media: featuredImageId,
        categories: [20],
      }),
    });

    if (!response.ok) {
      const detail = await parseWordPressError(response);
      return Response.json(
        {
          error: `WordPress devolvió ${response.status}`,
          message: detail.message,
          detail: detail.raw,
        },
        { status: response.status }
      );
    }

    const post = await response.json().catch(() => ({}));
    return Response.json({ post });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "No se pudo publicar la pieza.";
    const status = message === "Acceso no autorizado" ? 403 : 500;
    console.error("Error publishing to WordPress", error);
    return Response.json({ error: message }, { status });
  }
}

function validatePublicKey(req: Request): void {
  const publicKey = process.env.PUBLIC_EXPERIMENT_KEY?.trim();
  if (!publicKey) throw new Error("Falta PUBLIC_EXPERIMENT_KEY.");
  const providedKey = new URL(req.url).searchParams.get("key");
  if (providedKey !== publicKey) throw new Error("Acceso no autorizado");
}

function getWordPressConfig() {
  const username = process.env.WORDPRESS_USERNAME?.trim();
  const appPassword = process.env.WORDPRESS_APP_PASSWORD?.trim();
  const baseUrl = process.env.WORDPRESS_BASE_URL?.trim()?.replace(/\/+$/, "");
  if (!username || !appPassword || !baseUrl) {
    throw new Error(
      "Falta la configuración de WordPress: WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD o WORDPRESS_BASE_URL."
    );
  }
  return { username, appPassword, baseUrl };
}

async function uploadGeneratedCover(
  cover: GeneratedCover,
  title: string,
  baseUrl: string,
  authHeader: string
): Promise<UploadedMedia> {
  if (cover.data.length > MAX_IMAGE_BASE64_LENGTH) {
    throw new Error("La portada generada supera el tamaño permitido.");
  }
  if (!["image/webp", "image/jpeg", "image/png"].includes(cover.mimeType)) {
    throw new Error("El formato de la portada no es válido.");
  }

  const imageBuffer = Buffer.from(cover.data, "base64");
  if (imageBuffer.length === 0) {
    throw new Error("La portada generada está vacía.");
  }

  const extension =
    cover.mimeType === "image/webp"
      ? "webp"
      : cover.mimeType === "image/png"
      ? "png"
      : "jpg";
  const filename = `${slugify(title) || "portada-ia"}.${extension}`;
  const response = await fetch(`${baseUrl}/wp-json/wp/v2/media`, {
    method: "POST",
    headers: {
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Type": cover.mimeType,
      Authorization: authHeader,
    },
    body: imageBuffer,
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`WordPress no pudo subir la portada: ${detail}`);
  }

  const media = (await response.json()) as {
    id?: number;
    source_url?: string;
    guid?: { rendered?: string };
  };
  if (typeof media.id !== "number") {
    throw new Error("WordPress no devolvió el ID de la portada.");
  }
  const sourceUrl = media.source_url || media.guid?.rendered;
  if (!sourceUrl || !isHttpUrl(sourceUrl)) {
    throw new Error("WordPress no devolvió la URL de la portada.");
  }
  return { id: media.id, sourceUrl };
}

function insertGeneratedCover(
  content: string,
  media: UploadedMedia,
  alt: string
): string {
  const attributes = JSON.stringify({
    id: media.id,
    sizeSlug: "full",
    linkDestination: "none",
  });
  const figure = `<!-- wp:image ${attributes} -->
<figure class="wp-block-image size-full ia-cover"><img src="${escapeAttribute(
    media.sourceUrl
  )}" alt="${escapeAttribute(alt)}" class="wp-image-${media.id}" /></figure>
<!-- /wp:image -->`;

  return insertCoverAfterStyles(content, figure);
}

async function trackUnsplashSelection(cover: UnsplashCover): Promise<void> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY?.trim();
  if (!accessKey) {
    throw new Error("Falta UNSPLASH_ACCESS_KEY para usar esta fotografía.");
  }
  const downloadUrl = new URL(cover.downloadLocation);
  if (downloadUrl.protocol !== "https:" || downloadUrl.hostname !== "api.unsplash.com") {
    throw new Error("La referencia de descarga de Unsplash no es válida.");
  }
  const response = await fetch(downloadUrl, {
    headers: {
      Authorization: `Client-ID ${accessKey}`,
      "Accept-Version": "v1",
    },
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("No se pudo registrar la selección de la foto en Unsplash.");
  }
}

function insertUnsplashCover(content: string, cover: UnsplashCover): string {
  const imageUrl = new URL(cover.url);
  if (imageUrl.protocol !== "https:" || imageUrl.hostname !== "images.unsplash.com") {
    throw new Error("La URL de la fotografía de Unsplash no es válida.");
  }

  const photographerUrl = validateUnsplashPageUrl(
    cover.attribution.photographerUrl
  );
  const unsplashUrl = validateUnsplashPageUrl(cover.attribution.unsplashUrl);

  const figure = `<figure class="ia-cover">
  <img src="${escapeAttribute(cover.url)}" alt="${escapeAttribute(cover.alt)}" />
  <figcaption>Foto de <a href="${escapeAttribute(
    photographerUrl
  )}">${escapeHtml(cover.attribution.photographerName)}</a> en <a href="${escapeAttribute(
    unsplashUrl
  )}">Unsplash</a></figcaption>
</figure>`;

  return insertCoverAfterStyles(content, figure);
}

function insertCoverAfterStyles(content: string, figure: string): string {
  return /<\/style>/i.test(content)
    ? content.replace(/<\/style>/i, (match) => `${match}\n${figure}`)
    : `${figure}\n${content}`;
}

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function validateUnsplashPageUrl(value: string): string {
  const url = new URL(value);
  const isUnsplashHost =
    url.hostname === "unsplash.com" || url.hostname.endsWith(".unsplash.com");
  if (url.protocol !== "https:" || !isUnsplashHost) {
    throw new Error("La atribución de Unsplash no es válida.");
  }
  return url.toString();
}

async function parseWordPressError(response: Response) {
  const detailText = await response.text().catch(() => "");
  let raw: unknown = detailText;
  let message = detailText || "Error desconocido";
  try {
    const parsed = JSON.parse(detailText) as { message?: string };
    raw = parsed;
    if (typeof parsed.message === "string") message = parsed.message;
  } catch {
    // WordPress can return plain text or HTML for infrastructure errors.
  }
  return { raw, message };
}

function deriveTitleFromContent(content: string): string {
  const htmlTitle = content.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1];
  if (htmlTitle) return htmlTitle.replace(/<[^>]*>/g, "").trim();

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    return line.replace(/^#{1,2}\s+/, "").trim();
  }
  return "Artículo generado";
}

function looksLikeHtml(content: string): boolean {
  return /<(article|section|h1|p)[\s>]/i.test(content);
}

function toHtml(content: string): string {
  const lines = content.split("\n");
  const htmlChunks: string[] = [];
  let inList = false;
  const closeList = () => {
    if (!inList) return;
    htmlChunks.push("</ul>");
    inList = false;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeList();
    } else if (line.startsWith("# ")) {
      closeList();
      htmlChunks.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
    } else if (line.startsWith("## ")) {
      closeList();
      htmlChunks.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
    } else if (line.startsWith("- ")) {
      if (!inList) {
        htmlChunks.push("<ul>");
        inList = true;
      }
      htmlChunks.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
    } else {
      closeList();
      htmlChunks.push(`<p>${escapeHtml(line)}</p>`);
    }
  }
  closeList();
  return htmlChunks.join("");
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function escapeAttribute(value: string): string {
  return escapeHtml(value);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
