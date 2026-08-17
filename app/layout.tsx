import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio Codex | El Salto Web",
  description:
    "Una experiencia interactiva para convertir una necesidad real en un plan para crear, probar y entregar una aplicación con Codex.",
  openGraph: {
    title: "Laboratorio Codex | El Salto Web",
    description:
      "Gira la ruleta y convierte una idea en un plan concreto para construir una aplicación con Codex.",
    url: "https://elsaltoweb.es/laboratorio-ia/",
    siteName: "El Salto Web",
    images: [
      {
        url: "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
        width: 1200,
        height: 630,
        alt: "Laboratorio para crear aplicaciones con Codex de El Salto Web",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Laboratorio Codex | El Salto Web",
    description:
      "Diseña el alcance, la implementación y las pruebas de tu próxima aplicación con Codex.",
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
