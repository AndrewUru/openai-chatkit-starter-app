import { z } from "zod";

export const editorialStreamSchema = z.object({
  article_html: z
    .string()
    .describe("Artículo completo en HTML semántico, con un único elemento h1."),
  cover_prompt: z
    .string()
    .describe(
      "Dirección visual para una portada social horizontal, comenzando por TEXTO EN PORTADA: y un titular de 3 a 7 palabras."
    ),
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
