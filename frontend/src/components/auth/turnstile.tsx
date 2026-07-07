"use client";

import { useEffect, useRef } from "react";

// Chave de teste pública da Cloudflare (sempre aprova) — usada só quando o
// projeto ainda não tem uma site key própria configurada.
const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || "1x00000000000000000000AA";
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opcoes: Record<string, unknown>) => string;
      remove: (widgetId: string) => void;
    };
  }
}

let carregamentoScript: Promise<void> | null = null;

function carregarScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (!carregamentoScript) {
    carregamentoScript = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Falha ao carregar o CAPTCHA."));
      document.head.appendChild(script);
    });
  }
  return carregamentoScript;
}

/** Widget do Cloudflare Turnstile (CAPTCHA) — chama onToken(null) se expirar/falhar. */
export function Turnstile({ onToken }: { onToken: (token: string | null) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelado = false;

    carregarScript()
      .then(() => {
        if (cancelado || !containerRef.current || !window.turnstile) return;
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: SITE_KEY,
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => onToken(null),
        });
      })
      .catch(() => onToken(null));

    return () => {
      cancelado = true;
      if (widgetIdRef.current && window.turnstile) {
        window.turnstile.remove(widgetIdRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={containerRef} />;
}
