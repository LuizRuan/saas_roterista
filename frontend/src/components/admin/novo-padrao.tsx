"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usuarioAtual, sair, type Usuario } from "@/lib/api";
import { FormularioPadrao } from "@/components/admin/formulario-padrao";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";

export function NovoPadrao() {
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
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "Padrões", href: "/admin" },
          { rotulo: "Novo padrão", ativo: true },
        ]}
        badgeAdmin="logo-sempre"
        textoUsuario={<>{usuario?.nome?.split(" ")[0]} · admin</>}
      />

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

      <RodapeApp texto="Gancho · Painel Admin" />
    </div>
  );
}
