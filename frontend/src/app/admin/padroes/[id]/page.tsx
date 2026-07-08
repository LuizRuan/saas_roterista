"use client";

import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { usuarioAtual, sair, listarPadroes, type Usuario, type PadraoViral } from "@/lib/api";
import { FormularioPadrao } from "@/components/admin/formulario-padrao";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";

export default function PaginaEditarPadrao() {
  const router = useRouter();
  const params = useParams();
  const id = params?.id as string;

  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [padrao, setPadrao] = useState<PadraoViral | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [naoEncontrado, setNaoEncontrado] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const [u, lista] = await Promise.all([usuarioAtual(), listarPadroes()]);
        if (!ativo) return;
        if (!u || u.papel !== "admin") { router.replace("/dashboard"); return; }
        setUsuario(u);

        // Busca o padrão pelo id na lista
        const encontrado = lista.find((p) => p.id === id);
        if (!encontrado) { setNaoEncontrado(true); setCarregando(false); return; }
        setPadrao(encontrado);
        setCarregando(false);
      } catch {
        if (ativo) router.replace("/admin");
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [router, id]);

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
          <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
          Carregando padrão…
        </p>
      </main>
    );
  }

  if (naoEncontrado) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-mono text-xs uppercase tracking-widest text-rec">[Não encontrado]</p>
        <h1 className="font-display text-3xl">Padrão não encontrado</h1>
        <Link href="/admin" className="font-mono text-xs uppercase tracking-widest text-tinta-suave underline decoration-marca underline-offset-4">← Voltar ao admin</Link>
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
          { rotulo: "Editar", ativo: true },
        ]}
        badgeAdmin="logo-sempre"
        textoUsuario={<>{usuario?.nome?.split(" ")[0]} · admin</>}
      />

      <main className="mx-auto max-w-3xl px-4 pb-24 pt-10 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">[Editar padrão]</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          EDITAR <span className="marca-texto marca-texto-animado">PADRÃO</span>
        </h1>
        <p className="mt-1 font-mono text-xs text-cinza">{padrao?.titulo}</p>

        <div className="mt-10">
          <FormularioPadrao padraoExistente={padrao!} />
        </div>
      </main>

      <RodapeApp texto="Gancho · Painel Admin" />
    </div>
  );
}
