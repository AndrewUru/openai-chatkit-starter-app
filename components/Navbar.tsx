"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const NAV_LINKS = [
  { href: "#experiencia", label: "Crear publicación" },
  { href: "/flujo", label: "Cómo funciona" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const closeMenu = useCallback(() => setIsOpen(false), []);

  return (
    <header className="relative z-30 border-b border-black/20">
      <nav className="mx-auto flex w-full max-w-[1440px] items-center justify-between px-5 py-5 sm:px-8 lg:px-14">
        <Link
          href="/"
          onClick={closeMenu}
          className="flex items-center gap-3 text-sm font-black uppercase tracking-[-0.02em]"
        >
          <span className="grid h-8 w-8 place-items-center rounded-full bg-[#11110f] text-xs text-[#d7ff52]">
            ES
          </span>
          <span>El Salto Web · AI Lab</span>
        </Link>

        <div className="hidden items-center gap-8 md:flex">
          {NAV_LINKS.map((item) =>
            item.href.startsWith("#") ? (
              <a key={item.href} href={item.href} className="nav-link">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="nav-link">
                {item.label}
              </Link>
            )
          )}
          <Link href="/docs" className="rounded-full bg-[#11110f] px-5 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-[#f4f0e6] transition hover:bg-[#4468ff]">
            Documentación ↗
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          aria-expanded={isOpen}
          aria-controls="mobile-nav"
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
          className="grid h-11 w-11 place-items-center rounded-full border border-black md:hidden"
        >
          <span className="text-xl">{isOpen ? "×" : "≡"}</span>
        </button>
      </nav>

      {isOpen ? (
        <div id="mobile-nav" className="absolute inset-x-0 top-full border-b border-black bg-[#d7ff52] p-5 md:hidden">
          <div className="flex flex-col gap-2">
            {NAV_LINKS.map((item) =>
              item.href.startsWith("#") ? (
                <a key={item.href} href={item.href} onClick={closeMenu} className="border-b border-black/20 py-4 font-serif text-3xl">
                  {item.label}
                </a>
              ) : (
                <Link key={item.href} href={item.href} onClick={closeMenu} className="border-b border-black/20 py-4 font-serif text-3xl">
                  {item.label}
                </Link>
              )
            )}
            <Link href="/docs" onClick={closeMenu} className="py-4 font-serif text-3xl">
              Documentación ↗
            </Link>
          </div>
        </div>
      ) : null}
    </header>
  );
}
