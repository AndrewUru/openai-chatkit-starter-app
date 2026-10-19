import { createHash, createHmac, timingSafeEqual } from "node:crypto";

// Publishing to WordPress is reserved for the site owner. The secret lives only
// on the server (never NEXT_PUBLIC_*); the browser just holds a signed cookie.

export const ADMIN_COOKIE = "esw_editor";
export const ADMIN_SESSION_SECONDS = 60 * 60 * 24 * 30;

function getSecret(): string | null {
  const secret = process.env.ADMIN_PUBLISH_SECRET?.trim();
  return secret && secret.length >= 16 ? secret : null;
}

export function isAdminConfigured(): boolean {
  return getSecret() !== null;
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function verifyAdminSecret(candidate: string): boolean {
  const secret = getSecret();
  if (!secret) return false;
  // Compare digests so the check takes the same time whatever the input length.
  return safeEqual(sign(candidate, "compare"), sign(secret, "compare"));
}

export function createAdminToken(now = Date.now()): string {
  const secret = getSecret();
  if (!secret) throw new Error("ADMIN_PUBLISH_SECRET no está configurado.");
  const expiresAt = Math.floor(now / 1000) + ADMIN_SESSION_SECONDS;
  const payload = `editor.${expiresAt}`;
  return `${payload}.${sign(payload, secret)}`;
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie");
  if (!header) return null;
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}

export function isAdminRequest(request: Request): boolean {
  const secret = getSecret();
  const token = readCookie(request, ADMIN_COOKIE);
  if (!secret || !token) return false;
  const lastDot = token.lastIndexOf(".");
  if (lastDot < 0) return false;
  const payload = token.slice(0, lastDot);
  const signature = token.slice(lastDot + 1);
  if (!safeEqual(signature, sign(payload, secret))) return false;
  const expiresAt = Number(payload.split(".")[1]);
  return Number.isFinite(expiresAt) && expiresAt > Date.now() / 1000;
}

/**
 * Server-issued signatures prove an asset came from this app (e.g. a cover the
 * image model generated here) rather than from an arbitrary upload.
 */
export function signContent(scope: string, value: string): string | undefined {
  const secret = getSecret();
  if (!secret) return undefined;
  const digest = createHash("sha256").update(value).digest("base64url");
  return sign(`${scope}:${digest}`, secret);
}

export function verifyContentSignature(scope: string, value: string, signature: unknown): boolean {
  if (typeof signature !== "string" || !signature) return false;
  const expected = signContent(scope, value);
  return Boolean(expected) && safeEqual(signature, expected!);
}

/** Rejects cross-site requests to state-changing endpoints (defence in depth on top of SameSite). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return request.headers.get("sec-fetch-site") !== "cross-site";
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function adminCookieHeader(token: string | null): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return token
    ? `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${ADMIN_SESSION_SECONDS}${secure}`
    : `${ADMIN_COOKIE}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}
