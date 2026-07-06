"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { sair, usuarioAtual, type Usuario } from "@/lib/api";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

type FormatoVideo =
  | "reels-60s"
  | "reels-30s"
  | "shorts-60s"
  | "tiktok-15s"
  | "tiktok-60s"
  | "youtube-3min";

type TomNarrativo =
  | "urgente"
  | "inspirador"
  | "provocador"
  | "educativo"
  | "curioso";

type EtapaGeracao = "ocioso" | "analisando" | "escrevendo" | "pronto" | "erro";

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
  { valor: "youtube-3min", label: "YouTube", duracao: "3min" },
];

const TONS: { valor: TomNarrativo; label: string; descricao: string }[] = [
  { valor: "urgente", label: "Urgente", descricao: "Cria senso de escassez ou perigo" },
  { valor: "inspirador", label: "Inspirador", descricao: "Motiva e emociona o espectador" },
  { valor: "provocador", label: "Provocador", descricao: "Confronta uma crença comum" },
  { valor: "educativo", label: "Educativo", descricao: "Ensina algo em passos simples" },
  { valor: "curioso", label: "Curioso", descricao: "Abre uma pergunta que prende" },
];

// Roteiro de demonstração — nunca apresentado como real
const ROTEIRO_DEMO: SecaoRoteiro[] = [
  {
    label: "GANCHO",
    tempo: "0–3s",
    conteudo:
      "Você está perdendo dinheiro todo mês sem perceber — e a maioria das pessoas nem sabe disso.",
  },
  {
    label: "PROBLEMA",
    tempo: "3–12s",
    conteudo:
      "A maioria das pessoas trabalha para pagar contas que poderiam ser eliminadas. Assinaturas esquecidas, taxas escondidas, hábitos automáticos. Dinheiro que some sem que você veja.",
  },
  {
    label: "VIRADA",
    tempo: "12–25s",
    conteudo:
      "Mas tem uma regra simples que muda isso: o extrato de 90 dias. Abra seu banco agora, vá em histórico e some tudo que saiu nos últimos 3 meses. O número vai te chocar.",
  },
  {
    label: "PROVA",
    tempo: "25–45s",
    conteudo:
      "Fiz isso em janeiro. Encontrei R$ 340 em assinaturas que não usava. Cancela em 5 minutos. É dinheiro de volta no bolso sem mudar um hábito sequer.",
  },
  {
    label: "CALL TO ACTION",
    tempo: "45–60s",
    conteudo:
      "Salva esse vídeo, faz o teste agora e me conta nos comentários: quanto você achou de desperdício? Segue pra mais desses.",
  },
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
  const [erroMensagem, setErroMensagem] = useState("");
  const roteiroRef = useRef<HTMLDivElement>(null);

  // Copiado
  const [copiado, setCopiado] = useState(false);

  // ---------------------------------------------------------------------------
  // Auth guard
  // ---------------------------------------------------------------------------
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

  async function gerarRoteiro() {
    if (!config.tema.trim()) return;

    setEtapa("analisando");
    setRoteiro(null);
    setErroMensagem("");

    // Fase 4: aqui entrará a chamada real à API de IA.
    // Por enquanto, simula o fluxo com o roteiro de demonstração.
    await new Promise((r) => setTimeout(r, 1400));
    setEtapa("escrevendo");
    await new Promise((r) => setTimeout(r, 1800));
    setRoteiro(ROTEIRO_DEMO);
    setEtapa("pronto");

    // Rola suavemente até o resultado
    setTimeout(() => {
      roteiroRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
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
    setErroMensagem("");
  }

  // ---------------------------------------------------------------------------
  // Estados de carregamento
  // ---------------------------------------------------------------------------

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel">
        <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Abrindo estúdio…
        </p>
      </main>
    );
  }

  const temaTamanho = config.tema.length;
  const podeCriar = temaTamanho > 0 && temaTamanho <= 280;

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="min-h-screen bg-papel">
      {/* ── CABEÇALHO ── */}
      <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span aria-hidden className="rec-pulso inline-block size-2.5 rounded-full bg-rec" />
            <span className="font-display text-xl tracking-wide">GANCHO</span>
          </Link>

          <nav className="hidden items-center gap-6 sm:flex">
            <Link
              href="/dashboard"
              className="font-mono text-xs uppercase tracking-widest text-cinza transition-colors hover:text-tinta"
            >
              Início
            </Link>
            <span className="font-mono text-xs uppercase tracking-widest text-tinta underline decoration-marca decoration-2 underline-offset-4">
              Designer
            </span>
          </nav>

          <div className="flex items-center gap-4">
            <p className="hidden font-mono text-xs uppercase tracking-widest text-tinta-suave sm:block">
              {usuario?.nome?.split(" ")[0]} · plano{" "}
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
          {etapa === "pronto" && (
            <div className="mt-2">
              <span className="inline-block rounded bg-marca px-2 py-0.5 font-mono text-xs font-semibold uppercase tracking-wider text-tinta">
                ⚠ DEMONSTRAÇÃO — conteúdo gerado para ilustrar o fluxo
              </span>
            </div>
          )}
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
              <textarea
                id="campo-tema"
                rows={4}
                maxLength={320}
                placeholder="Ex: Por que a maioria das pessoas não consegue economizar dinheiro mesmo ganhando bem…"
                value={config.tema}
                onChange={(e) => atualizarConfig("tema", e.target.value)}
                className="w-full resize-none rounded-none border-b-2 border-tinta/20 bg-transparent px-0 py-2 text-sm leading-relaxed placeholder:text-cinza focus:border-tinta focus:outline-none"
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
                      className={`rounded px-1 text-[10px] font-bold ${
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

              <div className="space-y-1">
                <label
                  htmlFor="campo-publico"
                  className="font-mono text-xs uppercase tracking-widest text-tinta-suave"
                >
                  Público-alvo
                </label>
                <input
                  id="campo-publico"
                  type="text"
                  maxLength={80}
                  placeholder="Ex: empreendedores de 25–40 anos, iniciantes em finanças…"
                  value={config.publico}
                  onChange={(e) => atualizarConfig("publico", e.target.value)}
                  className="w-full border-b border-tinta/15 bg-transparent py-1.5 text-sm placeholder:text-cinza focus:border-tinta focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="campo-palavra-chave"
                  className="font-mono text-xs uppercase tracking-widest text-tinta-suave"
                >
                  Palavra-chave / Gancho principal
                </label>
                <input
                  id="campo-palavra-chave"
                  type="text"
                  maxLength={60}
                  placeholder="Ex: extrato de 90 dias, segredo dos ricos…"
                  value={config.palavraChave}
                  onChange={(e) => atualizarConfig("palavraChave", e.target.value)}
                  className="w-full border-b border-tinta/15 bg-transparent py-1.5 text-sm placeholder:text-cinza focus:border-tinta focus:outline-none"
                />
              </div>
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
                  onClick={gerarRoteiro}
                  disabled={!podeCriar || etapa !== "ocioso"}
                  className="flex items-center gap-3 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {etapa === "ocioso" ? (
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

            {(etapa === "analisando" || etapa === "escrevendo") && (
              <div className="flex min-h-[360px] flex-col items-center justify-center gap-6 border border-tinta/10 px-8 py-12">
                <div className="space-y-3 text-center">
                  <PulsoBadge etapa={etapa} />
                  <p className="font-mono text-xs text-cinza">
                    {etapa === "analisando"
                      ? "Cruzando padrões de retenção…"
                      : "Montando estrutura cena a cena…"}
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
                    <span className="rounded bg-tinta/8 px-1.5 py-0.5 font-mono text-[10px] uppercase tracking-wider text-cinza">
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

                {/* Rodapé do card */}
                <div className="border-t border-tinta/10 bg-tinta/3 px-4 py-3">
                  <p className="font-mono text-[10px] leading-snug text-cinza">
                    Demonstração · padrão estrutural gerado pela IA · não representa
                    um roteiro real do usuário
                  </p>
                </div>
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
      <footer className="border-t border-tinta/10 py-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cinza">
          Gancho · Roteiros virais com IA
        </p>
      </footer>
    </div>
  );
}
