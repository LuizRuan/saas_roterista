"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { consultarStatusPagamento, type StatusPagamento } from "@/lib/api";

const INTERVALO_POLLING_MS = 5_000; // 5 segundos
const MAX_TENTATIVAS = 180; // 15 minutos (180 × 5s)

type EstadoPolling = {
  /** Status atual do pagamento. */
  status: StatusPagamento["status"] | null;
  /** Erro de rede no polling (não impede re-tentativa). */
  erro: string | null;
  /** Número de tentativas de polling realizadas. */
  tentativas: number;
  /** Se o polling está ativo. */
  ativo: boolean;
};

/**
 * Hook que faz polling do status de um pagamento PIX a cada 5 segundos.
 *
 * Comportamento inteligente:
 * - Pausa quando a aba fica invisível (document.visibilitychange)
 * - Para automaticamente quando status !== "pendente"
 * - Para após MAX_TENTATIVAS (15 minutos)
 * - Resiliente a erros de rede (continua tentando)
 */
export function usePollingPagamento(
  assinaturaId: string | null,
  /** Callback chamado quando o status muda para "pago". */
  onPago?: () => void
): EstadoPolling {
  const [status, setStatus] = useState<StatusPagamento["status"] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [tentativas, setTentativas] = useState(0);
  const [ativo, setAtivo] = useState(false);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onPagoRef = useRef(onPago);
  onPagoRef.current = onPago;

  const pararPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setAtivo(false);
  }, []);

  useEffect(() => {
    if (!assinaturaId) return;

    const id = assinaturaId; // captura para narrowing dentro da closure
    let cancelado = false;
    let tentativasLocal = 0;

    async function verificar() {
      if (cancelado) return;

      // Não faz polling se a aba está invisível — economiza requests
      if (document.hidden) return;

      tentativasLocal++;
      setTentativas(tentativasLocal);

      if (tentativasLocal > MAX_TENTATIVAS) {
        setStatus("expirado");
        pararPolling();
        return;
      }

      try {
        const resultado = await consultarStatusPagamento(id);
        if (cancelado) return;

        setStatus(resultado.status);
        setErro(null);

        if (resultado.status !== "pendente") {
          pararPolling();
          if (resultado.status === "pago") {
            onPagoRef.current?.();
          }
        }
      } catch (err) {
        if (cancelado) return;
        // Erros de rede não param o polling — o usuário pode estar com conexão instável
        setErro(err instanceof Error ? err.message : "Erro ao verificar status.");
      }
    }

    // Primeira verificação imediata
    setAtivo(true);
    setStatus("pendente");
    verificar();

    // Polling a cada 5 segundos
    intervalRef.current = setInterval(verificar, INTERVALO_POLLING_MS);

    // Pausa/retoma quando a aba muda de visibilidade
    function aoMudarVisibilidade() {
      if (!document.hidden && intervalRef.current) {
        // Aba voltou ao foco — verifica imediatamente
        verificar();
      }
    }
    document.addEventListener("visibilitychange", aoMudarVisibilidade);

    return () => {
      cancelado = true;
      pararPolling();
      document.removeEventListener("visibilitychange", aoMudarVisibilidade);
    };
  }, [assinaturaId, pararPolling]);

  return { status, erro, tentativas, ativo };
}
