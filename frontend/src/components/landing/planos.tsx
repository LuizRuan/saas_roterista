import { Botao } from "./botao";
import { Marcador } from "./marcador";
import { Reveal } from "./reveal";

const planoFree = [
  "5 roteiros por mês",
  "Tema personalizado",
  "Público-alvo personalizado",
  "Modelo de IA básico",
];

const planoPro = [
  "50 roteiros por mês",
  "Modelo de IA premium e prioridade de geração",
  "Mais chances de criar vídeos que prendem a atenção",
  "Tom narrativo personalizado",
  "Gancho personalizado",
];

export function Planos() {
  return (
    <section id="planos" className="border-y border-tinta/10 bg-papel-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <Marcador tempo="00:32" cena="Planos" />
          <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
            COMECE GRÁTIS. EVOLUA QUANDO FIZER SENTIDO.
          </h2>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-2 lg:max-w-4xl">
          <Reveal className="h-full">
            <article className="flex h-full flex-col rounded-lg border border-tinta/15 bg-papel p-6">
              <h3 className="font-mono text-sm font-semibold uppercase tracking-widest">
                Free
              </h3>
              <p className="mt-3 font-display text-4xl">R$ 0</p>
              <p className="mt-1 text-sm text-cinza">para sempre</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {planoFree.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-snug">
                    <span aria-hidden className="mt-1 font-mono text-rec">→</span>
                    <span className="text-tinta-suave">{item}</span>
                  </li>
                ))}
              </ul>
              <Botao href="/cadastro" className="mt-8 w-full">
                Começar grátis
              </Botao>
            </article>
          </Reveal>

          <Reveal delay={0.08} className="h-full">
            <article className="relative flex h-full flex-col rounded-lg border-2 border-tinta bg-papel p-6 shadow-[6px_6px_0_0_rgba(19,18,16,0.15)]">
              <p className="absolute -top-3 right-5 rounded-sm bg-marca px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide">
                Recomendado
              </p>
              <h3 className="font-mono text-sm font-semibold uppercase tracking-widest">
                Pro
              </h3>
              <p className="mt-3 flex items-baseline gap-1.5 font-display text-5xl">
                <span className="marca-texto">R$&nbsp;19,90</span>
                <span className="font-mono text-base font-normal text-cinza">/mês</span>
              </p>
              <p className="mt-2 text-sm text-cinza">
                Pague com Pix · 30 dias · sem assinatura automática
              </p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {planoPro.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-snug">
                    <span aria-hidden className="mt-1 font-mono text-rec">→</span>
                    <span className="text-tinta-suave">{item}</span>
                  </li>
                ))}
              </ul>
              <Botao href="/planos" variante="marca" className="mt-8 w-full">
                Assinar com Pix
              </Botao>
            </article>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
