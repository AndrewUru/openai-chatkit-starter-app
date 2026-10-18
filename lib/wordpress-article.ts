// Shared template for generated publications: the app preview and the
// WordPress post render the same markup and the same inline styles.

const LAB_URL = "https://elsaltoweb.es/laboratorio-ia/";
const COVER_SLOT = "<!--ia-cover-slot-->";
const WORDS_PER_MINUTE = 220;

export const ARTICLE_STYLES = `
<style>
.ia-generated {
  --ia-ink: #f1f0e9;
  --ia-body: #cdccc4;
  --ia-muted: #8e8d86;
  --ia-line: rgba(241,240,233,.12);
  --ia-accent: #d7ff52;
  --ia-serif: "Iowan Old Style", "Palatino Linotype", Palatino, "Book Antiqua", Georgia, serif;
  --ia-sans: Roboto, "Segoe UI", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
  --ia-mono: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  box-sizing: border-box;
  max-width: 44rem;
  margin: 2rem auto;
  padding: 0;
  border: 0;
  background: transparent;
  box-shadow: none;
  color: var(--ia-body);
  font-family: var(--ia-sans);
  overflow-wrap: break-word;
  color-scheme: dark;
  counter-reset: ia-section;
}
.ia-generated *, .ia-generated *::before, .ia-generated *::after { box-sizing: border-box; }
.ia-generated::before, .ia-generated::after { content: none; }
.ia-generated ::selection { background: rgba(215,255,82,.3); color: #fff; }

.ia-generated .ia-kicker {
  display: flex;
  align-items: center;
  gap: .6rem;
  margin: 0 0 1.4rem;
  color: var(--ia-accent);
  font: 700 .72rem/1 var(--ia-mono);
  letter-spacing: .2em;
  text-transform: uppercase;
}
.ia-generated .ia-kicker::before {
  width: .5rem;
  height: .5rem;
  border-radius: 50%;
  background: currentColor;
  box-shadow: 0 0 0 .3rem rgba(215,255,82,.15);
  content: "";
}
.ia-generated h1 {
  margin: 0;
  color: var(--ia-ink);
  font: 600 clamp(2.3rem, 5.4vw, 4rem)/1.05 var(--ia-serif);
  letter-spacing: -.025em;
  text-wrap: balance;
}
.ia-generated .ia-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: .4rem 1.1rem;
  margin: 1.6rem 0 0;
  padding: 1rem 0 0;
  border-top: 1px solid var(--ia-line);
  color: var(--ia-muted);
  font: 500 .8rem/1.4 var(--ia-sans);
  letter-spacing: .02em;
}
.ia-generated .ia-meta > span + span::before,
.ia-generated .ia-meta > time + span::before {
  margin-right: 1.1rem;
  color: var(--ia-line);
  content: "/";
}
.ia-generated .ia-meta .ia-badge {
  border: 1px solid rgba(215,255,82,.35);
  border-radius: 999px;
  padding: .3rem .7rem;
  color: var(--ia-accent);
  font-size: .72rem;
  font-weight: 700;
}
.ia-generated .ia-meta .ia-badge::before { content: none !important; }

.ia-cover, .ia-generated .ia-cover {
  position: relative;
  left: 50%;
  width: min(66rem, calc(100vw - 2.5rem));
  max-width: none;
  margin: 2.75rem 0 3.25rem;
  transform: translateX(-50%);
}
.ia-cover img {
  display: block;
  width: 100%;
  height: auto;
  margin: 0;
  border-radius: 1rem;
  box-shadow: 0 40px 80px -40px rgba(0,0,0,.9), 0 0 0 1px var(--ia-line, rgba(241,240,233,.12));
}
.ia-cover figcaption {
  margin-top: .8rem;
  color: #8e8d86;
  font: .8rem/1.5 Roboto, system-ui, sans-serif;
  text-align: right;
}
.ia-cover a { color: #d7ff52; }

.ia-generated > p:first-of-type {
  color: var(--ia-ink);
  font: 400 clamp(1.2rem, 2.2vw, 1.4rem)/1.6 var(--ia-serif);
}
.ia-generated p {
  margin: 1.15rem 0;
  color: var(--ia-body);
  font-size: 1.125rem;
  line-height: 1.8;
  text-wrap: pretty;
}
.ia-generated section { margin-top: 3.5rem; }
.ia-generated h2 {
  margin: 3.5rem 0 1.2rem;
  padding: 0;
  color: var(--ia-ink);
  font: 600 clamp(1.6rem, 3.2vw, 2.15rem)/1.18 var(--ia-serif);
  letter-spacing: -.015em;
  text-wrap: balance;
}
.ia-generated section > h2:first-child { margin-top: 0; }
.ia-generated :not(.ia-sources) > h2::before {
  display: block;
  margin-bottom: .75rem;
  color: var(--ia-accent);
  content: counter(ia-section, decimal-leading-zero);
  counter-increment: ia-section;
  font: 700 .72rem/1 var(--ia-mono);
  letter-spacing: .2em;
}
.ia-generated h3 {
  margin: 2.25rem 0 .75rem;
  color: var(--ia-ink);
  font: 700 1.15rem/1.35 var(--ia-sans);
}
.ia-generated strong { color: var(--ia-ink); font-weight: 650; }
.ia-generated em { font-style: italic; }
.ia-generated a {
  color: var(--ia-ink);
  text-decoration: underline;
  text-decoration-color: rgba(215,255,82,.55);
  text-decoration-thickness: 1px;
  text-underline-offset: .22em;
  transition: color 150ms ease, text-decoration-color 150ms ease;
}
.ia-generated a:hover { color: var(--ia-accent); text-decoration-color: currentColor; }
.ia-generated a:focus-visible, .ia-cover a:focus-visible { outline: 2px solid #d7ff52; outline-offset: 3px; border-radius: 2px; }

.ia-generated ul, .ia-generated ol { margin: 1.5rem 0; padding: 0; list-style: none; }
.ia-generated li {
  position: relative;
  margin: 0 0 .85rem;
  padding-left: 1.75rem;
  color: var(--ia-body);
  font-size: 1.125rem;
  line-height: 1.75;
}
.ia-generated ul > li::before {
  position: absolute;
  top: .85em;
  left: .2rem;
  width: .75rem;
  height: 2px;
  background: var(--ia-accent);
  content: "";
}
.ia-generated ol { counter-reset: ia-step; }
.ia-generated ol > li { padding-left: 3rem; counter-increment: ia-step; }
.ia-generated ol > li::before {
  position: absolute;
  top: .1em;
  left: 0;
  display: grid;
  width: 2rem;
  height: 2rem;
  place-items: center;
  border: 1px solid rgba(215,255,82,.45);
  border-radius: 50%;
  color: var(--ia-accent);
  content: counter(ia-step);
  font: 700 .8rem/1 var(--ia-mono);
}

.ia-generated blockquote {
  position: relative;
  margin: 3rem 0;
  padding: 1.75rem 0 1.75rem 2.75rem;
  border: 0;
  border-block: 1px solid var(--ia-line);
  background: transparent;
}
.ia-generated blockquote::before {
  position: absolute;
  top: 1.1rem;
  left: 0;
  color: var(--ia-accent);
  content: "\\201C";
  font: 700 3.75rem/1 var(--ia-serif);
}
.ia-generated blockquote p {
  margin: 0;
  color: var(--ia-ink);
  font: italic 400 clamp(1.35rem, 2.6vw, 1.7rem)/1.45 var(--ia-serif);
}

.ia-generated figure { margin: 2.5rem auto; }
.ia-generated figcaption { margin-top: .75rem; color: var(--ia-muted); font-size: .85rem; }
.ia-generated img { display: block; max-width: 100%; height: auto; margin: 2.5rem auto; border-radius: .75rem; }
.ia-generated hr { margin: 3rem 0; border: 0; height: 1px; background: var(--ia-line); }
.ia-generated table { display: block; max-width: 100%; overflow-x: auto; margin: 2.5rem 0; border-collapse: collapse; font-size: .95rem; }
.ia-generated th, .ia-generated td { padding: .8rem 1rem; border-bottom: 1px solid var(--ia-line); color: var(--ia-body); text-align: left; }
.ia-generated th { color: var(--ia-ink); font-weight: 650; }

.ia-generated .ia-sources {
  margin-top: 4.5rem;
  padding: 1.6rem 1.75rem;
  border: 1px solid var(--ia-line);
  border-radius: 1rem;
  background: rgba(241,240,233,.025);
}
.ia-generated .ia-sources h2 {
  margin: 0 0 1.1rem;
  color: var(--ia-muted);
  font: 700 .74rem/1 var(--ia-mono);
  letter-spacing: .2em;
  text-transform: uppercase;
}
.ia-generated .ia-sources ul, .ia-generated .ia-sources ol { margin: 0; }
.ia-generated .ia-sources li { margin-bottom: .6rem; padding-left: 1.5rem; color: var(--ia-muted); font-size: .92rem; line-height: 1.55; }
.ia-generated .ia-sources li::before { display: block; content: "\\2197"; top: 0; left: 0; width: auto; height: auto; border: 0; background: none; color: var(--ia-accent); font: 400 .85rem/1.55 var(--ia-sans); }
.ia-generated .ia-sources a { color: var(--ia-body); }

.ia-generated .ia-colophon {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem 2rem;
  margin-top: 3.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--ia-line);
  color: var(--ia-muted);
  font-size: .88rem;
  line-height: 1.6;
}
.ia-generated .ia-colophon > span { max-width: 32rem; }
.ia-generated .ia-colophon a {
  flex-shrink: 0;
  border-radius: 999px;
  background: var(--ia-accent);
  padding: .65rem 1.1rem;
  color: #11110f;
  font-size: .78rem;
  font-weight: 800;
  letter-spacing: .06em;
  text-decoration: none;
  text-transform: uppercase;
}
.ia-generated .ia-colophon a:hover { background: #fff; color: #11110f; }

@media (max-width: 680px) {
  .ia-generated { margin: 1.5rem auto; }
  .ia-generated p, .ia-generated li { font-size: 1.06rem; }
  .ia-generated blockquote { padding-left: 2.1rem; }
  .ia-generated blockquote::before { font-size: 3rem; }
  .ia-cover, .ia-generated .ia-cover { margin: 2rem 0 2.25rem; }
  .ia-cover img { border-radius: .75rem; }
  .ia-generated .ia-sources { padding: 1.25rem; }
}

/* WordPress single-post layout, scoped to generated publications. */
body.single-post:has(main.site-main .ia-generated) {
  background: #0e0f0f;
  background-image: none;
  color: #cdccc4;
}
body.single-post main.site-main:has(.ia-generated) {
  box-sizing: border-box;
  width: 100%;
  max-width: none;
  margin: 0;
  padding: 0;
  background: radial-gradient(60rem 32rem at 50% 0, rgba(215,255,82,.06), transparent 70%), #0e0f0f;
  color: #cdccc4;
}
body.single-post main.site-main .page-content:has(.ia-generated) {
  box-sizing: border-box;
  width: 100%;
  max-width: 1120px;
  margin: 0 auto;
  padding: 9rem 1.25rem 6rem;
  background: transparent;
  overflow-x: clip;
}
body.single-post main.site-main .page-content .ia-generated { margin: 0 auto; }
@supports (animation-timeline: scroll()) {
  body.single-post:has(main.site-main .ia-generated)::after {
    position: fixed;
    inset: 0 0 auto;
    z-index: 100000;
    height: 3px;
    background: linear-gradient(90deg, #4468ff, #d7ff52);
    content: "";
    transform: scaleX(0);
    transform-origin: left;
    animation: ia-reading-progress linear both;
    animation-timeline: scroll(root);
    pointer-events: none;
  }
  @keyframes ia-reading-progress { to { transform: scaleX(1); } }
}
@media (max-width: 680px) {
  body.single-post main.site-main .page-content:has(.ia-generated) { padding: 7rem 1.25rem 4rem; }
}
</style>
`.trim();

function formatSpanishDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Madrid",
  }).format(date);
}

export function countWords(html: string): number {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&[^;\s]+;/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function readingTimeLabel(html: string): string {
  const minutes = Math.max(1, Math.round(countWords(html) / WORDS_PER_MINUTE));
  return `${minutes} min de lectura`;
}

function metaRow(html: string, date: Date): string {
  // Single line on purpose: WordPress' wpautop can turn newlines into <br>.
  return `<div class="ia-meta"><time class="ia-date" datetime="${date.toISOString()}">${formatSpanishDate(date)}</time><span class="ia-reading-time">${readingTimeLabel(html)}</span><span class="ia-badge">Creado con IA · Revisado por una persona</span></div>`;
}

/** The model is asked for flat <section>s; repair missing or stray closing tags. */
function normalizeSections(html: string): string {
  if (!/<section[\s>]/i.test(html)) return html;
  let opened = 0;
  const balanced = html
    .replace(/<\/section>/gi, "")
    .replace(/<section(\s[^>]*)?>/gi, (match) => (opened++ > 0 ? `</section>\n${match}` : match));
  return `${balanced.trimEnd()}\n</section>`;
}

function markSources(html: string): string {
  return html.replace(
    /<section(\s[^>]*)?>(\s*<h2[^>]*>\s*(?:Fuentes consultadas|Fuentes|Referencias)\s*<\/h2>)/i,
    (_match, attributes = "", heading) => `<section class="ia-sources"${attributes}>${heading}`
  );
}

export function buildArticleDocument(articleHtml: string, date = new Date()): string {
  let body = articleHtml
    .trim()
    .replace(/^<article[^>]*>/i, "")
    .replace(/<\/article>$/i, "")
    .trim();
  body = markSources(normalizeSections(body));
  body = body.replace(/<h1[\s>]/i, (match) => `<div class="ia-kicker">Laboratorio IA · El Salto Web</div>\n${match}`);
  body = body.replace(/<\/h1>/i, (match) => `${match}\n${metaRow(body, date)}\n${COVER_SLOT}`);

  const colophon = `<aside class="ia-colophon"><span>Esta pieza nació en el Laboratorio IA de El Salto Web: la IA investigó y redactó, y una persona la revisó antes de publicarla.</span><a href="${LAB_URL}">Crea la tuya →</a></aside>`;

  return `${ARTICLE_STYLES}
<article class="ia-generated">
${body}
${colophon}
</article>`;
}

/** Refresh date and reading time at publish time: the draft may have been edited since. */
export function refreshArticleMeta(html: string, date = new Date()): string {
  return html
    .replace(
      /<time class="ia-date"[^>]*>[^<]*<\/time>/i,
      `<time class="ia-date" datetime="${date.toISOString()}">${formatSpanishDate(date)}</time>`
    )
    .replace(
      /<span class="ia-reading-time">[^<]*<\/span>/i,
      `<span class="ia-reading-time">${readingTimeLabel(html)}</span>`
    );
}

export function insertCoverFigure(html: string, figure: string): string {
  if (html.includes(COVER_SLOT)) return html.replace(COVER_SLOT, figure);
  if (/<\/h1>/i.test(html)) return html.replace(/<\/h1>/i, (match) => `${match}\n${figure}`);
  return /<\/style>/i.test(html)
    ? html.replace(/<\/style>/i, (match) => `${match}\n${figure}`)
    : `${figure}\n${html}`;
}

function decodeEntities(text: string): string {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

/** First paragraph after the title, trimmed to a meta-description length. */
export function extractExcerpt(html: string, maxLength = 160): string {
  const afterTitle = html.split(/<\/h1>/i)[1] ?? html;
  const paragraph = afterTitle.match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1];
  if (!paragraph) return "";
  const text = decodeEntities(paragraph.replace(/<[^>]*>/g, "")).replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  const cut = text.slice(0, maxLength - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.\s]+$/, "")}…`;
}
