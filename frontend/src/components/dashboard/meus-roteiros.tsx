"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sair,
  usuarioAtual,
  listarMeusRoteiros,
  buscarRoteiro,
  deletarMeuRoteiro,
  type Usuario,
  type RoteiroResumo,
  type RoteiroSalvo,
  type UsoRoteiros,
} from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";
import { AcordandoEstudio } from "@/components/app/acordando-estudio";
import { useConfirmacao } from "@/hooks/use-confirmacao";
import { useEsperaLonga } from "@/hooks/use-espera-longa";

// ---------------------------------------------------------------------------
// Labels
// ---------------------------------------------------------------------------

const FORMATO_LABEL: Record<string, string> = {
  "reels-30s": "Reels 30s",
  "reels-60s": "Reels 60s",
  "shorts-60s": "Shorts 60s",
  "tiktok-15s": "TikTok 15s",
  "tiktok-60s": "TikTok 60s",
  "youtube-3min": "YouTube 3min",
};

const TOM_LABEL: Record<string, string> = {
  urgente: "Urgente",
  inspirador: "Inspirador",
  provocador: "Provocador",
  educativo: "Educativo",
  curioso: "Curioso",
};

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

function CardRoteiro({
  roteiro,
  onDeletar,
  deletando,
}: {
  roteiro: RoteiroResumo;
  onDeletar: (id: string) => void;
  deletando: boolean;
}) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [completo, setCompleto] = useState<RoteiroSalvo | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState(false);

  // A listagem não traz o texto do roteiro (gancho/problema/...) — busca sob
  // demanda ao expandir ou copiar, e guarda em cache local.
  async function buscarDetalhe(): Promise<RoteiroSalvo | null> {
    if (completo) return completo;
    setCarregandoDetalhe(true);
    setErroDetalhe(false);
    try {
      const { roteiro: detalhe } = await buscarRoteiro(roteiro.id);
      setCompleto(detalhe);
      return detalhe;
    } catch {
      setErroDetalhe(true);
      return null;
    } finally {
      setCarregandoDetalhe(false);
    }
  }

  async function aoAlternarExpandido() {
    const abrindo = !expandido;
    setExpandido(abrindo);
    if (abrindo && !completo) await buscarDetalhe();
  }

  async function copiar() {
    const detalhe = await buscarDetalhe();
    if (!detalhe) return;
    const texto =
      `[GANCHO · 0–3s]\n${detalhe.gancho}\n\n` +
      `[PROBLEMA · 3–12s]\n${detalhe.problema}\n\n` +
      `[VIRADA · 12–25s]\n${detalhe.virada}\n\n` +
      `[PROVA · 25–45s]\n${detalhe.prova}\n\n` +
      `[CALL TO ACTION · 45s+]\n${detalhe.cta}`;
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  const data = new Date(roteiro.criadoEm).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border border-tinta/10 transition-colors hover:border-tinta/20">
      {/* Header do card */}
      <div
        className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4"
        onClick={aoAlternarExpandido}
      >
        <div className="min-w-0 flex-1">
          <p className="truncate font-mono text-xs font-semibold text-tinta">
            {roteiro.tema}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-sm border border-tinta/10 px-1.5 py-0.5 font-mono text-[10px] text-cinza">
              {FORMATO_LABEL[roteiro.formato] ?? roteiro.formato}
            </span>
            <span className="rounded-sm border border-tinta/10 px-1.5 py-0.5 font-mono text-[10px] text-cinza">
              {TOM_LABEL[roteiro.tom] ?? roteiro.tom}
            </span>
            <span
              className={`rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                roteiro.aprovado
                  ? "bg-marca/20 text-tinta"
                  : "bg-rec/10 text-rec"
              }`}
            >
              {roteiro.notaFinal}/10
            </span>
            <span className="font-mono text-[10px] text-cinza">{data}</span>
          </div>
        </div>
        <span className="font-mono text-xs text-cinza">{expandido ? "▲" : "▼"}</span>
      </div>

      {/* Conteúdo expandido */}
      {expandido && (
        <div className="border-t border-tinta/8">
          {carregandoDetalhe && (
            <p className="px-5 py-4 font-mono text-xs text-cinza">Carregando roteiro…</p>
          )}
          {erroDetalhe && !carregandoDetalhe && (
            <p className="px-5 py-4 font-mono text-xs text-rec">
              Não foi possível carregar o texto do roteiro.{" "}
              <button type="button" onClick={buscarDetalhe} className="underline">
                Tentar de novo
              </button>
            </p>
          )}
          {completo &&
            [
              { label: "GANCHO", tempo: "0–3s", texto: completo.gancho },
              { label: "PROBLEMA", tempo: "3–12s", texto: completo.problema },
              { label: "VIRADA", tempo: "12–25s", texto: completo.virada },
              { label: "PROVA", tempo: "25–45s", texto: completo.prova },
              { label: "CTA", tempo: "45s+", texto: completo.cta },
            ].map((secao) => (
              <div
                key={secao.label}
                className="border-b border-tinta/8 px-5 py-3 last:border-b-0"
              >
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-tinta">
                    {secao.label}
                  </span>
                  <span className="font-mono text-[10px] text-cinza">{secao.tempo}</span>
                </div>
                <p className="text-sm leading-relaxed text-tinta-suave">{secao.texto}</p>
              </div>
            ))}

          {/* Notas */}
          <div className="border-t border-tinta/8 bg-tinta/3 px-5 py-3">
            <div className="flex flex-wrap gap-3">
              {([
                ["Gancho", roteiro.notas.gancho],
                ["Retenção", roteiro.notas.retencao],
                ["CTA", roteiro.notas.cta],
                ["Clareza", roteiro.notas.clareza],
                ["Adequação", roteiro.notas.adequacao],
              ] as const).map(([label, nota]) => (
                <span key={label} className="font-mono text-[10px] text-cinza">
                  {label}{" "}
                  <span
                    className={`font-semibold ${
                      nota >= 8 ? "text-tinta" : nota >= 6 ? "text-tinta-suave" : "text-rec"
                    }`}
                  >
                    {nota}/10
                  </span>
                </span>
              ))}
            </div>
          </div>

          {/* Ações */}
          <div className="flex items-center gap-4 border-t border-tinta/8 px-5 py-3">
            <button
              type="button"
              onClick={copiar}
              className="font-mono text-[10px] uppercase tracking-widest text-tinta-suave underline decoration-marca/50 underline-offset-4 transition-colors hover:text-tinta"
            >
              {copiado ? "✓ Copiado!" : "Copiar roteiro"}
            </button>
            <button
              type="button"
              onClick={() => onDeletar(roteiro.id)}
              disabled={deletando}
              className="font-mono text-[10px] uppercase tracking-widest text-rec/60 underline decoration-rec/30 underline-offset-4 transition-colors hover:text-rec disabled:opacity-40"
            >
              {deletando ? "…" : "Deletar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function MeusRoteiros() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [roteiros, setRoteiros] = useState<RoteiroResumo[]>([]);
  const [uso, setUso] = useState<UsoRoteiros | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const acordando = useEsperaLonga(carregando);
  const { confirmar, elemento: modalConfirmacao } = useConfirmacao();

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [u, dados] = await Promise.all([usuarioAtual(), listarMeusRoteiros()]);
        if (!ativo) return;
        if (!u) { router.replace("/login"); return; }
        setUsuario(u);
        setRoteiros(dados.roteiros);
        setUso(dados.uso);
        setCarregando(false);
        setTimeout(() => setMostrarConteudo(true), 80);
      } catch {
        if (ativo) router.replace("/login");
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  async function aoDeletar(id: string) {
    const ok = await confirmar({
      titulo: "Deletar este roteiro?",
      descricao: "Essa ação não pode ser desfeita.",
      rotuloConfirmar: "Deletar",
    });
    if (!ok) return;
    setDeletando(id);
    try {
      await deletarMeuRoteiro(id);
      setRoteiros((prev) => prev.filter((r) => r.id !== id));
    } catch {
      setErroGeral("Não foi possível deletar o roteiro.");
    } finally {
      setDeletando(null);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {acordando ? (
          <AcordandoEstudio />
        ) : (
          <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
            <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
            Carregando roteiros…
          </p>
        )}
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "← Voltar", href: "/dashboard" },
          { rotulo: "Designer", href: "/designer" },
          { rotulo: "Meus Roteiros", ativo: true },
          { rotulo: "Configurações", href: "/configuracoes" },
        ]}
        badgeAdmin="nenhum"
      />

      {/* ── CORPO ── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">

        {/* Erro geral */}
        {erroGeral && (
          <p
            role="alert"
            className="mb-6 rounded-sm border border-rec/40 bg-rec/10 px-4 py-3 font-mono text-xs font-medium text-rec"
          >
            {erroGeral}{" "}
            <button onClick={() => setErroGeral(null)} className="underline">
              Fechar
            </button>
          </p>
        )}

        {/* Cabeçalho */}
        <div
          className={`transition-all duration-700 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
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
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {/* Uso mensal */}
          {uso && (
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs tabular-nums text-cinza">
                {roteiros.length} roteiro{roteiros.length !== 1 ? "s" : ""} salvo{roteiros.length !== 1 ? "s" : ""}
              </span>
              <span className="text-cinza">·</span>
              <span className="font-mono text-xs tabular-nums text-tinta-suave">
                {uso.usadosNoMes}/{uso.limiteMensal} este mês
              </span>
            </div>
          )}

          {/* Botão novo roteiro */}
          <Link
            href="/designer"
            className="flex items-center gap-2 border border-tinta/20 px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave transition-all hover:border-tinta hover:text-tinta"
          >
            <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
            Novo roteiro
          </Link>
        </div>

        {/* Separador */}
        <div
          className={`mt-4 border-b border-tinta/10 pb-2 transition-all duration-700 delay-200 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        />

        {/* Conteúdo */}
        <div
          className={`mt-6 transition-all duration-700 delay-300 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {roteiros.length === 0 ? (
            <EstadoVazio />
          ) : (
            <div className="space-y-3">
              {roteiros.map((r) => (
                <CardRoteiro
                  key={r.id}
                  roteiro={r}
                  onDeletar={aoDeletar}
                  deletando={deletando === r.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <RodapeApp />
      {modalConfirmacao}
    </div>
  );
}
