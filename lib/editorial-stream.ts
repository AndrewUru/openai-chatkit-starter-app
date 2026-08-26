import { z } from "zod";

export const editorialStreamSchema = z.object({
  article_html: z
    .string()
    .describe("Artículo completo en HTML semántico, con un único elemento h1."),
  cover_prompt: z
    .string()
    .describe("Dirección visual independiente para una portada horizontal."),
});

export type EditorialStreamPackage = z.infer<typeof editorialStreamSchema>;

export type EditorialStreamEvent =
  | {
      type: "partial";
      data: Partial<EditorialStreamPackage>;
    }
  | {
      type: "done";
      data: EditorialStreamPackage;
    }
  | {
      type: "error";
      message: string;
    };
