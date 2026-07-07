import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Layout para texto longo (Termos de Uso, Política de Privacidade) — diferente
 * de PaginaEmProducao (placeholder curto e centralizado), este é pensado pra
 * hierarquia de seções e leitura extensa.
 */
export function PaginaConteudoLegal({
  titulo,
  atualizadoEm,
  children,
}: {
  titulo: string;
  atualizadoEm: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-16 sm:py-24">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold uppercase tracking-widest text-tinta hover:text-tinta-suave"
      >
        <span aria-hidden className="inline-block size-2 rounded-full bg-rec" />
        GANCHO
      </Link>

      <h1 className="mt-8 font-display text-4xl tracking-tight sm:text-5xl">{titulo}</h1>
      <p className="mt-2 font-mono text-xs uppercase tracking-widest text-cinza">
        Atualizado em {atualizadoEm}
      </p>

      <div className="mt-6 rounded-md border border-rec/40 bg-rec/10 px-4 py-3 text-sm leading-relaxed text-tinta">
        <strong className="font-semibold">Rascunho preliminar.</strong> Este documento ainda não
        passou por revisão jurídica e pode mudar antes do lançamento oficial da plataforma.
      </div>

      <div className="mt-10 space-y-8">{children}</div>

      <Link
        href="/"
        className="mt-16 inline-block font-mono text-sm uppercase tracking-widest underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta-suave"
      >
        ← Voltar para o início
      </Link>
    </main>
  );
}

export function SecaoLegal({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xl tracking-tight text-tinta sm:text-2xl">{titulo}</h2>
      <div className="mt-2.5 space-y-3 leading-relaxed text-tinta-suave">{children}</div>
    </section>
  );
}
