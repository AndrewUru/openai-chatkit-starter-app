export const runtime = "nodejs";

type PublishRequestBody = {
  title?: string;
  content: string;
  status?: "publish" | "draft" | "pending";
};

const DEFAULT_STATUS: PublishRequestBody["status"] = "draft";

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as PublishRequestBody | null;

  if (!body || typeof body.content !== "string" || !body.content.trim()) {
    return new Response(JSON.stringify({ error: "Missing content payload." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const username = process.env.WORDPRESS_USERNAME?.trim();
  const appPassword = process.env.WORDPRESS_APP_PASSWORD?.trim();
  const baseUrl = process.env.WORDPRESS_BASE_URL?.trim()?.replace(/\/+$/, "");

  if (!username || !appPassword || !baseUrl) {
    return new Response(
      JSON.stringify({
        error:
          "Missing WordPress configuration. Set WORDPRESS_USERNAME, WORDPRESS_APP_PASSWORD and WORDPRESS_BASE_URL.",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : deriveTitleFromContent(body.content);
  const contentHtml = toHtml(body.content);

  const authHeader = `Basic ${Buffer.from(`${username}:${appPassword}`).toString(
    "base64"
  )}`;

  const response = await fetch(`${baseUrl}/wp-json/wp/v2/posts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: authHeader,
    },
    body: JSON.stringify({
      title,
      content: contentHtml,
      status: body.status ?? DEFAULT_STATUS,
    }),
  });

  if (!response.ok) {
    const detailText = await response.text().catch(() => "");
    let parsedDetail: unknown = detailText;
    let message = detailText || "Unknown error";

    if (detailText) {
      try {
        const json = JSON.parse(detailText) as {
          message?: string;
        };
        if (json && typeof json.message === "string") {
          message = json.message;
        }
        parsedDetail = json;
      } catch {
        parsedDetail = detailText;
      }
    }

    return new Response(
      JSON.stringify({
        error: `WordPress returned ${response.status}`,
        message,
        detail: parsedDetail,
      }),
      {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const json = await response.json().catch(() => ({}));

  return new Response(JSON.stringify({ post: json }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

function deriveTitleFromContent(content: string): string {
  const lines = content.split("\n");
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      return line.replace(/^#\s+/, "").trim();
    }
    if (line.startsWith("## ")) {
      return line.replace(/^##\s+/, "").trim();
    }
    return line;
  }
  return "Articulo generado";
}

function toHtml(content: string): string {
  const lines = content.split("\n");
  const htmlChunks: string[] = [];
  let inList = false;

  const closeListIfNeeded = () => {
    if (inList) {
      htmlChunks.push("</ul>");
      inList = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      closeListIfNeeded();
      continue;
    }

    if (line.startsWith("# ")) {
      closeListIfNeeded();
      htmlChunks.push(`<h1>${escapeHtml(line.slice(2).trim())}</h1>`);
      continue;
    }

    if (line.startsWith("## ")) {
      closeListIfNeeded();
      htmlChunks.push(`<h2>${escapeHtml(line.slice(3).trim())}</h2>`);
      continue;
    }

    if (line.startsWith("- ")) {
      if (!inList) {
        htmlChunks.push("<ul>");
        inList = true;
      }
      htmlChunks.push(`<li>${escapeHtml(line.slice(2).trim())}</li>`);
      continue;
    }

    closeListIfNeeded();
    htmlChunks.push(`<p>${escapeHtml(line)}</p>`);
  }

  closeListIfNeeded();

  return htmlChunks.join("");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
