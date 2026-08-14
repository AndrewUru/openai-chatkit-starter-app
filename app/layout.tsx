import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Laboratorio de Futuros | El Salto Web",
  description:
    "Una experiencia interactiva para imaginar futuros humanos con tecnología e inteligencia artificial.",
  openGraph: {
    title: "Laboratorio de Futuros | El Salto Web",
    description:
      "Gira la ruleta, aporta tu mirada y crea una historia sobre nuestros futuros con inteligencia artificial.",
    url: "https://elsaltoweb.es/laboratorio-ia/",
    siteName: "El Salto Web",
    images: [
      {
        url: "https://elsaltoweb.es/wp-content/uploads/2025/10/laboratorio-ia.webp",
        width: 1200,
        height: 630,
        alt: "Laboratorio de Futuros de El Salto Web",
      },
    ],
    locale: "es_ES",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Laboratorio de Futuros | El Salto Web",
    description:
      "Una experiencia interactiva para imaginar futuros humanos con inteligencia artificial.",
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
