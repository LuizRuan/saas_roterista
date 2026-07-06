import Link from "next/link";

/**
 * Placeholder para rotas que chegam nas próximas fases
 * (cadastro, login, planos, termos, privacidade).
 */
export function PaginaEmProducao({
  titulo,
  texto,
  voltar = "/",
  voltarTexto = "Voltar para o início",
}: {
  titulo: string;
  texto: string;
  voltar?: string;
  voltarTexto?: string;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
        [Em produção]
      </p>
      <h1 className="mt-4 max-w-xl font-display text-4xl tracking-tight sm:text-5xl">
        {titulo}
      </h1>
      <p className="mt-4 max-w-md leading-relaxed text-tinta-suave">{texto}</p>
      <Link
        href={voltar}
        className="mt-8 font-mono text-sm uppercase tracking-widest underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta-suave"
      >
        ← {voltarTexto}
      </Link>
    </main>
  );
}
