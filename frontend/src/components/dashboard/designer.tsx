"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sair, usuarioAtual, gerarRoteiro as gerarRoteiroApi, listarMeusRoteiros, ErroApi, type Usuario, type AvaliacaoIA, type UsoRoteiros } from "@/lib/api";
import { primeiraMensagemDeCampos } from "@/lib/validacao";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { CampoSublinhado } from "@/components/app/campo-sublinhado";
import { RodapeApp } from "@/components/app/rodape-app";
import { AcordandoEstudio } from "@/components/app/acordando-estudio";
import { useEsperaLonga } from "@/hooks/use-espera-longa";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type FormatoVideo =
  | "reels-60s"
  | "reels-30s"
  | "shorts-60s"
  | "tiktok-15s"
  | "tiktok-60s";

type TomNarrativo =
  | "urgente"
  | "inspirador"
  | "provocador"
  | "educativo"
  | "curioso";

type EtapaGeracao = "ocioso" | "analisando" | "escrevendo" | "refinando" | "pronto" | "erro";

interface ConfigRoteiro {
  tema: string;
  formato: FormatoVideo;
  tom: TomNarrativo;
  publico: string;
  palavraChave: string;
}

interface SecaoRoteiro {
  label: string;
  conteudo: string;
  tempo?: string;
}

// ---------------------------------------------------------------------------
// Dados estáticos
// ---------------------------------------------------------------------------

const FORMATOS: { valor: FormatoVideo; label: string; duracao: string }[] = [
  { valor: "reels-30s", label: "Reels", duracao: "30s" },
  { valor: "reels-60s", label: "Reels", duracao: "60s" },
  { valor: "shorts-60s", label: "Shorts", duracao: "60s" },
  { valor: "tiktok-15s", label: "TikTok", duracao: "15s" },
  { valor: "tiktok-60s", label: "TikTok", duracao: "60s" },
];

const TONS: { valor: TomNarrativo; label: string; descricao: string }[] = [
  { valor: "urgente", label: "Urgente", descricao: "Cria senso de escassez ou perigo" },
  { valor: "inspirador", label: "Inspirador", descricao: "Motiva e emociona o espectador" },
  { valor: "provocador", label: "Provocador", descricao: "Confronta uma crença comum" },
  { valor: "educativo", label: "Educativo", descricao: "Ensina algo em passos simples" },
  { valor: "curioso", label: "Curioso", descricao: "Abre uma pergunta que prende" },
];



// ---------------------------------------------------------------------------
// Componentes auxiliares
// ---------------------------------------------------------------------------

function TagContador({ atual, maximo }: { atual: number; maximo: number }) {
  const perto = atual > maximo * 0.8;
  const excedido = atual > maximo;
  return (
    <span
      className={`font-mono text-xs tabular-nums transition-colors ${
        excedido
          ? "text-rec font-semibold"
          : perto
            ? "text-tinta-suave"
            : "text-cinza"
      }`}
    >
      {atual}/{maximo}
    </span>
  );
}

