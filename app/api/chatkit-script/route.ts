//C:\openai-chatkit-starter-app2\app\api\chatkit-script\route.ts

const DEFAULT_SOURCE = "http://localhost:3000/chatkit.js";

const FORWARDED_HEADERS: Record<string, string> = {
  accept:
    "text/javascript,application/javascript,application/ecmascript,application/x-ecmascript,*/*;q=0.1",
  "accept-encoding": "gzip, deflate, br",
  "accept-language": "en-US,en;q=0.9",
  "cache-control": "max-age=0",
  pragma: "no-cache",
  "sec-ch-ua":
    '"Chromium";v="121", "Not A(Brand";v="24", "Google Chrome";v="121"',
  "sec-ch-ua-mobile": "?0",
  "sec-ch-ua-platform": '"Windows"',
  "sec-fetch-dest": "script",
  "sec-fetch-mode": "no-cors",
  "sec-fetch-site": "cross-site",
  referer: "https://platform.openai.com/",
  "user-agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
};

const PASS_THROUGH_HEADERS = ["etag", "last-modified"] as const;

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<Response> {
  const upstreamUrl =
    process.env.CHATKIT_SCRIPT_SOURCE?.trim() || DEFAULT_SOURCE;

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstreamUrl, {
      headers: FORWARDED_HEADERS,
      // Revalidate every 5 minutes to avoid repeated CDN handshakes during dev.
      next: { revalidate: 300 },
    });
  } catch (error) {
    console.error("[chatkit-script] upstream fetch failed", error);
    return new Response("Failed to reach ChatKit script host.", {
      status: 502,
    });
  }

  if (!upstreamResponse.ok || !upstreamResponse.body) {
    const detail = `[chatkit-script] unexpected upstream status ${upstreamResponse.status}`;
    console.error(detail);
    return new Response("Unable to fetch ChatKit script.", {
      status: upstreamResponse.status || 502,
    });
  }

  const headers = new Headers();
  const contentType = upstreamResponse.headers.get("content-type") ?? "";

  if (contentType && !contentType.toLowerCase().includes("javascript")) {
    console.error(
      "[chatkit-script] upstream content-type mismatch",
      contentType
    );
    return new Response("Unexpected response while fetching ChatKit script.", {
      status: 502,
    });
  }

  headers.set("content-type", "application/javascript; charset=utf-8");

  for (const key of PASS_THROUGH_HEADERS) {
    const value = upstreamResponse.headers.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  const upstreamCacheControl = upstreamResponse.headers.get("cache-control");
  headers.set(
    "cache-control",
    upstreamCacheControl ?? "public, max-age=300, stale-while-revalidate=60"
  );

  return new Response(upstreamResponse.body, {
    status: 200,
    headers,
  });
}
