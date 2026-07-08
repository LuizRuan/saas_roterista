"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { sair, usuarioAtual, excluirConta, ErroApi, type Usuario } from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";
import { AcordandoEstudio } from "@/components/app/acordando-estudio";
import { useEsperaLonga } from "@/hooks/use-espera-longa";
import { ModalExcluirConta } from "./modal-excluir-conta";

const PLANO_LABEL: Record<string, string> = { free: "Free", pro: "Pro" };

export function Configuracoes() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);
  const acordando = useEsperaLonga(carregando);

  useEffect(() => {
    let ativo = true;
    async function carregar() {
      try {
        const u = await usuarioAtual();
        if (!ativo) return;
        if (!u) { router.replace("/login"); return; }
        setUsuario(u);
        setCarregando(false);
        setTimeout(() => setMostrarConteudo(true), 80);
      } catch {
        if (ativo) router.replace("/login");
      }
    }
    carregar();
    return () => { ativo = false; };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  async function aoConfirmarExclusao(senha: string) {
    setExcluindo(true);
    setErroExclusao(null);
    try {
      await excluirConta(senha);
      router.replace("/");
    } catch (erro) {
      setErroExclusao(
        erro instanceof ErroApi ? erro.message : "Não foi possível excluir a conta. Tente novamente."
      );
    } finally {
      setExcluindo(false);
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        {acordando ? (
          <AcordandoEstudio />
        ) : (
          <p className="flex items-center gap-2 font-mono text-sm uppercase tracking-widest text-tinta-suave">
            <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
            Abrindo estúdio…
          </p>
        )}
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
          { rotulo: "← Voltar", href: "/dashboard" },
          { rotulo: "Designer", href: "/designer" },
          { rotulo: "Meus Roteiros", href: "/roteiros" },
          { rotulo: "Configurações", ativo: true },
        ]}
        badgeAdmin="nenhum"
      />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-10 sm:px-6">
        <div
          className={`transition-all duration-700 ${
            mostrarConteudo ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
            [Conta]
          </p>
          <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
            CONFIGURA<span className="marca-texto">ÇÕES</span>
          </h1>

          {/* Dados da conta */}
          <div className="mt-8 rounded-lg border border-tinta/15 bg-papel-card p-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cinza">
              Sua conta
            </p>
            <dl className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tinta-suave">Nome</dt>
                <dd className="font-medium text-tinta">{usuario?.nome}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tinta-suave">E-mail</dt>
                <dd className="font-medium text-tinta">{usuario?.email}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-tinta-suave">Plano</dt>
                <dd className="font-medium text-tinta">
                  {usuario ? PLANO_LABEL[usuario.plano] ?? usuario.plano : ""}
                </dd>
              </div>
            </dl>
          </div>

          {/* Zona de perigo */}
          <div className="mt-6 rounded-lg border border-rec/30 bg-rec/5 p-6">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
              Zona de perigo
            </p>
            <p className="mt-2 text-sm leading-relaxed text-tinta-suave">
              Excluir sua conta apaga permanentemente seu cadastro e todos os
              roteiros salvos. Essa ação não pode ser desfeita.
            </p>
            <button
              type="button"
              onClick={() => { setErroExclusao(null); setModalAberto(true); }}
              className="mt-4 border border-rec/40 px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-widest text-rec transition-colors hover:bg-rec hover:text-papel"
            >
              Excluir minha conta
            </button>
          </div>
        </div>
      </main>

      <RodapeApp />

      {modalAberto && (
        <ModalExcluirConta
          enviando={excluindo}
          erro={erroExclusao}
          onConfirmar={aoConfirmarExclusao}
          onCancelar={() => setModalAberto(false)}
        />
      )}
    </div>
  );
}
