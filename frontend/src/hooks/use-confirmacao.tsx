"use client";

import { useCallback, useRef, useState } from "react";
import {
  ConfirmacaoModal,
  type OpcoesConfirmacao,
} from "@/components/app/confirmacao-modal";

/**
 * Confirmação imperativa via Promise — troca mínima nos call sites que
 * usavam confirm() nativo:
 *
 *   const { confirmar, elemento } = useConfirmacao();
 *   const ok = await confirmar({ titulo: "Deletar?", rotuloConfirmar: "Deletar" });
 *   // ...no JSX de retorno: {elemento}
 */
export function useConfirmacao() {
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao | null>(null);
  const resolverRef = useRef<((valor: boolean) => void) | null>(null);
  // Elemento focado antes de abrir — o foco volta pra ele ao fechar.
  const focoAnteriorRef = useRef<HTMLElement | null>(null);

  const confirmar = useCallback((novasOpcoes: OpcoesConfirmacao) => {
    focoAnteriorRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    setOpcoes(novasOpcoes);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
    });
  }, []);

  function aoResolver(valor: boolean) {
    resolverRef.current?.(valor);
    resolverRef.current = null;
    setOpcoes(null);
    focoAnteriorRef.current?.focus();
    focoAnteriorRef.current = null;
  }

  const elemento = opcoes ? (
    <ConfirmacaoModal
      {...opcoes}
      onConfirmar={() => aoResolver(true)}
      onCancelar={() => aoResolver(false)}
    />
  ) : null;

  return { confirmar, elemento };
}
