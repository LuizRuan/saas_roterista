import { Marcador } from "./marcador";
import { Reveal } from "./reveal";

const passos = [
  {
    titulo: "Diga o tema",
    texto: "Um campo, uma ideia. Ex.: “como acordar às 5h sem sofrer”.",
  },
  {
    titulo: "A IA busca os padrões do seu nicho",
    texto:
      "Tipo de gancho, ritmo de cortes e formato de CTA que seguram atenção em vídeos virais parecidos com o seu.",
  },
  {
    titulo: "Receba o roteiro pronto para gravar",
    texto:
      "Gancho, desenvolvimento e CTA — com marcação de tempo e indicações de corte e texto na tela.",
  },
  {
    titulo: "Exporte e grave",
    texto: "Copie, cole no teleprompter e aperte o REC.",
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="border-y border-tinta/10 bg-papel-card">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <Marcador tempo="00:04" cena="Como funciona" />
          <h2 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
            DO TEMA AO ROTEIRO EM QUATRO PASSOS
          </h2>
        </Reveal>

        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {passos.map((passo, i) => (
            <Reveal key={passo.titulo} delay={i * 0.08}>
              <li className="h-full border-t-2 border-tinta pt-4">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
                  Passo {i + 1}
                </p>
                <h3 className="mt-2 text-lg font-semibold">{passo.titulo}</h3>
                <p className="mt-2 leading-relaxed text-tinta-suave">
                  {passo.texto}
                </p>
              </li>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
