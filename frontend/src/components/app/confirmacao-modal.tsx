"use client";

import { useEffect, useId, useRef, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

export interface OpcoesConfirmacao {
  titulo: string;
  descricao?: string;
  rotuloConfirmar?: string;
  rotuloCancelar?: string;
  /** true (padrão) pinta o botão de confirmar com a cor de perigo (rec). */
  perigo?: boolean;
}

/**
 * Modal de confirmação acessível — substitui o confirm() nativo.
 * Foco preso entre os dois botões, Esc/clique fora cancelam, foco inicial
 * no botão de cancelar (ação não destrutiva primeiro).
 * Prefira usar via hook `useConfirmacao` (hooks/use-confirmacao.tsx).
 */
export function ConfirmacaoModal({
  titulo,
  descricao,
  rotuloConfirmar = "Confirmar",
  rotuloCancelar = "Cancelar",
  perigo = true,
  onConfirmar,
  onCancelar,
}: OpcoesConfirmacao & {
  onConfirmar: () => void;
  onCancelar: () => void;
}) {
  // Sem guarda de montagem: este componente só existe depois de confirmar()
  // ser chamado a partir de um clique — nunca faz parte da árvore no SSR.
  const botaoCancelarRef = useRef<HTMLButtonElement>(null);
  const botaoConfirmarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();

  useEffect(() => {
    botaoCancelarRef.current?.focus();
  }, []);

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      onCancelar();
      return;
    }
    if (evento.key === "Tab") {
      // Só existem dois elementos focáveis — o trap alterna entre eles.
      evento.preventDefault();
      const alvo =
        document.activeElement === botaoCancelarRef.current
          ? botaoConfirmarRef.current
          : botaoCancelarRef.current;
      alvo?.focus();
    }
  }

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-tinta/40 px-4 backdrop-blur-sm"
      onClick={onCancelar}
      onKeyDown={aoTeclar}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={idTitulo}
        aria-describedby={descricao ? idDescricao : undefined}
        onClick={(evento) => evento.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-tinta/15 bg-papel-card p-6 shadow-[6px_6px_0_0_rgba(19,18,16,0.18)]"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
          [Confirmação]
        </p>
        <h2 id={idTitulo} className="mt-2 font-display text-2xl tracking-tight">
          {titulo}
        </h2>
        {descricao && (
          <p
            id={idDescricao}
            className="mt-2 text-sm leading-relaxed text-tinta-suave"
          >
            {descricao}
          </p>
        )}

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            ref={botaoCancelarRef}
            type="button"
            onClick={onCancelar}
            className="border border-tinta/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave transition-colors hover:border-tinta hover:text-tinta"
          >
            {rotuloCancelar}
          </button>
          <button
            ref={botaoConfirmarRef}
            type="button"
            onClick={onConfirmar}
            className={`px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-colors ${
              perigo ? "bg-rec hover:bg-rec/85" : "bg-tinta hover:bg-tinta-suave"
            }`}
          >
            {rotuloConfirmar}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
