import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Crea una publicación con IA | El Salto Web",
  description:
    "Convierte una idea, un tema o una experiencia en un artículo listo para revisar y publicar en WordPress.",
  openGraph: {
    title: "Una idea entra. Un artículo sale | El Salto Web",
    description:
      "Crea una publicación completa a partir de una sola idea y decide cuándo enviarla a WordPress.",
    url: "https://elsaltoweb.es/laboratorio-ia/",
    siteName: "El Salto Web",
    images: [
      {
        url: "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
        width: 1200,
        height: 630,
        alt: "Laboratorio de IA editorial de El Salto Web",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Una idea entra. Un artículo sale | El Salto Web",
    description:
      "Convierte una idea en una publicación lista para revisar y enviar a WordPress.",
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
