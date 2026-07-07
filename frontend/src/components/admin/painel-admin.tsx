"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sair,
  usuarioAtual,
  listarPadroes,
  deletarPadrao,
  atualizarPadrao,
  type Usuario,
  type PadraoViral,
} from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";
import { useConfirmacao } from "@/hooks/use-confirmacao";

// ---------------------------------------------------------------------------
// Helpers
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

function CardEstatistica({
  label,
  valor,
  sub,
}: {
  label: string;
  valor: number | string;
  sub: string;
}) {
  return (
    <div className="border border-tinta/15 bg-papel-card p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza">
        {label}
      </p>
      <p className="mt-2 font-display text-4xl tracking-tight text-tinta">{valor}</p>
      <p className="mt-1 font-mono text-[10px] tracking-wider text-cinza">{sub}</p>
    </div>
  );
}

function BadgeStatus({ ativo }: { ativo: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm px-2 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-wider ${
        ativo ? "bg-tinta/8 text-tinta" : "bg-tinta/5 text-cinza"
      }`}
    >
      <span
        className={`inline-block size-1.5 rounded-full ${ativo ? "bg-marca" : "bg-cinza"}`}
      />
      {ativo ? "Ativo" : "Inativo"}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function PainelAdmin() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [padroes, setPadroes] = useState<PadraoViral[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [deletando, setDeletando] = useState<string | null>(null);
  const [toggleando, setToggleando] = useState<string | null>(null);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const { confirmar, elemento: modalConfirmacao } = useConfirmacao();

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const u = await usuarioAtual();
        if (!ativo) return;

        if (!u || u.papel !== "admin") {
          router.replace("/dashboard");
          return;
        }

        setUsuario(u);
        const lista = await listarPadroes();
        if (!ativo) return;
        setPadroes(lista);
        setCarregando(false);
        setTimeout(() => setMostrarConteudo(true), 80);
      } catch {
        if (ativo) router.replace("/dashboard");
      }
    }
    carregar();
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

  async function aoToggle(padrao: PadraoViral) {
    setToggleando(padrao.id);
    try {
      const atualizado = await atualizarPadrao(padrao.id, { ativo: !padrao.ativo });
      setPadroes((prev) =>
        prev.map((p) => (p.id === padrao.id ? atualizado : p))
      );
    } catch {
      setErroGeral("Não foi possível alterar o status.");
    } finally {
      setToggleando(null);
    }
  }

  async function aoDeletar(id: string) {
    const ok = await confirmar({
      titulo: "Deletar este padrão?",
      descricao: "Não tem como desfazer.",
      rotuloConfirmar: "Deletar",
    });
    if (!ok) return;
    setDeletando(id);
    try {
      await deletarPadrao(id);
      setPadroes((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setErroGeral("Não foi possível deletar o padrão.");
    } finally {
      setDeletando(null);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Carregando painel…
        </p>
      </main>
    );
  }

  const ativos = padroes.filter((p) => p.ativo).length;
  const inativos = padroes.length - ativos;

  return (
    <div className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "Dashboard", href: "/dashboard" },
          { rotulo: "Padrões Virais", ativo: true },
        ]}
        badgeAdmin="logo-sempre"
        textoUsuario={<>{usuario?.nome?.split(" ")[0]} · admin</>}
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
            <button
              onClick={() => setErroGeral(null)}
              className="underline"
            >
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
            [Painel de administração]
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            PADRÕES{" "}
            <span className="marca-texto marca-texto-animado">VIRAIS</span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-tinta-suave">
            Gerencie os roteiros de referência que a IA usa para gerar conteúdo
            para todos os usuários. Quanto mais padrões ativos, melhor a qualidade.
          </p>
        </div>

        {/* Estatísticas */}
        <div
          className={`mt-8 grid gap-4 sm:grid-cols-3 transition-all duration-700 delay-150 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <CardEstatistica
            label="Total de padrões"
            valor={padroes.length}
            sub={padroes.length === 0 ? "Adicione o primeiro →" : "catalogados"}
          />
          <CardEstatistica
            label="Padrões ativos"
            valor={ativos}
            sub="injetados na IA"
          />
          <CardEstatistica
            label="Padrões inativos"
            valor={inativos}
            sub="desligados da IA"
          />
        </div>

        {/* Botão adicionar + lista */}
        <div
          className={`mt-8 transition-all duration-700 delay-300 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <div className="mb-5 flex items-center justify-between">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
              {padroes.length} padrão{padroes.length !== 1 ? "s" : ""} cadastrado{padroes.length !== 1 ? "s" : ""}
            </p>
            <Link
              href="/admin/padroes/novo"
              className="flex items-center gap-2 bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
            >
              <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
              Adicionar padrão
            </Link>
          </div>

          {/* Lista vazia */}
          {padroes.length === 0 && (
            <div className="flex min-h-[300px] flex-col items-center justify-center border border-dashed border-tinta/15 bg-papel-card px-8 py-12 text-center">
              <span className="font-display text-6xl text-tinta/8">P</span>
              <p className="mt-4 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                Nenhum padrão cadastrado ainda
              </p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-cinza">
                Adicione roteiros virais reais. A IA vai usá-los como referência
                para gerar conteúdo de alta qualidade para todos os usuários.
              </p>
              <Link
                href="/admin/padroes/novo"
                className="mt-6 flex items-center gap-2 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
              >
                <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
                Adicionar primeiro padrão
              </Link>
            </div>
          )}

          {/* Tabela de padrões */}
          {padroes.length > 0 && (
            <div className="divide-y divide-tinta/8 border border-tinta/10">
              {/* Cabeçalho da tabela */}
              <div className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 bg-tinta/3 px-5 py-3">
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza">
                  Título / Estrutura
                </span>
                <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza sm:block">
                  Formato
                </span>
                <span className="hidden font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza sm:block">
                  Tom
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza">
                  Status
                </span>
                <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza">
                  Ações
                </span>
              </div>

              {/* Linhas */}
              {padroes.map((padrao) => (
                <div
                  key={padrao.id}
                  className="grid grid-cols-[1fr_auto_auto_auto_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-tinta/2"
                >
                  <div>
                    <p className="font-mono text-xs font-semibold text-tinta">
                      {padrao.titulo}
                    </p>
                    <p className="mt-0.5 line-clamp-1 text-xs text-cinza">
                      {padrao.gancho}
                    </p>
                  </div>

                  <span className="hidden rounded-sm border border-tinta/10 px-2 py-0.5 font-mono text-[10px] text-cinza sm:block">
                    {FORMATO_LABEL[padrao.formato] ?? padrao.formato}
                  </span>

                  <span className="hidden rounded-sm border border-tinta/10 px-2 py-0.5 font-mono text-[10px] text-cinza sm:block">
                    {TOM_LABEL[padrao.tom] ?? padrao.tom}
                  </span>

                  <BadgeStatus ativo={padrao.ativo} />

                  <div className="flex items-center gap-3">
                    {/* Toggle ativo/inativo */}
                    <button
                      type="button"
                      onClick={() => aoToggle(padrao)}
                      disabled={toggleando === padrao.id}
                      className="font-mono text-[10px] uppercase tracking-widest text-tinta-suave underline decoration-marca/50 underline-offset-4 transition-colors hover:text-tinta disabled:opacity-40"
                    >
                      {toggleando === padrao.id
                        ? "…"
                        : padrao.ativo
                        ? "Desativar"
                        : "Ativar"}
                    </button>

                    {/* Editar */}
                    <Link
                      href={`/admin/padroes/${padrao.id}`}
                      className="font-mono text-[10px] uppercase tracking-widest text-tinta-suave underline decoration-marca/50 underline-offset-4 transition-colors hover:text-tinta"
                    >
                      Editar
                    </Link>

                    {/* Deletar */}
                    <button
                      type="button"
                      onClick={() => aoDeletar(padrao.id)}
                      disabled={deletando === padrao.id}
                      className="font-mono text-[10px] uppercase tracking-widest text-rec/60 underline decoration-rec/30 underline-offset-4 transition-colors hover:text-rec disabled:opacity-40"
                    >
                      {deletando === padrao.id ? "…" : "Deletar"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <RodapeApp texto="Gancho · Painel Admin" />
      {modalConfirmacao}
    </div>
  );
}
