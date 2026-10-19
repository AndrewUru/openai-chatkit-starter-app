import type { CoverAsset, GeneratedCover, UnsplashCover } from "@/lib/creative-assets";
import { extractExcerpt, insertCoverFigure } from "@/lib/wordpress-article";

// WordPress REST helpers shared by the editor's publish route and community publishing.

type UploadedMedia = {
  id: number;
  sourceUrl: string;
};

const MAX_IMAGE_BASE64_LENGTH = 8_000_000;
export const EDITORIAL_CATEGORY_ID = 20;

export class WordPressError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly detail?: unknown
  ) {
    super(message);
  }
}

export function wordpressAuthHeader(config: ReturnType<typeof getWordPressConfig>): string {
  return `Basic ${Buffer.from(`${config.username}:${config.appPassword}`).toString("base64")}`;
}

/** Uploads the cover (if any), inserts it after the meta row and creates the post. */
export async function publishToWordPress(options: {
  contentHtml: string;
  title: string;
  status: "publish" | "draft";
  cover?: CoverAsset;
  tags?: number[];
}): Promise<{ id?: number; link?: string; status?: string }> {
  const wordpress = getWordPressConfig();
  const authHeader = wordpressAuthHeader(wordpress);
  const { title, status, cover } = options;
  let contentHtml = options.contentHtml;
  const excerpt = extractExcerpt(contentHtml);
  let featuredImageId: number | undefined;

  if (cover?.source === "generated") {
    const uploadedCover = await uploadGeneratedCover(cover, title, wordpress.baseUrl, authHeader);
    featuredImageId = uploadedCover.id;
    await setMediaAltText(
      uploadedCover.id,
      (cover.alt || title).slice(0, 300),
      wordpress.baseUrl,
      authHeader
    );
    contentHtml = insertGeneratedCover(contentHtml, uploadedCover, cover.alt);
  } else if (cover?.source === "unsplash") {
    await trackUnsplashSelection(cover);
    contentHtml = insertUnsplashCover(contentHtml, cover);
  }

  const response = await fetch(`${wordpress.baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: authHeader },
    body: JSON.stringify({
      title,
      content: contentHtml,
      status,
      excerpt: excerpt || undefined,
      featured_media: featuredImageId,
      categories: [EDITORIAL_CATEGORY_ID],
      ...(options.tags?.length ? { tags: options.tags } : {}),
    }),
  });

  if (!response.ok) {
    const detail = await parseWordPressError(response);
    throw new WordPressError(
      `WordPress devolvió ${response.status}: ${detail.message}`,
      response.status,
      detail.raw
    );
  }
  return (await response.json().catch(() => ({}))) as { id?: number; link?: string; status?: string };
}

export function getWordPressConfig() {
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

export async function uploadGeneratedCover(
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

/** Alt text matters for accessibility and image search; a failure here must not block publishing. */
export async function setMediaAltText(
  mediaId: number,
  altText: string,
  baseUrl: string,
  authHeader: string
): Promise<void> {
  try {
    const response = await fetch(`${baseUrl}/wp-json/wp/v2/media/${mediaId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: authHeader },
      body: JSON.stringify({ alt_text: altText }),
    });
    if (!response.ok) {
      console.warn("WordPress no aceptó el texto alternativo de la portada", response.status);
    }
  } catch (error) {
    console.warn("No se pudo guardar el texto alternativo de la portada", error);
  }
}

export function insertGeneratedCover(
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

  return insertCoverFigure(content, figure);
}

export async function trackUnsplashSelection(cover: UnsplashCover): Promise<void> {
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

export function insertUnsplashCover(content: string, cover: UnsplashCover): string {
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

  return insertCoverFigure(content, figure);
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

export async function parseWordPressError(response: Response) {
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

export function deriveTitleFromContent(content: string): string {
  const htmlTitle = content.match(/<h1[^>]*>(.*?)<\/h1>/i)?.[1];
  if (htmlTitle) return htmlTitle.replace(/<[^>]*>/g, "").trim();

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    return line.replace(/^#{1,2}\s+/, "").trim();
  }
  return "Artículo generado";
}

export function looksLikeHtml(content: string): boolean {
  return /<(article|section|h1|p)[\s>]/i.test(content);
}

export function toHtml(content: string): string {
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

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
