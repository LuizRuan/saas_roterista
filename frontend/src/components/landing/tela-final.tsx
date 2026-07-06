import Link from "next/link";
import { Botao } from "./botao";
import { Reveal } from "./reveal";

/** Bloco escuro no fim da página, como a tela final de um vídeo. */
export function TelaFinal() {
  return (
    <footer className="bg-tinta text-papel">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <p className="font-mono text-xs uppercase tracking-widest text-papel/60">
            <span className="text-marca">[00:58]</span> Tela final
          </p>
          <p className="mt-6 max-w-2xl font-mono text-sm leading-6 text-papel/70">
            Esta página seguiu a estrutura de um vídeo de 60 segundos — gancho,
            desenvolvimento, prova e CTA. Você chegou até aqui. É isso que um
            bom roteiro faz.
          </p>
          <h2 className="mt-6 max-w-3xl font-display text-4xl leading-tight tracking-tight sm:text-6xl">
            SEU PRÓXIMO VÍDEO COMEÇA COM UM BOM{" "}
            <span className="marca-texto-cheio text-tinta">GANCHO</span>.
          </h2>
          <div className="mt-8">
            <Botao href="/cadastro" variante="marca">
              Testar agora grátis
            </Botao>
          </div>
        </Reveal>

        <div className="mt-16 flex flex-col gap-4 border-t border-papel/15 pt-8 font-mono text-xs uppercase tracking-widest text-papel/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            <span aria-hidden className="mr-2 inline-block size-2 rounded-full bg-rec align-middle" />
            Gancho © {new Date().getFullYear()}
          </p>
          <nav aria-label="Rodapé" className="flex flex-wrap gap-6">
            <Link href="/termos" className="hover:text-papel">
              Termos
            </Link>
            <Link href="/privacidade" className="hover:text-papel">
              Privacidade
            </Link>
            <a href="mailto:contato@gancho.app" className="hover:text-papel">
              Contato
            </a>
          </nav>
        </div>
      </div>
    </footer>
  );
}
