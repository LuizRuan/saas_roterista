"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";

/**
 * Dialog dedicado pra exclusão de conta — não usa o useConfirmacao genérico
 * porque essa ação precisa de um campo de senha (reautenticação antes de uma
 * ação irreversível). Mesmo padrão visual/acessível do ConfirmacaoModal:
 * portal, role="dialog", foco preso, Esc fecha.
 */
export function ModalExcluirConta({
  enviando,
  erro,
  onConfirmar,
  onCancelar,
}: {
  enviando: boolean;
  erro: string | null;
  onConfirmar: (senha: string) => void;
  onCancelar: () => void;
}) {
  const [senha, setSenha] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const botaoCancelarRef = useRef<HTMLButtonElement>(null);
  const idTitulo = useId();
  const idDescricao = useId();
  const idErro = useId();

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function aoTeclar(evento: KeyboardEvent<HTMLDivElement>) {
    if (evento.key === "Escape") {
      evento.stopPropagation();
      onCancelar();
    }
  }

  function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    if (!senha || enviando) return;
    onConfirmar(senha);
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
        aria-describedby={idDescricao}
        onClick={(evento) => evento.stopPropagation()}
        className="w-full max-w-sm rounded-lg border border-tinta/15 bg-papel-card p-6 shadow-[6px_6px_0_0_rgba(19,18,16,0.18)]"
      >
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
          [Zona de perigo]
        </p>
        <h2 id={idTitulo} className="mt-2 font-display text-2xl tracking-tight">
          Excluir sua conta?
        </h2>
        <p id={idDescricao} className="mt-2 text-sm leading-relaxed text-tinta-suave">
          Isso apaga sua conta e todos os roteiros salvos, para sempre. Não dá pra desfazer.
          Digite sua senha atual pra confirmar.
        </p>

        <form onSubmit={aoEnviar} className="mt-4">
          <label htmlFor="senha-exclusao" className="sr-only">
            Senha atual
          </label>
          <input
            ref={inputRef}
            id="senha-exclusao"
            type="password"
            autoComplete="current-password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="Sua senha atual"
            aria-invalid={erro ? true : undefined}
            aria-describedby={erro ? idErro : undefined}
            className={`w-full rounded-md border bg-papel px-4 py-3 text-tinta placeholder:text-cinza ${
              erro ? "border-rec" : "border-tinta/20 hover:border-tinta/40"
            }`}
          />
          {erro && (
            <p id={idErro} className="mt-1.5 text-sm font-medium text-rec">
              {erro}
            </p>
          )}

          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              ref={botaoCancelarRef}
              type="button"
              onClick={onCancelar}
              className="border border-tinta/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave transition-colors hover:border-tinta hover:text-tinta"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!senha || enviando}
              className="bg-rec px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-colors hover:bg-rec/85 disabled:opacity-50"
            >
              {enviando ? "Excluindo…" : "Excluir permanentemente"}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
