import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio IA – ChatKit Demo",
  description:
    "Explora mi automatización con ChatKit de OpenAI y genera contenido con inteligencia artificial.",
  openGraph: {
    title: "Laboratorio IA – ChatKit Demo",
    description:
      "Explora mi automatización con ChatKit de OpenAI y genera contenido con inteligencia artificial.",
    url: "https://elsaltoweb.es/laboratorio-ia/",
    siteName: "El Salto Web",
    images: [
      {
        url: "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
        width: 1200,
        height: 630,
        alt: "Laboratorio IA – ChatKit Demo",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Laboratorio IA – ChatKit Demo",
    description:
      "Explora mi automatización con ChatKit de OpenAI y genera contenido con inteligencia artificial.",
    images: [
      "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">{children}</body>
    </html>
  );
}
