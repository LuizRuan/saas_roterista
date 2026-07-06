import type { ReactNode } from "react";

/** Versão <button> do Botao (que é um Link) — para submit de formulários. */
export function BotaoEnviar({
  enviando,
  rotuloEnviando,
  children,
}: {
  enviando: boolean;
  rotuloEnviando: string;
  children: ReactNode;
}) {
  return (
    <button
      type="submit"
      disabled={enviando}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-tinta px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-papel transition-colors hover:bg-tinta-suave disabled:cursor-wait disabled:opacity-60"
    >
      {enviando && (
        <span
          aria-hidden
          className="rec-pulso inline-block size-2 rounded-full bg-rec"
        />
      )}
      {enviando ? rotuloEnviando : children}
    </button>
  );
}
