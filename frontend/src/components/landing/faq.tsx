import { Marcador } from "./marcador";
import { Reveal } from "./reveal";

const perguntas = [
  {
    pergunta: "A IA garante que meu vídeo vai viralizar?",
    resposta:
      "Não — e desconfie de qualquer ferramenta que prometa isso. O que o Gancho faz é aumentar a probabilidade: seu roteiro segue a estrutura de retenção que vídeos virais do seu nicho têm em comum (tipo de gancho, ritmo, momento do CTA). Gravação, edição e consistência continuam com você.",
  },
  {
    pergunta: "Em que isso é diferente de pedir roteiro pro ChatGPT?",
    resposta:
      "Modelos genéricos escrevem texto solto. O Gancho monta o roteiro sobre padrões estruturais extraídos de vídeos que performaram — onde entra o corte, quando aparece o texto na tela, que formato de CTA segura o espectador. A diferença está na estrutura, não no floreio.",
  },
  {
    pergunta: "Funciona para qual plataforma?",
    resposta:
      "Shorts, Reels e TikTok primeiro — vídeo curto é onde estrutura de retenção mais pesa. No plano Pro, também formatos longos para YouTube.",
  },
  {
    pergunta: "Preciso de cartão para testar?",
    resposta:
      "Não. O plano gratuito não pede cartão e inclui 5 roteiros por mês.",
  },
  {
    pergunta: "Os roteiros gerados são meus?",
    resposta:
      "Sim. Tudo o que você gera é seu, inclusive para uso comercial nos seus canais.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6">
      <Reveal>
        <Marcador tempo="00:47" cena="Perguntas honestas" />
        <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-5xl">
          SEM LETRA MIÚDA
        </h2>
      </Reveal>

      <div className="mt-10 divide-y divide-tinta/10 border-y border-tinta/10">
        {perguntas.map((item, i) => (
          <Reveal key={item.pergunta} delay={i * 0.05}>
            <details className="faq-item group py-1">
              <summary className="flex cursor-pointer list-none items-baseline justify-between gap-4 py-4 text-left font-semibold leading-snug hover:text-tinta-suave">
                {item.pergunta}
                <span
                  aria-hidden
                  className="faq-seta shrink-0 font-mono text-xl leading-none text-rec transition-transform"
                >
                  +
                </span>
              </summary>
              <p className="pb-5 leading-relaxed text-tinta-suave">
                {item.resposta}
              </p>
            </details>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
