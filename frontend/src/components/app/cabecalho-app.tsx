"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Usuario } from "@/lib/api";

/** Item da navegação: link normal ou o item da página atual (span sublinhado). */
export type ItemNavApp =
  | { rotulo: string; href: string; ativo?: false }
  | { rotulo: string; ativo: true };

/**
 * Cabeçalho compartilhado das telas logadas (dashboard, designer, roteiros, admin).
 * `badgeAdmin` controla onde o selo "Admin" aparece:
 * - "nav-condicional": na nav, só se o usuário for admin (dashboard)
 * - "logo-sempre": junto ao logo, sempre visível (telas do painel admin)
 * - "nenhum": sem selo
 */
export function CabecalhoApp({
  usuario,
  saindo,
  aoSair,
  itensNav,
  badgeAdmin = "nav-condicional",
  textoUsuario,
}: {
  usuario: Usuario | null;
  saindo: boolean;
  aoSair: () => void;
  itensNav: ItemNavApp[];
  badgeAdmin?: "nav-condicional" | "logo-sempre" | "nenhum";
  textoUsuario?: ReactNode;
}) {
  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "Criador";

  const logo = (
    <Link href="/" className="flex items-center gap-2">
      <span
        aria-hidden
        className="rec-pulso inline-block size-2.5 rounded-full bg-rec"
      />
      <span className="font-display text-xl tracking-wide">GANCHO</span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {badgeAdmin === "logo-sempre" ? (
          <div className="flex items-center gap-4">
            {logo}
            <span className="rounded-sm bg-rec px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-papel">
              Admin
            </span>
          </div>
        ) : (
          logo
        )}

        <nav className="hidden items-center gap-6 sm:flex">
          {itensNav.map((item) =>
            "href" in item ? (
              <Link
                key={item.rotulo}
                href={item.href}
                className="font-mono text-xs uppercase tracking-widest text-cinza transition-colors hover:text-tinta"
              >
                {item.rotulo}
              </Link>
            ) : (
              <span
                key={item.rotulo}
                className="font-mono text-xs uppercase tracking-widest text-tinta underline decoration-marca decoration-2 underline-offset-4"
              >
                {item.rotulo}
              </span>
            )
          )}
          {badgeAdmin === "nav-condicional" && usuario?.papel === "admin" && (
            <Link
              href="/admin"
              className="flex items-center gap-1.5 rounded-sm bg-rec px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-papel transition-opacity hover:opacity-80"
            >
              Admin
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-4">
          <p className="hidden font-mono text-xs uppercase tracking-widest text-tinta-suave sm:block">
            {textoUsuario ?? (
              <>
                {primeiroNome} · plano{" "}
                <span className="font-semibold text-tinta">
                  {usuario?.plano}
                </span>
              </>
            )}
          </p>
          <button
            type="button"
            onClick={aoSair}
            disabled={saindo}
            className="font-mono text-xs uppercase tracking-widest text-tinta-suave underline decoration-marca decoration-2 underline-offset-4 hover:text-tinta disabled:opacity-60"
          >
            {saindo ? "Saindo…" : "Sair"}
          </button>
        </div>
      </div>
    </header>
  );
}
