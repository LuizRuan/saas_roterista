import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Planos — Gancho" };

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

export default function PaginaPlanos() {
  return (
    <main className="min-h-screen bg-papel">
      <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
        <Link
          href="/dashboard"
          className="font-mono text-xs uppercase tracking-widest text-cinza underline decoration-tinta/20 underline-offset-4 transition-colors hover:text-tinta"
        >
          ← Voltar ao dashboard
        </Link>

        <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-widest text-rec">
          [Planos]
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
          COMECE GRÁTIS. EVOLUA QUANDO FIZER SENTIDO.
        </h1>
        <p className="mt-4 max-w-xl leading-relaxed text-tinta-suave">
          O plano gratuito está aberto e sem cartão. O Pro chega em breve — sem
          cobrança ativa por enquanto.
        </p>

        <div className="mt-12 grid gap-6 md:grid-cols-2">
          {/* Free */}
          <article className="flex h-full flex-col rounded-lg border border-tinta/15 bg-papel-card p-6">
            <h2 className="font-mono text-sm font-semibold uppercase tracking-widest">
              Free
            </h2>
            <p className="mt-3 font-display text-4xl">R$ 0</p>
            <p className="mt-1 text-sm text-cinza">para sempre</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {planoFree.map((item) => (
                <li key={item} className="flex gap-2.5 leading-snug">
                  <span aria-hidden className="mt-1 font-mono text-rec">
                    →
                  </span>
                  <span className="text-tinta-suave">{item}</span>
                </li>
              ))}
            </ul>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-tinta px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-papel transition-colors hover:bg-tinta-suave"
            >
              Seu plano atual
            </Link>
          </article>

          {/* Pro */}
          <article className="relative flex h-full flex-col rounded-lg border-2 border-tinta bg-papel-card p-6 shadow-[6px_6px_0_0_rgba(19,18,16,0.15)]">
            <p className="absolute -top-3 right-5 rounded-sm bg-marca px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-tinta">
              Em breve
            </p>
            <h2 className="font-mono text-sm font-semibold uppercase tracking-widest">
              Pro
            </h2>
            <p className="mt-3 font-display text-4xl">R$ —/mês</p>
            <p className="mt-1 text-sm text-cinza">preço de lançamento em breve</p>
            <ul className="mt-6 flex-1 space-y-2.5">
              {planoPro.map((item) => (
                <li key={item} className="flex gap-2.5 leading-snug">
                  <span aria-hidden className="mt-1 font-mono text-rec">
                    →
                  </span>
                  <span className="text-tinta-suave">{item}</span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              disabled
              className="mt-8 inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-md bg-tinta/40 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-papel"
            >
              Assinar — em breve
            </button>
          </article>
        </div>

        <p className="mt-8 font-mono text-xs leading-5 text-cinza">
          * Pagamentos ainda não estão ativos. Quando o Pro for lançado, você vai
          poder assinar por aqui — sem nenhuma cobrança até lá.
        </p>
      </div>
    </main>
  );
}
