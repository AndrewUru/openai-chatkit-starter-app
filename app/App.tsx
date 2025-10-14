"use client";

import { ArticleGenerator } from "@/components/ArticleGenerator";
import { useColorScheme } from "@/hooks/useColorScheme";

export default function App() {
  const { scheme } = useColorScheme();
  const isDark = scheme === "dark";

  return (
    <main
      className={`flex min-h-screen flex-col items-center justify-center transition-colors ${
        isDark ? "bg-slate-950" : "bg-slate-100"
      }`}
    >
      <div className="mx-auto w-full max-w-4xl px-6 py-12">
        <ArticleGenerator />
      </div>
    </main>
  );
}
