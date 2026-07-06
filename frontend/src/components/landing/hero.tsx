"use client";

import { motion, useReducedMotion } from "motion/react";
import { Botao } from "./botao";
import { Marcador } from "./marcador";

/** Linhas do roteiro de demonstração que "digita" no card do hero. */
const linhasRoteiro = [
  { tempo: "00:00", tipo: "secao", texto: "GANCHO" },
  {
    tempo: null,
    tipo: "fala-gancho",
    texto: "“Acordar às 5h arruinou minha vida — por três dias.”",
  },
  { tempo: "00:04", tipo: "direcao", texto: "corte seco → close no rosto" },
  { tempo: "00:07", tipo: "secao", texto: "DESENVOLVIMENTO" },
  {
    tempo: null,
    tipo: "fala",
    texto: "Os 3 erros de quem tenta acordar cedo (o nº 2 é o pior)…",
  },
  { tempo: "00:21", tipo: "direcao", texto: "texto na tela: “erro nº 2”" },
  { tempo: "00:38", tipo: "secao", texto: "CTA" },
  {
    tempo: null,
    tipo: "fala",
    texto: "“Salva esse vídeo pro seu despertador de amanhã.”",
  },
];

export function Hero() {
  const reduzido = useReducedMotion();

  const entrada = (delay: number) =>
    reduzido
      ? {}
      : {
          initial: { opacity: 0, y: 20 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.5, delay, ease: "easeOut" as const },
        };

  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-20 pt-14 sm:px-6 lg:grid-cols-[1.1fr_1fr] lg:gap-16 lg:pt-20">
      <div>
        <motion.div {...entrada(0)}>
          <Marcador tempo="00:00" cena="O gancho" />
        </motion.div>

        <motion.h1
          {...entrada(0.1)}
          className="mt-5 font-display text-5xl leading-[1.02] tracking-tight sm:text-6xl lg:text-7xl"
        >
          SEU VÍDEO VIVE OU MORRE NOS PRIMEIROS{" "}
          <span
            className={`marca-texto ${reduzido ? "" : "marca-texto-animado"}`}
          >
            3 SEGUNDOS
          </span>
          .
        </motion.h1>

        <motion.p
          {...entrada(0.25)}
          className="mt-6 max-w-xl text-lg leading-relaxed text-tinta-suave"
        >
          O Gancho gera roteiros a partir de padrões estruturais de vídeos que
          realmente viralizaram — gancho, ritmo de cortes e retenção. Não é
          texto genérico de IA: é estrutura que segura gente na tela.
        </motion.p>

        <motion.div
          {...entrada(0.4)}
          className="mt-8 flex flex-wrap items-center gap-4"
        >
          <Botao href="/cadastro">Testar agora grátis</Botao>
          <Botao href="#exemplos" variante="fantasma">
            Ver exemplos
          </Botao>
        </motion.div>

        <motion.p
          {...entrada(0.5)}
          className="mt-4 font-mono text-xs uppercase tracking-widest text-cinza"
        >
          Grátis · sem cartão · roteiro em segundos
        </motion.p>
      </div>

      <RoteiroDemo reduzido={!!reduzido} />
    </section>
  );
}

/** Card estilo teleprompter onde o roteiro de exemplo "é digitado". */
function RoteiroDemo({ reduzido }: { reduzido: boolean }) {
  return (
    <motion.div
      initial={reduzido ? false : { opacity: 0, y: 28 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
      className="rounded-lg border border-tinta/15 bg-papel-card shadow-[6px_6px_0_0_rgba(19,18,16,0.12)]"
    >
      <div className="flex items-center justify-between border-b border-tinta/10 px-4 py-2.5">
        <p className="font-mono text-xs text-tinta-suave">
          roteiro_001.txt —{" "}
          <span className="rounded-sm bg-marca px-1.5 py-0.5 font-semibold uppercase text-tinta">
            Demonstração
          </span>
        </p>
        <p className="flex items-center gap-1.5 font-mono text-xs font-semibold uppercase text-rec">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Rec
        </p>
      </div>

      <div className="px-5 py-5 font-mono text-[13px] leading-7 sm:text-sm">
        <p className="text-cinza">TEMA: acordar às 5h sem sofrer</p>

        {linhasRoteiro.map((linha, i) => {
          const delay = reduzido ? 0 : 0.6 + i * 0.3;
          return (
            <motion.p
              key={i}
              initial={reduzido ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.25, delay }}
              className={
                linha.tipo === "secao"
                  ? "mt-3 font-semibold tracking-widest text-tinta"
                  : linha.tipo === "direcao"
                    ? "text-cinza italic"
                    : "text-tinta-suave"
              }
            >
              {linha.tempo && <span className="text-rec">[{linha.tempo}] </span>}
              {linha.tipo === "fala-gancho" ? (
                <span
                  className={`marca-texto ${reduzido ? "" : "marca-texto-animado"}`}
                  style={reduzido ? undefined : { animationDelay: "3.2s" }}
                >
                  {linha.texto}
                </span>
              ) : (
                linha.texto
              )}
            </motion.p>
          );
        })}

        <motion.span
          aria-hidden
          initial={reduzido ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduzido ? 0 : 3 }}
          className="cursor-bloco mt-1 inline-block h-4 w-2 translate-y-0.5 bg-tinta"
        />
      </div>
    </motion.div>
  );
}
