"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sair, usuarioAtual, type Usuario } from "@/lib/api";

/**
 * Placeholder autenticado do dashboard — a geração de roteiros chega na
 * Fase 4. Aqui só provamos a sessão: quem não está logado volta pro /login.
 */
export function Painel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    let ativo = true;
    usuarioAtual()
      .then((u) => {
        if (!ativo) return;
        if (u) {
          setUsuario(u);
          setCarregando(false);
        } else {
          router.replace("/login");
        }
      })
      .catch(() => {
        if (ativo) router.replace("/login");
      });
    return () => {
      ativo = false;
    };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
    } finally {
      router.replace("/");
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Carregando sessão…
        </p>
      </main>
    );
  }

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="rec-pulso inline-block size-2.5 rounded-full bg-rec"
            />
            <span className="font-display text-xl tracking-wide">GANCHO</span>
          </Link>

          <div className="flex items-center gap-4">
            <p className="hidden font-mono text-xs uppercase tracking-widest text-tinta-suave sm:block">
              {usuario?.nome} · plano {usuario?.plano}
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

      <main className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
          [Próxima cena]
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
          {usuario?.nome?.split(" ")[0]?.toUpperCase()}, SEU ESTÚDIO ESTÁ QUASE
          PRONTO
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-tinta-suave">
          Sua conta está ativa no plano{" "}
          <span className="font-semibold">{usuario?.plano}</span>. A geração de
          roteiros é a próxima fase da construção — em breve este espaço vira
          sua bancada de ganchos.
        </p>
      </main>
    </>
  );
}
