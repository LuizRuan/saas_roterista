"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usuarioAtual, sair, type Usuario } from "@/lib/api";
import { FormularioPadrao } from "@/components/admin/formulario-padrao";

export default function PaginaNovoPadrao() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  useEffect(() => {
    let ativo = true;
    usuarioAtual().then((u) => {
      if (!ativo) return;
      if (!u || u.papel !== "admin") {
        router.replace("/dashboard");
        return;
      }
      setUsuario(u);
      setCarregando(false);
    }).catch(() => { if (ativo) router.replace("/dashboard"); });
    return () => { ativo = false; };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Carregando…
        </p>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-papel">
      <header className="sticky top-0 z-50 border-b border-tinta/10 bg-papel/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <span aria-hidden className="rec-pulso inline-block size-2.5 rounded-full bg-rec" />
              <span className="font-display text-xl tracking-wide">GANCHO</span>
            </Link>
            <span className="rounded bg-rec px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-papel">Admin</span>
          </div>
          <nav className="hidden items-center gap-6 sm:flex">
            <Link href="/admin" className="font-mono text-xs uppercase tracking-widest text-cinza transition-colors hover:text-tinta">Padrões</Link>
            <span className="font-mono text-xs uppercase tracking-widest text-tinta underline decoration-marca decoration-2 underline-offset-4">Novo padrão</span>
          </nav>
          <div className="flex items-center gap-4">
            <p className="hidden font-mono text-xs uppercase tracking-widest text-tinta-suave sm:block">
              {usuario?.nome?.split(" ")[0]} · admin
            </p>
            <button type="button" onClick={aoSair} disabled={saindo} className="font-mono text-xs uppercase tracking-widest text-tinta-suave underline decoration-marca decoration-2 underline-offset-4 hover:text-tinta disabled:opacity-60">
              {saindo ? "Saindo…" : "Sair"}
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">[Novo padrão]</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          ADICIONAR <span className="marca-texto marca-texto-animado">ROTEIRO</span>
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-relaxed text-tinta-suave">
          Preencha cada seção do roteiro viral. A IA usará este padrão como referência
          estrutural para gerar roteiros de todos os usuários.
        </p>

        <div className="mt-10">
          <FormularioPadrao />
        </div>
      </main>

      <footer className="border-t border-tinta/10 py-4 text-center">
        <p className="font-mono text-[10px] uppercase tracking-widest text-cinza">Gancho · Painel Admin</p>
      </footer>
    </div>
  );
}
