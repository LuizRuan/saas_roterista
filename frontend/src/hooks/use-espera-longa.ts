"use client";

import { useEffect, useState } from "react";

/**
 * Retorna `true` quando um carregamento ativo passa de `limiarMs` sem terminar.
 * Usado para trocar o spinner comum por uma mensagem de "acordando o estúdio"
 * nos casos de cold start do backend (Render free), sem cancelar a requisição.
 */
export function useEsperaLonga(ativo: boolean, limiarMs = 4000): boolean {
  const [demorou, setDemorou] = useState(false);

  useEffect(() => {
    if (!ativo) return;
    const id = setTimeout(() => setDemorou(true), limiarMs);
    // Reset no cleanup (roda quando `ativo` deixa de ser true) — evita
    // setState síncrono no corpo do efeito (cascading renders).
    return () => {
      clearTimeout(id);
      setDemorou(false);
    };
  }, [ativo, limiarMs]);

  return demorou;
}
