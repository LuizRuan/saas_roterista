import { Marcador } from "./marcador";
import { Reveal } from "./reveal";

const exemplos = [
  {
    nicho: "Finanças pessoais",
    formato: "Reels · ~45s",
    gancho: "“Seu Pix está roubando dinheiro de você todos os dias.”",
    linhas: [
      "[00:05] os 3 vazamentos invisíveis do seu Pix",
      "[00:22] texto na tela: “o nº 3 tá no seu bolso agora”",
      "[00:40] CTA — “Comenta AI que eu mando a planilha.”",
    ],
  },
  {
    nicho: "Fitness",
    formato: "Shorts · ~35s",
    gancho: "“Treinar mais não faz você crescer mais.”",
    linhas: [
      "[00:04] corte seco — por que descanso constrói músculo",
      "[00:18] demonstração: divisão de treino em 4 dias",
      "[00:30] CTA — “Salva pra montar seu treino da semana.”",
    ],
  },
  {
    nicho: "Estudos & concursos",
    formato: "TikTok · ~40s",
    gancho: "“Você não está reprovando porque estuda pouco.”",
    linhas: [
      "[00:05] o método de 90 minutos que aprova mais",
      "[00:24] texto na tela: “ciclo 3 × 30”",
      "[00:35] CTA — “Segue pra parte 2: o cronograma pronto.”",
    ],
  },
];

export function Exemplos() {
  return (
    <section id="exemplos" className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <Reveal>
        <Marcador tempo="00:15" cena="Exemplos — demonstração" />
        <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
          O GANCHO VEM <span className="marca-texto">MARCADO</span> NO ROTEIRO
        </h2>
        <p className="mt-4 max-w-2xl leading-relaxed text-tinta-suave">
          Três roteiros gerados pelo Gancho em modo demonstração, um por nicho.
          Repare: o primeiro segundo sempre carrega a tensão — é isso que os
          padrões virais têm em comum.
        </p>
      </Reveal>

      <div className="mt-12 grid gap-6 md:grid-cols-3">
        {exemplos.map((exemplo, i) => (
          <Reveal key={exemplo.nicho} delay={i * 0.08} className="h-full">
            <article className="flex h-full flex-col rounded-lg border border-tinta/15 bg-papel-card shadow-[4px_4px_0_0_rgba(19,18,16,0.1)]">
              <div className="flex items-center justify-between gap-2 border-b border-tinta/10 px-4 py-2.5">
                <p className="font-mono text-xs font-semibold uppercase tracking-wide text-tinta">
                  {exemplo.nicho}
                </p>
                <p className="rounded-sm bg-marca px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-tinta">
                  Demonstração
                </p>
              </div>

              <div className="flex-1 px-4 py-4 font-mono text-[13px] leading-6">
                <p className="text-cinza">
                  <span className="text-rec">[00:00]</span> GANCHO
                </p>
                <p className="mt-1 font-medium">
                  <span className="marca-texto">{exemplo.gancho}</span>
                </p>
                <div className="mt-3 space-y-1.5 text-tinta-suave">
                  {exemplo.linhas.map((linha) => (
                    <p key={linha}>{linha}</p>
                  ))}
                </div>
              </div>

              <p className="border-t border-tinta/10 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest text-cinza">
                {exemplo.formato}
              </p>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal>
        <p className="mt-8 max-w-2xl font-mono text-xs leading-5 text-cinza">
          * Roteiros ilustrativos gerados em modo demonstração. O resultado de
          um vídeo depende de execução, nicho e consistência — nenhuma
          ferramenta garante viralização.
        </p>
      </Reveal>
    </section>
  );
}
