"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { sair, usuarioAtual, listarMeusRoteiros, type Usuario, type UsoRoteiros, type RoteiroResumo } from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";
import { AcordandoEstudio } from "@/components/app/acordando-estudio";
import { useEsperaLonga } from "@/hooks/use-espera-longa";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function saudacao(): string {
  const h = new Date().getHours();
  if (h < 12) return "Bom dia";
  if (h < 18) return "Boa tarde";
  return "Boa noite";
}

function diasDesdeCadastro(criadoEm: string): number {
  const diff = Date.now() - new Date(criadoEm).getTime();
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function CardMetrica({
  label,
  valor,
  detalhe,
  destaque = false,
}: {
  label: string;
  valor: string | number;
  detalhe: string;
  destaque?: boolean;
}) {
  return (
    <div
      className={`group relative overflow-hidden border p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_0_rgba(19,18,16,0.1)] ${
        destaque
          ? "border-tinta bg-tinta text-papel"
          : "border-tinta/15 bg-papel-card"
      }`}
    >
      <p
        className={`font-mono text-[10px] font-semibold uppercase tracking-widest ${
          destaque ? "text-marca" : "text-cinza"
        }`}
      >
        {label}
      </p>
      <p
        className={`mt-2 font-display text-4xl tracking-tight ${
          destaque ? "text-papel" : "text-tinta"
        }`}
      >
        {valor}
      </p>
      <p
        className={`mt-1 font-mono text-[10px] tracking-wider ${
          destaque ? "text-papel/60" : "text-cinza"
        }`}
      >
        {detalhe}
      </p>
      {/* Corner accent */}
      <div
        className={`absolute right-0 top-0 h-6 w-6 ${
          destaque ? "bg-marca" : "bg-tinta/5"
        } transition-all duration-300 group-hover:h-8 group-hover:w-8`}
        style={{ clipPath: "polygon(100% 0, 0 0, 100% 100%)" }}
      />
    </div>
  );
}

function CardAcao({
  titulo,
  descricao,
  href,
  botaoTexto,
  icone,
}: {
  titulo: string;
  descricao: string;
  href: string;
  botaoTexto: string;
  icone: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col justify-between border border-tinta/15 bg-papel-card p-6 transition-all duration-300 hover:-translate-y-1 hover:border-tinta/30 hover:shadow-[6px_6px_0_0_rgba(19,18,16,0.1)]"
    >
      <div>
        <div className="mb-4 flex items-center gap-3">
          <span className="flex size-9 items-center justify-center bg-marca font-display text-lg text-tinta">
            {icone}
          </span>
          <h3 className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
            {titulo}
          </h3>
        </div>
        <p className="text-sm leading-relaxed text-tinta-suave">{descricao}</p>
      </div>
      <div className="mt-5 flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-tinta transition-all group-hover:gap-3">
        <span
          aria-hidden
          className="inline-block size-2 rounded-full bg-rec rec-pulso"
        />
        {botaoTexto}
        <span
          aria-hidden
          className="transition-transform duration-300 group-hover:translate-x-1"
        >
          →
        </span>
      </div>
    </Link>
  );
}

function RoteiroVazioEstado() {
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center border border-dashed border-tinta/15 bg-papel-card px-8 py-12 text-center">
      <div className="relative mb-5">
        <span className="font-display text-6xl text-tinta/8">G</span>
        <span
          aria-hidden
          className="absolute -right-1 -top-1 inline-block size-3 rounded-full bg-marca rec-pulso"
        />
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        Nenhum roteiro ainda
      </p>
      <p className="mt-2 max-w-xs text-sm leading-relaxed text-cinza">
        Seus roteiros gerados aparecerão aqui. Crie o primeiro e comece a
        construir sua bancada de ganchos.
      </p>
      <Link
        href="/designer"
        className="mt-6 flex items-center gap-2 bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
      >
        <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
        Criar primeiro roteiro
      </Link>
    </div>
  );
}

function ListaRoteirosRecentes({ roteiros }: { roteiros: RoteiroResumo[] }) {
  return (
    <div className="divide-y divide-tinta/10 border border-tinta/15 bg-papel-card">
      {roteiros.map((roteiro) => (
        <Link
          key={roteiro.id}
          href="/roteiros"
          className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-tinta/3"
        >
          <p className="truncate font-mono text-xs font-semibold text-tinta">
            {roteiro.tema}
          </p>
          <span
            className={`shrink-0 rounded-sm px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
              roteiro.aprovado ? "bg-marca/20 text-tinta" : "bg-rec/10 text-rec"
            }`}
          >
            {roteiro.notaFinal}/10
          </span>
        </Link>
      ))}
    </div>
  );
}

