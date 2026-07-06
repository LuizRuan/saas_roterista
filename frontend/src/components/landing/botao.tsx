import Link from "next/link";
import type { ReactNode } from "react";

const base =
  "inline-flex items-center justify-center gap-2 font-mono text-sm font-semibold uppercase tracking-wide px-6 py-3.5 rounded-md transition-colors";

const variantes = {
  primario: `${base} bg-tinta text-papel hover:bg-tinta-suave`,
  marca: `${base} bg-marca text-tinta hover:bg-[#ffe45c]`,
  fantasma: `${base} border border-tinta/25 text-tinta hover:border-tinta hover:bg-tinta/5`,
} as const;

export function Botao({
  href,
  variante = "primario",
  children,
  className = "",
}: {
  href: string;
  variante?: keyof typeof variantes;
  children: ReactNode;
  className?: string;
}) {
  return (
    <Link href={href} className={`${variantes[variante]} ${className}`}>
      {children}
    </Link>
  );
}
