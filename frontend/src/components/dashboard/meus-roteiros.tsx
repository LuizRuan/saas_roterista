"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { sair, usuarioAtual, type Usuario } from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type FiltroOrdem = "recente" | "formato" | "tom";

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function EstadoVazio() {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center border border-dashed border-tinta/15 bg-papel-card px-8 py-16 text-center">
      <div className="relative mb-6">
        <span className="font-display text-7xl text-tinta/8">R</span>
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-block size-3 rounded-full bg-marca rec-pulso"
        />
      </div>

      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        Nenhum roteiro salvo ainda
      </p>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-cinza">
        Seus roteiros gerados aparecem aqui após serem criados no Designer.
        Você poderá visualizá-los, copiá-los e reutilizá-los quando quiser.
      </p>

      <Link
        href="/designer"
        className="mt-8 flex items-center gap-2 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
      >
        <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
        Criar primeiro roteiro
      </Link>
    </div>
  );
}

function BotaoFiltro({
  ativo,
  onClick,
  children,
}: {
  ativo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`border px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest transition-all ${
        ativo
          ? "border-tinta bg-tinta text-papel"
          : "border-tinta/15 text-cinza hover:border-tinta/40 hover:text-tinta"
      }`}
    >
      {children}
    </button>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function MeusRoteiros() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [filtro, setFiltro] = useState<FiltroOrdem>("recente");
  const [mostrarConteudo, setMostrarConteudo] = useState(false);

  // Auth guard
  useEffect(() => {
    let ativo = true;
    usuarioAtual()
      .then((u) => {
        if (!ativo) return;
        if (u) {
          setUsuario(u);
          setCarregando(false);
          setTimeout(() => setMostrarConteudo(true), 80);
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
          <span
            aria-hidden
            className="rec-pulso inline-block size-2 rounded-full bg-rec"
          />
          Carregando roteiros…
        </p>
      </main>
    );
  }

  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "Criador";

  return (
    <div className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span
              aria-hidden
              className="rec-pulso inline-block size-2.5 rounded-full bg-rec"
            />
            <span className="font-display text-xl tracking-wide">GANCHO</span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/dashboard"
              className="font-mono text-xs uppercase tracking-widest text-cinza transition-colors hover:text-tinta"
            >
              Início
            </Link>
            <Link
              href="/designer"
              className="font-mono text-xs uppercase tracking-widest text-cinza transition-colors hover:text-tinta"
            >
              Designer
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-tinta underline decoration-marca decoration-2 underline-offset-4">
              Meus Roteiros
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <p className="hidden font-mono text-xs uppercase tracking-widest text-tinta-suave sm:block">
              {primeiroNome} · plano{" "}
              <span className="font-semibold text-tinta">{usuario?.plano}</span>
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

      {/* ── CORPO ── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">

        {/* Cabeçalho da seção */}
        <div
          className={`transition-all duration-700 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
            [Arquivo de criação]
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            MEUS{" "}
            <span className="marca-texto marca-texto-animado">ROTEIROS</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-tinta-suave">
            Todos os roteiros que você já gerou ficam guardados aqui. Acesse,
            copie ou use como base para novos formatos.
          </p>
        </div>

        {/* Barra de ações */}
        <div
          className={`mt-8 flex flex-wrap items-center justify-between gap-4 transition-all duration-700 delay-150 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          {/* Filtros de ordem */}
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-cinza">
              Ordenar:
            </span>
            <div className="flex gap-1.5">
              <BotaoFiltro
                ativo={filtro === "recente"}
                onClick={() => setFiltro("recente")}
              >
                Recente
              </BotaoFiltro>
              <BotaoFiltro
                ativo={filtro === "formato"}
                onClick={() => setFiltro("formato")}
              >
                Formato
              </BotaoFiltro>
              <BotaoFiltro
                ativo={filtro === "tom"}
                onClick={() => setFiltro("tom")}
              >
                Tom
              </BotaoFiltro>
            </div>
          </div>

          {/* Botão novo roteiro */}
          <Link
            href="/designer"
            className="flex items-center gap-2 border border-tinta/20 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave transition-all hover:border-tinta hover:text-tinta"
          >
            <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
            Novo roteiro
          </Link>
        </div>

        {/* Contador */}
        <div
          className={`mt-4 flex items-center gap-3 border-b border-tinta/10 pb-6 transition-all duration-700 delay-200 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <span className="font-mono text-xs tabular-nums text-cinza">
            0 roteiros salvos
          </span>
          {usuario?.plano === "free" && (
            <>
              <span className="text-cinza">·</span>
              <Link
                href="/planos"
                className="font-mono text-xs font-semibold uppercase tracking-widest text-rec underline decoration-rec/30 underline-offset-4 transition-colors hover:text-tinta"
              >
                Upgrade para ilimitado →
              </Link>
            </>
          )}
        </div>

        {/* Conteúdo principal */}
        <div
          className={`mt-8 transition-all duration-700 delay-300 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <EstadoVazio />
        </div>
      </main>

      {/* ── RODAPÉ ── */}
      <footer className="border-t border-tinta/10 py-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cinza">
          Gancho · Roteiros virais com IA
        </p>
      </footer>
    </div>
  );
}
