import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio Web + IA | El Salto Web",
  description:
    "Una experiencia interactiva para imaginar productos, interfaces y agentes de inteligencia artificial para la web.",
  openGraph: {
    title: "Laboratorio Web + IA | El Salto Web",
    description:
      "Gira la ruleta y convierte una idea humana en un caso de desarrollo web con inteligencia artificial.",
    url: "https://elsaltoweb.es/laboratorio-ia/",
    siteName: "El Salto Web",
    images: [
      {
        url: "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
        width: 1200,
        height: 630,
        alt: "Laboratorio de desarrollo web e inteligencia artificial de El Salto Web",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Laboratorio Web + IA | El Salto Web",
    description:
      "Una experiencia interactiva para diseñar la próxima generación de productos web con inteligencia artificial.",
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