function AnatomiaViral() {
  const itens = [
    { sigla: "G", nome: "Gancho", desc: "0–3s · prende antes do swipe", cor: "bg-rec" },
    { sigla: "P", nome: "Problema", desc: "3–12s · espelha a dor do público", cor: "bg-marca" },
    { sigla: "V", nome: "Virada", desc: "12–25s · a informação que surpreende", cor: "bg-marca" },
    { sigla: "PR", nome: "Prova", desc: "25–45s · credibilidade e detalhe", cor: "bg-marca" },
    { sigla: "C", nome: "CTA", desc: "45s+ · convite direto", cor: "bg-tinta" },
  ];

  return (
    <div className="border border-tinta/10 bg-papel-card">
      <div className="border-b border-tinta/10 px-5 py-3">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta-suave">
          Anatomia de um vídeo viral
        </p>
      </div>
      <div className="divide-y divide-tinta/8">
        {itens.map((item) => (
          <div
            key={item.sigla}
            className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-tinta/3"
          >
            <span
              className={`flex size-7 shrink-0 items-center justify-center rounded-sm ${item.cor} font-mono text-[10px] font-bold ${
                item.cor === "bg-tinta" ? "text-papel" : "text-tinta"
              }`}
            >
              {item.sigla}
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-mono text-xs font-semibold text-tinta">
                {item.nome}
              </span>
              <span className="font-mono text-[10px] text-cinza">
                {item.desc}
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function DicaDoDia() {
  const dicas = [
    "Ganchos que começam com números retêm 2× mais nos primeiros 3 segundos.",
    "Vídeos com corte seco a cada 4s mantêm atenção 37% acima da média.",
    "O CTA mais eficaz é curto: uma frase, uma ação, zero ambiguidade.",
    "Roteiros de 30s com virada aos 12s têm taxa de compartilhamento 2.4× maior.",
    "Ganchos visuais (texto na tela) aumentam retenção em 28% no mobile.",
    "Perguntas retóricas no gancho geram 45% mais comentários.",
    "Roteiros que resolvem um problema nos primeiros 5s têm 3× mais salvamentos.",
  ];

  const [dica] = useState(() => dicas[Math.floor(Math.random() * dicas.length)]);

  return (
    <div className="border border-tinta/10 bg-papel-card p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
        [Dica do dia]
      </p>
      <p className="mt-2 text-sm leading-relaxed text-tinta-suave">{dica}</p>
      <p className="mt-3 font-mono text-[10px] tracking-wider text-cinza">
        Baseado em padrões de vídeos virais reais
      </p>
    </div>
  );
}

function BarraProgresso({
  label,
  atual,
  maximo,
}: {
  label: string;
  atual: number;
  maximo: number;
}) {
  const pct = Math.min((atual / maximo) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between">
        <span className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta-suave">
          {label}
        </span>
        <span className="font-mono text-[10px] tabular-nums text-cinza">
          {atual}/{maximo}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden bg-tinta/8">
        <div
          className="h-full bg-marca transition-all duration-700 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function Painel() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [uso, setUso] = useState<UsoRoteiros | null>(null);
  const [totalRoteiros, setTotalRoteiros] = useState(0);
  const [roteirosRecentes, setRoteirosRecentes] = useState<RoteiroResumo[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const acordando = useEsperaLonga(carregando);

  // I1: Auth guard + dados de uso em paralelo (um único round-trip de espera)
  useEffect(() => {
    let ativo = true;
    async function init() {
      try {
        const [u, dadosRoteiros] = await Promise.all([
          usuarioAtual(),
          listarMeusRoteiros().catch(() => null),
        ]);
        if (!ativo) return;
        if (!u) { router.replace("/login"); return; }
        setUsuario(u);
        if (dadosRoteiros) {
          setUso(dadosRoteiros.uso);
          setTotalRoteiros(dadosRoteiros.roteiros.length);
          // A API já devolve ordenado por mais recente primeiro.
          setRoteirosRecentes(dadosRoteiros.roteiros.slice(0, 3));
        }
        setCarregando(false);
        setTimeout(() => setMostrarConteudo(true), 100);
      } catch {
        if (ativo) router.replace("/login");
      }
    }
    init();
    return () => { ativo = false; };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
    } finally {
      router.replace("/");
    }
  }

  // Estado de carregamento
  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {acordando ? (
          <AcordandoEstudio />
        ) : (
          <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
            <span
              aria-hidden
              className="rec-pulso inline-block size-2 rounded-full bg-rec"
            />
            Abrindo estúdio…
          </p>
        )}
      </main>
    );
  }

  const primeiroNome = usuario?.nome?.split(" ")[0] ?? "Criador";
  const dias = usuario?.criadoEm ? diasDesdeCadastro(usuario.criadoEm) : 1;
  const eFree = usuario?.plano === "free";

  return (
    <div ref={painelRef} className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "Início", ativo: true },
          { rotulo: "Designer", href: "/designer" },
        ]}
      />

      {/* ── CORPO ── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
        {/* Saudação */}
        <div
          className={`transition-all duration-700 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
            [Estúdio de criação]
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            {saudacao().toUpperCase()},{" "}
            <span className="marca-texto marca-texto-animado">
              {primeiroNome.toUpperCase()}
            </span>
          </h1>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-tinta-suave">
            Seu estúdio está pronto. Configure seu roteiro, escolha o formato e
            deixe a IA montar a estrutura viral — gancho, virada e CTA.
          </p>
        </div>

        {/* Métricas */}
        <div
          className={`mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 transition-all duration-700 delay-150 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <CardMetrica
            label="Roteiros criados"
            valor={totalRoteiros}
            detalhe={totalRoteiros === 0 ? "Crie o primeiro →" : `${totalRoteiros} no histórico`}
            destaque
          />
          <CardMetrica
            label="Este mês"
            valor={uso ? `${uso.usadosNoMes}/${uso.limiteMensal}` : "0"}
            detalhe="roteiros do limite"
          />
          <CardMetrica
            label="Dias no estúdio"
            valor={dias}
            detalhe={dias === 1 ? "Bem-vindo!" : `Desde o cadastro`}
          />
          <CardMetrica
            label="Plano ativo"
            valor={eFree ? "FREE" : "PRO"}
            detalhe={eFree ? "5 roteiros/mês" : "50 roteiros/mês"}
          />
        </div>

        {/* Uso do plano */}
        <div
          className={`mt-6 border border-tinta/10 bg-papel-card p-5 transition-all duration-700 delay-300 ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={`inline-block size-2 rounded-full ${eFree ? "bg-marca" : "bg-rec"}`}
              />
              <span className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                Uso do plano {usuario?.plano}
              </span>
            </div>
            {eFree && (
              <Link
                href="/planos"
                className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec underline decoration-rec/30 underline-offset-4 transition-colors hover:text-tinta hover:decoration-tinta/30"
              >
                Upgrade →
              </Link>
            )}
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <BarraProgresso
              label="Roteiros este mês"
              atual={uso?.usadosNoMes ?? 0}
              maximo={uso?.limiteMensal ?? (eFree ? 5 : 50)}
            />
            <BarraProgresso label="Histórico total" atual={totalRoteiros} maximo={30} />
          </div>
        </div>

        {/* Grid principal: Ações + Sidebar */}
        <div
          className={`mt-10 grid gap-8 lg:grid-cols-[1fr_380px] transition-all duration-700 delay-[450ms] ${
            mostrarConteudo
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          {/* Coluna principal */}
          <div className="space-y-8">
            {/* Ações rápidas */}
            <div>
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                Ações rápidas
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <CardAcao
                  titulo="Designer"
                  descricao="Crie um roteiro do zero com IA — escolha tema, formato e tom narrativo."
                  href="/designer"
                  botaoTexto="Abrir designer"
                  icone="✎"
                />
                <CardAcao
                  titulo="Meus Roteiros"
                  descricao="Veja, edite e reutilize os roteiros que você já gerou."
                  href="/roteiros"
                  botaoTexto="Ver roteiros"
                  icone="R"
                />
              </div>
            </div>

            {/* Roteiros recentes */}
            <div>
              <p className="mb-4 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                Roteiros recentes
              </p>
              {roteirosRecentes.length > 0 ? (
                <ListaRoteirosRecentes roteiros={roteirosRecentes} />
              ) : (
                <RoteiroVazioEstado />
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            <DicaDoDia />
            <AnatomiaViral />

            {/* Card de plano */}
            {eFree && (
              <Link
                href="/planos"
                className="group block border border-tinta bg-tinta p-5 transition-all duration-300 hover:shadow-[4px_4px_0_0_var(--color-marca)]"
              >
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-marca">
                  [Plano Pro]
                </p>
                <p className="mt-2 font-display text-xl tracking-tight text-papel">
                  DESBLOQUEIE O ESTÚDIO COMPLETO
                </p>
                <p className="mt-2 text-xs leading-relaxed text-papel/60">
                  Roteiros ilimitados, ganchos avançados, exportação em múltiplos
                  formatos e acesso a modelos de IA premium.
                </p>
                <p className="mt-4 flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-widest text-marca transition-all group-hover:gap-3">
                  Ver planos
                  <span
                    aria-hidden
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  >
                    →
                  </span>
                </p>
              </Link>
            )}
          </aside>
        </div>
      </main>

      {/* ── RODAPÉ ── */}
      <RodapeApp />
    </div>
  );
}