function PulsoBadge({ etapa }: { etapa: EtapaGeracao }) {
  if (etapa === "ocioso") return null;

  const mapa: Record<
    EtapaGeracao,
    { cor: string; texto: string; pisca: boolean }
  > = {
    ocioso: { cor: "", texto: "", pisca: false },
    analisando: { cor: "bg-marca", texto: "ANALISANDO PADRÕES", pisca: true },
    escrevendo: { cor: "bg-rec", texto: "ESCREVENDO", pisca: true },
    refinando: { cor: "bg-marca", texto: "REFINANDO ROTEIRO", pisca: true },
    pronto: { cor: "bg-tinta", texto: "ROTEIRO PRONTO", pisca: false },
    erro: { cor: "bg-rec", texto: "ERRO", pisca: false },
  };

  const { cor, texto, pisca } = mapa[etapa];

  return (
    <span className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
      <span
        aria-hidden
        className={`inline-block size-2 rounded-full ${cor} ${pisca ? "rec-pulso" : ""}`}
      />
      {texto}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export function Designer() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const acordando = useEsperaLonga(carregando);

  // Formulário
  const [config, setConfig] = useState<ConfigRoteiro>({
    tema: "",
    formato: "reels-60s",
    tom: "urgente",
    publico: "",
    palavraChave: "",
  });

  // Geração
  const [etapa, setEtapa] = useState<EtapaGeracao>("ocioso");
  const [roteiro, setRoteiro] = useState<SecaoRoteiro[] | null>(null);
  const [avaliacao, setAvaliacao] = useState<AvaliacaoIA | null>(null);
  const [erroMensagem, setErroMensagem] = useState("");
  const roteiroRef = useRef<HTMLDivElement>(null);
  const [uso, setUso] = useState<UsoRoteiros | null>(null);

  // Copiado
  const [copiado, setCopiado] = useState(false);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
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
        if (dadosRoteiros) setUso(dadosRoteiros.uso);

        setCarregando(false);
      } catch {
        if (ativo) router.replace("/login");
      }
    }
    init();
    return () => { ativo = false; };
  }, [router]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  async function aoSair() {
    setSaindo(true);
    try {
      await sair();
    } finally {
      router.replace("/");
    }
  }

  function atualizarConfig<K extends keyof ConfigRoteiro>(
    campo: K,
    valor: ConfigRoteiro[K]
  ) {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }

  async function gerarRoteiroHandler() {
    if (!config.tema.trim()) return;

    setEtapa("analisando");
    setRoteiro(null);
    setAvaliacao(null);
    setErroMensagem("");

    try {
      setEtapa("escrevendo");

      const resultado = await gerarRoteiroApi({
        tema: config.tema,
        formato: config.formato,
        tom: config.tom,
        publico: config.publico,
        palavraChave: config.palavraChave,
      });

      const secoes: SecaoRoteiro[] = [
        { label: "GANCHO", tempo: "0–3s", conteudo: resultado.roteiro.gancho },
        { label: "PROBLEMA", tempo: "3–12s", conteudo: resultado.roteiro.problema },
        { label: "VIRADA", tempo: "12–25s", conteudo: resultado.roteiro.virada },
        { label: "PROVA", tempo: "25–45s", conteudo: resultado.roteiro.prova },
        { label: "CALL TO ACTION", tempo: "45s+", conteudo: resultado.roteiro.cta },
      ];

      setRoteiro(secoes);
      setAvaliacao(resultado.avaliacao);
      setUso(resultado.uso);
      setEtapa("pronto");

      setTimeout(() => {
        roteiroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (erro) {
      setEtapa("erro");
      setErroMensagem(
        erro instanceof ErroApi
          ? primeiraMensagemDeCampos(erro.campos) ?? erro.message
          : "Erro ao gerar roteiro. Tente novamente."
      );
    }
  }

  async function copiarRoteiro() {
    if (!roteiro) return;
    const texto = roteiro
      .map((s) => `[${s.label}${s.tempo ? ` · ${s.tempo}` : ""}]\n${s.conteudo}`)
      .join("\n\n");
    await navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
  }

  function resetar() {
    setEtapa("ocioso");
    setRoteiro(null);
    setAvaliacao(null);
    setErroMensagem("");
  }

  // ---------------------------------------------------------------------------
  // Estados de carregamento
  // ---------------------------------------------------------------------------

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel">
        {acordando ? (
          <AcordandoEstudio />
        ) : (
          <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
            <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
            Abrindo estúdio…
          </p>
        )}
      </main>
    );
  }

  const temaTamanho = config.tema.length;
  const podeCriar = temaTamanho > 0 && temaTamanho <= 280;
  const limiteAtingido = uso ? uso.usadosNoMes >= uso.limiteMensal : false;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "← Voltar", href: "/dashboard" },
          { rotulo: "Designer", ativo: true },
          { rotulo: "Configurações", href: "/configuracoes" },
        ]}
        badgeAdmin="nenhum"
      />

      {/* ── CORPO ── */}
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-12 sm:px-6">

        {/* Título da seção */}
        <div className="mb-10">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
            [Bancada de criação]
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            DESIGNER DE{" "}
            <span className="marca-texto marca-texto-animado">ROTEIROS</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-tinta-suave">
            Configure o padrão estrutural, informe o tema e deixe a IA construir
            um roteiro otimizado para retenção — com gancho, virada e CTA.
          </p>
        </div>

        <div className="grid gap-8 lg:grid-cols-[1fr_420px]">

          {/* ── COLUNA ESQUERDA: formulário ── */}
          <section className="space-y-7">

            {/* Tema */}
            <fieldset className="space-y-2">
              <div className="flex items-baseline justify-between">
                <legend className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                  Tema / Ideia central
                </legend>
                <TagContador atual={temaTamanho} maximo={280} />
              </div>
              <CampoSublinhado
                id="campo-tema"
                rotulo="Tema / Ideia central"
                mostrarRotulo={false}
                linhas={4}
                maximo={280}
                placeholder="Ex: Por que a maioria das pessoas não consegue economizar dinheiro mesmo ganhando bem…"
                valor={config.tema}
                onChange={(v) => atualizarConfig("tema", v)}
              />
            </fieldset>

            {/* Formato */}
            <fieldset className="space-y-3">
              <legend className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                Formato do vídeo
              </legend>
              <div className="flex flex-wrap gap-2">
                {FORMATOS.map((f) => (
                  <button
                    key={f.valor}
                    type="button"
                    id={`formato-${f.valor}`}
                    onClick={() => atualizarConfig("formato", f.valor)}
                    className={`flex items-center gap-1.5 border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                      config.formato === f.valor
                        ? "border-tinta bg-tinta text-papel"
                        : "border-tinta/20 text-tinta-suave hover:border-tinta/50 hover:text-tinta"
                    }`}
                  >
                    {f.label}
                    <span
                      className={`rounded-sm px-1 text-[10px] font-bold ${
                        config.formato === f.valor ? "bg-marca text-tinta" : "bg-tinta/10"
                      }`}
                    >
                      {f.duracao}
                    </span>
                  </button>
                ))}
              </div>
            </fieldset>

            {/* Tom narrativo */}
            <fieldset className="space-y-3">
              <legend className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                Tom narrativo
              </legend>
              <div className="space-y-2">
                {TONS.map((t) => (
                  <label
                    key={t.valor}
                    id={`tom-${t.valor}`}
                    className={`flex cursor-pointer items-start gap-3 border p-3 transition-all ${
                      config.tom === t.valor
                        ? "border-tinta bg-tinta text-papel"
                        : "border-tinta/15 hover:border-tinta/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="tom"
                      value={t.valor}
                      checked={config.tom === t.valor}
                      onChange={() => atualizarConfig("tom", t.valor)}
                      className="sr-only"
                    />
                    <span
                      aria-hidden
                      className={`mt-0.5 size-3.5 shrink-0 rounded-full border-2 transition-colors ${
                        config.tom === t.valor
                          ? "border-marca bg-marca"
                          : "border-tinta/30"
                      }`}
                    />
                    <span className="flex flex-col gap-0.5">
                      <span className="font-mono text-xs font-semibold uppercase tracking-wider">
                        {t.label}
                      </span>
                      <span
                        className={`text-xs leading-snug ${
                          config.tom === t.valor ? "text-papel/70" : "text-cinza"
                        }`}
                      >
                        {t.descricao}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            {/* Campos opcionais */}
            <fieldset className="space-y-4">
              <legend className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                Detalhes opcionais
              </legend>

              <CampoSublinhado
                id="campo-publico"
                rotulo="Público-alvo"
                maxLength={80}
                placeholder="Ex: empreendedores de 25–40 anos, iniciantes em finanças…"
                valor={config.publico}
                onChange={(v) => atualizarConfig("publico", v)}
              />

              <CampoSublinhado
                id="campo-palavra-chave"
                rotulo="Palavra-chave / Gancho principal"
                maxLength={60}
                placeholder="Ex: extrato de 90 dias, segredo dos ricos…"
                valor={config.palavraChave}
                onChange={(v) => atualizarConfig("palavraChave", v)}
              />
            </fieldset>

            {/* Botão gerar */}
            <div className="pt-2">
              {etapa === "pronto" || etapa === "erro" ? (
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    id="btn-novo-roteiro"
                    onClick={resetar}
                    className="border border-tinta/20 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave transition-colors hover:border-tinta hover:text-tinta"
                  >
                    Novo roteiro
                  </button>
                  <PulsoBadge etapa={etapa} />
                </div>
              ) : (
                <button
                  type="button"
                  id="btn-gerar-roteiro"
                  onClick={gerarRoteiroHandler}
                  disabled={!podeCriar || etapa !== "ocioso" || !!limiteAtingido}
                  className="flex items-center gap-3 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {limiteAtingido ? (
                    <>
                      <span aria-hidden className="inline-block size-2 rounded-full bg-rec" />
                      Limite mensal atingido
                    </>
                  ) : etapa === "ocioso" ? (
                    <>
                      <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
                      Criar roteiro
                    </>
                  ) : (
                    <PulsoBadge etapa={etapa} />
                  )}
                </button>
              )}

              {erroMensagem && (
                <p className="mt-3 font-mono text-xs text-rec">{erroMensagem}</p>
              )}

              {/* Contador de uso */}
              {uso && (
                <div className="mt-4 flex items-center gap-3">
                  <span className={`font-mono text-xs tabular-nums ${
                    limiteAtingido ? "font-semibold text-rec" : "text-cinza"
                  }`}>
                    {uso.usadosNoMes}/{uso.limiteMensal} roteiros neste mês
                  </span>
                  {limiteAtingido && (
                    <Link
                      href="/planos"
                      className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec underline decoration-rec/30 underline-offset-4 hover:text-tinta"
                    >
                      Upgrade →
                    </Link>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── COLUNA DIREITA: preview / resultado ── */}
          <section ref={roteiroRef} aria-label="Resultado do roteiro">
            {etapa === "ocioso" && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-4 border border-dashed border-tinta/15 px-8 py-12 text-center">
                <div className="font-display text-5xl text-tinta/10">G</div>
                <p className="max-w-xs font-mono text-xs leading-relaxed text-cinza">
                  Configure o tema e as opções ao lado e clique em{" "}
                  <strong className="text-tinta-suave">Criar roteiro</strong> para
                  ver sua estrutura viral aqui.
                </p>
              </div>
            )}

            {(etapa === "analisando" || etapa === "escrevendo" || etapa === "refinando") && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 border border-tinta/10 px-8 py-12">
                <div className="space-y-3 text-center">
                  <PulsoBadge etapa={etapa} />
                  <p className="font-mono text-xs text-cinza">
                    {etapa === "analisando"
                      ? "Carregando padrões virais do banco…"
                      : etapa === "refinando"
                      ? "Refinando com base na avaliação…"
                      : "Criando roteiro com IA…"}
                  </p>
                </div>

                {/* Skeleton */}
                <div className="w-full space-y-3 opacity-40">
                  {[80, 100, 60, 90, 70].map((w, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="h-2 w-16 animate-pulse rounded-sm bg-tinta/20" />
                      <div
                        style={{ width: `${w}%` }}
                        className="h-3 animate-pulse rounded-sm bg-tinta/10"
                      />
                      <div className="h-3 w-full animate-pulse rounded-sm bg-tinta/10" />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {etapa === "pronto" && roteiro && (
              <div className="space-y-1 border border-tinta/10">
                {/* Cabeçalho do resultado */}
                <div className="flex items-center justify-between border-b border-tinta/10 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span aria-hidden className="inline-block size-2 rounded-full bg-tinta" />
                    <span className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                      Roteiro
                    </span>
                    <span className="rounded-sm bg-tinta/8 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cinza">
                      {FORMATOS.find((f) => f.valor === config.formato)?.label}{" "}
                      {FORMATOS.find((f) => f.valor === config.formato)?.duracao}
                    </span>
                  </div>
                  <button
                    type="button"
                    id="btn-copiar-roteiro"
                    onClick={copiarRoteiro}
                    className="font-mono text-xs uppercase tracking-widest text-tinta-suave underline decoration-marca decoration-2 underline-offset-4 transition-colors hover:text-tinta"
                  >
                    {copiado ? "✓ Copiado!" : "Copiar"}
                  </button>
                </div>

                {/* Seções */}
                {roteiro.map((secao, i) => (
                  <div
                    key={i}
                    className="group border-b border-tinta/8 px-4 py-4 last:border-b-0 transition-colors hover:bg-tinta/3"
                  >
                    <div className="mb-1.5 flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-tinta">
                        {secao.label}
                      </span>
                      {secao.tempo && (
                        <span className="font-mono text-[10px] text-cinza">
                          {secao.tempo}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed text-tinta-suave">
                      {secao.conteudo}
                    </p>
                  </div>
                ))}

                {/* Notas da avaliação */}
                {avaliacao && (
                  <div className="border-t border-tinta/10 bg-tinta/3 px-4 py-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className={`rounded-sm px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
                        avaliacao.aprovado
                          ? "bg-marca text-tinta"
                          : "bg-rec/20 text-rec"
                      }`}>
                        {avaliacao.aprovado ? "✓ Aprovado" : "⚠ Nota abaixo do ideal"}
                        {" · "}{avaliacao.notaFinal}/10
                        {avaliacao.tentativas > 1 ? ` · ${avaliacao.tentativas} tentativas` : ""}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-3">
                      {([
                        ["Gancho", avaliacao.notas.gancho],
                        ["Retenção", avaliacao.notas.retencao],
                        ["CTA", avaliacao.notas.cta],
                        ["Clareza", avaliacao.notas.clareza],
                        ["Adequação", avaliacao.notas.adequacao],
                      ] as const).map(([label, nota]) => (
                        <span key={label} className="font-mono text-[10px] text-cinza">
                          {label}{" "}
                          <span className={`font-semibold ${
                            nota >= 8 ? "text-tinta" : nota >= 6 ? "text-tinta-suave" : "text-rec"
                          }`}>
                            {nota}/10
                          </span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Dicas de estrutura — visíveis no estado ocioso */}
            {etapa === "ocioso" && (
              <div className="mt-6 space-y-3 border-t border-tinta/10 pt-6">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
                  Anatomia de um vídeo viral
                </p>
                {[
                  { sigla: "G", nome: "Gancho", desc: "0–3s · prende antes do swipe" },
                  { sigla: "P", nome: "Problema", desc: "3–12s · espelha a dor do público" },
                  { sigla: "V", nome: "Virada", desc: "12–25s · a informação que surpreende" },
                  { sigla: "PR", nome: "Prova", desc: "25–45s · credibilidade e detalhe" },
                  { sigla: "C", nome: "Call to Action", desc: "45s+ · convite direto" },
                ].map((item) => (
                  <div
                    key={item.sigla}
                    className="flex items-start gap-3 text-xs"
                  >
                    <span className="flex size-5 shrink-0 items-center justify-center rounded-sm bg-marca font-mono text-[10px] font-bold text-tinta">
                      {item.sigla}
                    </span>
                    <span className="flex flex-col">
                      <span className="font-semibold text-tinta">{item.nome}</span>
                      <span className="text-cinza">{item.desc}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* ── RODAPÉ MÍNIMO ── */}
      <RodapeApp />
    </div>
  );
}
