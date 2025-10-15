"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const NAV_LINKS = [
  { href: "/", label: "Inicio" },
  { href: "/flujo", label: "Flujo" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);

  const toggleMenu = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeMenu = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <header className="relative z-20">
      <nav className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 lg:px-12">
        <Link
          href="/"
          className="text-sm font-semibold uppercase tracking-[0.32em] text-emerald-200 transition hover:text-emerald-100"
          onClick={closeMenu}
        >
          El Salto Web x ChatKit
        </Link>

        <div className="hidden items-center gap-7 md:flex">
          {NAV_LINKS.map((item) =>
            item.href.startsWith("#") ? (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="text-sm font-medium text-slate-300 transition hover:text-emerald-200"
              >
                {item.label}
              </a>
            ) : (
              <Link
                key={item.href}
                href={item.href}
                onClick={closeMenu}
                className="text-sm font-medium text-slate-300 transition hover:text-emerald-200"
              >
                {item.label}
              </Link>
            )
          )}
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/docs"
            className="hidden rounded-full border border-emerald-400/60 bg-emerald-400/20 px-4 py-2 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white md:inline-flex"
            onClick={closeMenu}
          >
            Documentacion
          </Link>

          <button
            type="button"
            onClick={toggleMenu}
            aria-expanded={isOpen}
            aria-controls="mobile-nav"
            className="inline-flex h-11 w-11 flex-col items-center justify-center gap-1 rounded-xl border border-slate-700/70 bg-slate-900/70 text-slate-200 transition hover:border-emerald-400/60 hover:text-emerald-200 md:hidden"
            aria-label={
              isOpen ? "Cerrar menu de navegacion" : "Abrir menu de navegacion"
            }
          >
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-transform duration-200 ${
                isOpen ? "translate-y-1.5 rotate-45" : ""
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-opacity duration-200 ${
                isOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`block h-0.5 w-6 rounded-full bg-current transition-transform duration-200 ${
                isOpen ? "-translate-y-1.5 -rotate-45" : ""
              }`}
            />
          </button>
        </div>
      </nav>

      <div
        id="mobile-nav"
        className={`mx-auto w-full max-w-6xl px-6 transition-all duration-200 md:hidden lg:px-12 ${
          isOpen
            ? "pointer-events-auto translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-3 opacity-0"
        }`}
      >
        <div className="mb-4 overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 shadow-2xl shadow-emerald-500/10 backdrop-blur">
          <div className="flex flex-col gap-2 p-6">
            {NAV_LINKS.map((item) =>
              item.href.startsWith("#") ? (
                <a
                  key={`mobile-${item.href}`}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-100"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  key={`mobile-${item.href}`}
                  href={item.href}
                  onClick={closeMenu}
                  className="rounded-2xl border border-transparent px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-emerald-400/40 hover:bg-emerald-500/10 hover:text-emerald-100"
                >
                  {item.label}
                </Link>
              )
            )}
            <Link
              href="/docs"
              onClick={closeMenu}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-400/50 bg-emerald-400/10 px-4 py-3 text-sm font-semibold text-emerald-100 transition hover:border-emerald-300 hover:text-white"
            >
              Documentacion {"->"}
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
