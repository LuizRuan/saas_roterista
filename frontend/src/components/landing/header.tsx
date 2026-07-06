import Link from "next/link";
import { Botao } from "./botao";

const links = [
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#exemplos", rotulo: "Exemplos" },
  { href: "#planos", rotulo: "Planos" },
  { href: "#faq", rotulo: "FAQ" },
];

export function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2">
          <span
            aria-hidden
            className="rec-pulso inline-block size-2.5 rounded-full bg-rec"
          />
          <span className="font-display text-xl tracking-wide">GANCHO</span>
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-6 md:flex">
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="font-mono text-xs uppercase tracking-widest text-tinta-suave hover:text-tinta"
            >
              {link.rotulo}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="font-mono text-xs uppercase tracking-widest text-tinta-suave hover:text-tinta"
          >
            Entrar
          </Link>
          <Botao href="/cadastro" className="!px-4 !py-2 text-xs">
            Testar grátis
          </Botao>
        </div>
      </div>
    </header>
  );
}
