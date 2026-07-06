import Link from "next/link";
import type { ReactNode } from "react";

/** Moldura das telas de cadastro/login: card estilo "arquivo de roteiro". */
export function MolduraAuth({
  arquivo,
  titulo,
  subtitulo,
  children,
  rodape,
}: {
  /** Nome mostrado na barra do card, ex.: "cadastro.txt" */
  arquivo: string;
  titulo: ReactNode;
  subtitulo: string;
  children: ReactNode;
  rodape: ReactNode;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2">
        <span
          aria-hidden
          className="rec-pulso inline-block size-2.5 rounded-full bg-rec"
        />
        <span className="font-display text-xl tracking-wide">GANCHO</span>
      </Link>

      <div className="w-full max-w-md rounded-lg border border-tinta/15 bg-papel-card shadow-[6px_6px_0_0_rgba(19,18,16,0.12)]">
        <div className="flex items-center justify-between border-b border-tinta/10 px-5 py-2.5">
          <p className="font-mono text-xs text-tinta-suave">{arquivo}</p>
          <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-rec">
            <span
              aria-hidden
              className="rec-pulso inline-block size-2 rounded-full bg-rec"
            />
            Rec
          </p>
        </div>

        <div className="px-5 py-7 sm:px-7">
          <h1 className="font-display text-3xl tracking-tight sm:text-4xl">
            {titulo}
          </h1>
          <p className="mt-2 leading-relaxed text-tinta-suave">{subtitulo}</p>
          <div className="mt-7">{children}</div>
        </div>
      </div>

      <p className="mt-6 text-sm text-tinta-suave">{rodape}</p>
    </main>
  );
}
