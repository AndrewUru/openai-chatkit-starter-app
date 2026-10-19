import {
  adminCookieHeader,
  createAdminToken,
  isAdminConfigured,
  isAdminRequest,
  isSameOrigin,
  verifyAdminSecret,
} from "@/lib/admin-auth";
import { isCommunityPublishingEnabled } from "@/lib/community-review";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

const NO_STORE = { "Cache-Control": "no-store" };

export async function GET(request: Request) {
  return Response.json(
    {
      isEditor: isAdminRequest(request),
      configured: isAdminConfigured(),
      communityPublishing: isCommunityPublishingEnabled(),
    },
    { headers: NO_STORE }
  );
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  const limited = rateLimit(request, "login");
  if (limited) return limited;

  if (!isAdminConfigured()) {
    return Response.json(
      { error: "La publicación no está configurada en el servidor (ADMIN_PUBLISH_SECRET)." },
      { status: 503 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as { secret?: unknown };
  const secret = typeof body.secret === "string" ? body.secret : "";
  if (!secret || !verifyAdminSecret(secret)) {
    return Response.json({ error: "Clave de editor incorrecta." }, { status: 401 });
  }

  return Response.json(
    { isEditor: true },
    { headers: { ...NO_STORE, "Set-Cookie": adminCookieHeader(createAdminToken()) } }
  );
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return Response.json({ error: "Origen no permitido." }, { status: 403 });
  }
  return Response.json(
    { isEditor: false },
    { headers: { ...NO_STORE, "Set-Cookie": adminCookieHeader(null) } }
  );
}
