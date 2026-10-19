import type { CoverAsset } from "@/lib/creative-assets";
import { isAdminRequest, isSameOrigin } from "@/lib/admin-auth";
import {
  refreshArticleMeta,
  sanitizeArticleForPublish,
} from "@/lib/wordpress-article";
import {
  deriveTitleFromContent,
  looksLikeHtml,
  publishToWordPress,
  toHtml,
  WordPressError,
} from "@/lib/wordpress-client";

export const runtime = "nodejs";
export const maxDuration = 60;

type PublishRequestBody = {
  title?: string;
  content: string;
  status?: "publish" | "draft";
  cover?: CoverAsset;
};

export async function POST(req: Request) {
  try {
    validatePublicKey(req);
    // The public key ships to every browser; only the editor's session may write to WordPress.
    if (!isSameOrigin(req)) {
      return Response.json({ error: "Origen no permitido." }, { status: 403 });
    }
    if (!isAdminRequest(req)) {
      return Response.json(
        { error: "Solo el equipo editorial puede publicar en WordPress." },
        { status: 401 }
      );
    }
    const body = (await req.json().catch(() => null)) as
      | PublishRequestBody
      | null;

    if (!body || typeof body.content !== "string" || !body.content.trim()) {
      return Response.json({ error: "Falta el contenido de la pieza." }, { status: 400 });
    }

    const contentHtml = looksLikeHtml(body.content)
      ? refreshArticleMeta(sanitizeArticleForPublish(body.content))
      : toHtml(body.content);
    const title = (
      typeof body.title === "string" && body.title.trim()
        ? body.title.replace(/<[^>]*>/g, "").trim()
        : deriveTitleFromContent(contentHtml)
    ).slice(0, 200);

    const post = await publishToWordPress({
      contentHtml,
      title,
      status: body.status === "publish" ? "publish" : "draft",
      cover: body.cover,
    });
    return Response.json({ post });
  } catch (error) {
    if (error instanceof WordPressError) {
      return Response.json(
        { error: error.message, message: error.message, detail: error.detail },
        { status: error.status }
      );
    }
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
