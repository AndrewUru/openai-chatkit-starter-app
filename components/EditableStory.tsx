"use client";

import {
  FormEvent,
  MouseEvent as ReactMouseEvent,
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

type EditableStoryProps = {
  html: string;
  onChange: (html: string) => void;
  apiKey: string;
  disabled?: boolean;
  storyRef?: RefObject<HTMLDivElement | null>;
};

type ToolbarPosition = { top: number; left: number; placement: "above" | "below" };

type Toast =
  | { kind: "done"; message: string }
  | { kind: "error"; message: string };

const BLOCK_SELECTOR = "h1, h2, h3, p, li, blockquote";
const TRANSIENT_CLASSES = ["rewrite-flash", "rewrite-source"];
const REMOVED_ELEMENTS = "script, style, iframe, object, embed, link, meta, form, input, button";

const PRESETS = [
  { label: "Más corto", instruction: "Condénsalo aproximadamente a la mitad sin perder la idea principal." },
  { label: "Más concreto", instruction: "Hazlo más concreto y específico: sustituye generalidades por detalles precisos que ya estén en el artículo." },
  { label: "Añade un ejemplo", instruction: "Añade un ejemplo ilustrativo breve que aclare la idea. Preséntalo como ejemplo y no inventes datos, cifras ni nombres reales." },
  { label: "Más contundente", instruction: "Hazlo más directo y contundente, con frases más cortas y una postura más clara." },
  { label: "Más sencillo", instruction: "Explícalo de forma más sencilla, para alguien sin conocimientos previos del tema." },
];

function sanitizeFragment(raw: string): string {
  const cleaned = raw
    .replace(/^\s*```(?:html)?\s*/i, "")
    .replace(/\s*```\s*$/i, "");
  const template = document.createElement("template");
  template.innerHTML = cleaned;
  template.content.querySelectorAll(REMOVED_ELEMENTS).forEach((node) => node.remove());
  template.content.querySelectorAll("*").forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      if (name.startsWith("on") || (name === "href" && value.startsWith("javascript:"))) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return template.innerHTML;
}

function serializeStory(root: HTMLElement): string {
  const clone = root.cloneNode(true) as HTMLElement;
  clone.querySelectorAll(".rewrite-live").forEach((node) => node.remove());
  TRANSIENT_CLASSES.forEach((className) => {
    clone.querySelectorAll(`.${className}`).forEach((element) => {
      element.classList.remove(className);
      if (!element.getAttribute("class")) element.removeAttribute("class");
    });
  });
  return clone.innerHTML;
}

function selectedBlocks(scope: Element, range: Range): HTMLElement[] {
  const candidates = Array.from(scope.querySelectorAll<HTMLElement>(BLOCK_SELECTOR)).filter(
    (element) => range.intersectsNode(element) && element.textContent?.trim()
  );
  // Keep the outermost blocks only (a <p> inside a <blockquote> is rewritten with it).
  return candidates.filter(
    (element) => !candidates.some((other) => other !== element && other.contains(element))
  );
}

export function EditableStory({
  html,
  onChange,
  apiKey,
  disabled = false,
  storyRef,
}: EditableStoryProps) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string | null>(null);
  const rangeRef = useRef<Range | null>(null);
  const blocksRef = useRef<HTMLElement[]>([]);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<string[]>([]);
  const [position, setPosition] = useState<ToolbarPosition | null>(null);
  const [isRewriting, setIsRewriting] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const [historySize, setHistorySize] = useState(0);

  const setRoot = useCallback(
    (node: HTMLDivElement | null) => {
      rootRef.current = node;
      if (storyRef) storyRef.current = node;
    },
    [storyRef]
  );

  // The story DOM is edited in place, so React only writes it when html changes from outside.
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || html === lastHtmlRef.current) return;
    root.innerHTML = html;
    lastHtmlRef.current = html;
    // A new article arrived from outside: earlier undo steps no longer apply.
    historyRef.current = [];
    setHistorySize(0);
  }, [html]);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(null), toast.kind === "done" ? 9000 : 6000);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const closeToolbar = useCallback(() => {
    setPosition(null);
    setCustomInstruction("");
    rangeRef.current = null;
    blocksRef.current = [];
  }, []);

  const placeToolbar = useCallback(() => {
    const range = rangeRef.current;
    if (!range) return;
    const rect = range.getBoundingClientRect();
    if (!rect.width && !rect.height) return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    const placement = isTouch || rect.top < 140 ? "below" : "above";
    const half = Math.min(window.innerWidth - 32, 560) / 2;
    const center = rect.left + rect.width / 2;
    setPosition({
      top: placement === "above" ? rect.top - 12 : rect.bottom + 12,
      left: Math.min(Math.max(center, half + 16), window.innerWidth - half - 16),
      placement,
    });
  }, []);

  const readSelection = useCallback(() => {
    if (isRewriting) return;
    if (toolbarRef.current?.contains(document.activeElement)) return;
    const scope = rootRef.current?.querySelector(".ia-generated");
    const selection = window.getSelection();
    if (disabled || !scope || !selection || selection.isCollapsed || !selection.rangeCount) {
      closeToolbar();
      return;
    }
    const range = selection.getRangeAt(0);
    if (!scope.contains(range.commonAncestorContainer) || !selection.toString().trim()) {
      closeToolbar();
      return;
    }
    const blocks = selectedBlocks(scope, range);
    if (!blocks.length) {
      closeToolbar();
      return;
    }
    rangeRef.current = range.cloneRange();
    blocksRef.current = blocks;
    placeToolbar();
  }, [closeToolbar, disabled, isRewriting, placeToolbar]);

  useEffect(() => {
    let frame = 0;
    const onSelectionChange = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(readSelection);
    };
    document.addEventListener("selectionchange", onSelectionChange);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("selectionchange", onSelectionChange);
    };
  }, [readSelection]);

  useEffect(() => {
    if (!position) return undefined;
    const reposition = () => placeToolbar();
    window.addEventListener("scroll", reposition, { passive: true });
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition);
      window.removeEventListener("resize", reposition);
    };
  }, [placeToolbar, position]);

  const rewrite = useCallback(
    async (instruction: string) => {
      const root = rootRef.current;
      const blocks = blocksRef.current;
      if (!root || !blocks.length || isRewriting || !instruction.trim()) return;

      const previousHtml = serializeStory(root);
      const scope = root.querySelector(".ia-generated");
      const live = document.createElement(blocks[0].tagName === "LI" ? "li" : "div");
      live.className = "rewrite-live";
      live.setAttribute("aria-live", "polite");
      blocks[0].before(live);
      blocks.forEach((block) => block.classList.add("rewrite-source"));
      window.getSelection()?.removeAllRanges();

      const controller = new AbortController();
      abortRef.current = controller;
      setIsRewriting(true);
      setToast(null);

      const restore = () => {
        live.remove();
        blocks.forEach((block) => block.classList.remove("rewrite-source"));
      };

      try {
        const response = await fetch(`/api/rewrite?key=${encodeURIComponent(apiKey)}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            blocks_html: blocks.map((block) => block.outerHTML).join("\n"),
            instruction,
            article_context: scope?.textContent?.replace(/\s+/g, " ").trim() ?? "",
          }),
        });
        if (!response.ok || !response.body) {
          const detail = await response.text().catch(() => "");
          throw new Error(detail || "No se pudo reescribir el fragmento.");
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let text = "";
        let frame = 0;
        while (true) {
          const { done, value } = await reader.read();
          text += decoder.decode(value, { stream: !done });
          if (!frame) {
            frame = window.requestAnimationFrame(() => {
              frame = 0;
              live.innerHTML = sanitizeFragment(text);
            });
          }
          if (done) break;
        }
        window.cancelAnimationFrame(frame);

        const finalHtml = sanitizeFragment(text).trim();
        if (!finalHtml) throw new Error("La IA no devolvió texto para este fragmento.");

        const template = document.createElement("template");
        template.innerHTML = finalHtml;
        const inserted = Array.from(template.content.children);
        live.replaceWith(template.content);
        blocks.forEach((block) => block.remove());
        inserted.forEach((element) => element.classList.add("rewrite-flash"));

        const nextHtml = serializeStory(root);
        lastHtmlRef.current = nextHtml;
        historyRef.current.push(previousHtml);
        setHistorySize(historyRef.current.length);
        onChange(nextHtml);
        setToast({
          kind: "done",
          message: blocks.length > 1 ? `${blocks.length} bloques reescritos` : "Fragmento reescrito",
        });
      } catch (error) {
        restore();
        if (error instanceof DOMException && error.name === "AbortError") return;
        setToast({
          kind: "error",
          message: error instanceof Error ? error.message : "No se pudo reescribir el fragmento.",
        });
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        setIsRewriting(false);
        closeToolbar();
      }
    },
    [apiKey, closeToolbar, isRewriting, onChange]
  );

  const undo = useCallback(() => {
    const root = rootRef.current;
    const previous = historyRef.current.pop();
    setHistorySize(historyRef.current.length);
    setToast(null);
    if (!root || previous === undefined) return;
    root.innerHTML = previous;
    lastHtmlRef.current = previous;
    onChange(previous);
  }, [onChange]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        if (abortRef.current) abortRef.current.abort();
        else if (position) {
          window.getSelection()?.removeAllRanges();
          closeToolbar();
        }
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeToolbar, position]);

  const submitCustom = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void rewrite(customInstruction);
  };

  // Keep the selection highlighted while the reader clicks a preset.
  const keepSelection = (event: ReactMouseEvent) => {
    if (!(event.target instanceof HTMLInputElement)) event.preventDefault();
  };

  return (
    <>
      {!disabled ? (
        <p className="rewrite-hint">
          <span aria-hidden="true">✦</span> Selecciona cualquier fragmento del artículo para reescribirlo con IA
        </p>
      ) : null}

      <div ref={setRoot} className="generated-story" data-rewriting={isRewriting || undefined} />

      {position && !disabled ? (
        <div
          ref={toolbarRef}
          role="toolbar"
          aria-label="Reescribir la selección con IA"
          onMouseDown={keepSelection}
          className="rewrite-toolbar"
          data-placement={position.placement}
          style={{ top: position.top, left: position.left }}
        >
          {isRewriting ? (
            <div className="flex items-center gap-3 px-2 py-1">
              <span className="workflow-spinner rewrite-spinner" aria-hidden="true" />
              <span className="text-sm font-bold">Reescribiendo…</span>
              <button
                type="button"
                onClick={() => abortRef.current?.abort()}
                className="rewrite-chip"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => void rewrite(preset.instruction)}
                    className="rewrite-chip"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <form onSubmit={submitCustom} className="rewrite-form">
                <span aria-hidden="true" className="text-[#d7ff52]">✦</span>
                <input
                  value={customInstruction}
                  onChange={(event) => setCustomInstruction(event.target.value)}
                  placeholder="O escribe tu instrucción…"
                  aria-label="Instrucción personalizada para reescribir"
                  maxLength={400}
                />
                <button type="submit" disabled={!customInstruction.trim()} aria-label="Reescribir">
                  →
                </button>
              </form>
            </>
          )}
        </div>
      ) : null}

      {isRewriting && !position ? (
        <div className="rewrite-toast" role="status">
          <span className="workflow-spinner rewrite-spinner" aria-hidden="true" />
          Reescribiendo…
          <button type="button" onClick={() => abortRef.current?.abort()}>
            Cancelar
          </button>
        </div>
      ) : toast ? (
        <div className="rewrite-toast" role={toast.kind === "error" ? "alert" : "status"} data-kind={toast.kind}>
          {toast.message}
          {toast.kind === "done" && historySize > 0 ? (
            <button type="button" onClick={undo}>
              Deshacer
            </button>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
