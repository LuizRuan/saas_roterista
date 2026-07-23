"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  sair,
  usuarioAtual,
  editarPerfil,
  trocarSenha,
  excluirConta,
  ErroApi,
  type Usuario,
} from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";
import { useConfirmacao } from "@/hooks/use-confirmacao";

const classeInput =
  "w-full border-b-2 border-tinta/20 bg-transparent px-0 py-2 text-sm placeholder:text-cinza focus:border-tinta focus:outline-none";

function Campo({
  id, rotulo, tipo = "text", valor, onChange, maxLength,
}: {
  id: string; rotulo: string; tipo?: string; valor: string;
  onChange: (v: string) => void; maxLength?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
        {rotulo}
      </label>
      <input
        id={id}
        type={tipo}
        value={valor}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        className={classeInput}
      />
    </div>
  );
}

export function PainelConta() {
  const router = useRouter();
  const { confirmar, elemento } = useConfirmacao();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  // Perfil
  const [nome, setNome] = useState("");
  const [salvandoNome, setSalvandoNome] = useState(false);
  const [msgPerfil, setMsgPerfil] = useState("");

  // Senha
  const [senhaAtual, setSenhaAtual] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [salvandoSenha, setSalvandoSenha] = useState(false);
  const [msgSenha, setMsgSenha] = useState("");
  const [erroSenha, setErroSenha] = useState("");

  const [senhaExclusao, setSenhaExclusao] = useState("");
  const [erroConta, setErroConta] = useState("");

  useEffect(() => {
    let ativo = true;
    usuarioAtual()
      .then((u) => {
        if (!ativo) return;
        if (!u) { router.replace("/login"); return; }
        setUsuario(u);
        setNome(u.nome);
        setCarregando(false);
      })
      .catch(() => { if (ativo) router.replace("/login"); });
    return () => { ativo = false; };
  }, [router]);

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  async function salvarNome() {
    setMsgPerfil("");
    setSalvandoNome(true);
    try {
      const u = await editarPerfil(nome);
      setUsuario(u);
      setMsgPerfil("Nome atualizado.");
    } catch (erro) {
      setMsgPerfil(erro instanceof ErroApi ? erro.message : "Erro ao salvar.");
    } finally {
      setSalvandoNome(false);
    }
  }

  async function salvarSenha() {
    setMsgSenha("");
    setErroSenha("");
    setSalvandoSenha(true);
    try {
      await trocarSenha(senhaAtual, novaSenha);
      setMsgSenha("Senha alterada. Entre novamente.");
      setTimeout(() => router.replace("/login"), 1200);
    } catch (erro) {
      setErroSenha(erro instanceof ErroApi ? erro.message : "Erro ao trocar a senha.");
    } finally {
      setSalvandoSenha(false);
    }
  }

  async function apagarConta() {
    setErroConta("");
    const ok = await confirmar({
      titulo: "Excluir sua conta?",
      descricao:
        "Isso apaga permanentemente sua conta, seus roteiros e seus pagamentos. Não dá para desfazer.",
      rotuloConfirmar: "Excluir tudo",
    });
    if (!ok) return;
    try {
      await excluirConta(senhaExclusao);
      router.replace("/");
    } catch (erro) {
      setErroConta(erro instanceof ErroApi ? erro.message : "Erro ao excluir a conta.");
    }
  }

  if (carregando) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-papel">
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
          { rotulo: "← Voltar", href: "/dashboard" },
          { rotulo: "Conta", ativo: true },
        ]}
        badgeAdmin="nenhum"
      />

      <main className="mx-auto max-w-xl px-4 pb-24 pt-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">[Sua conta]</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">CONFIGURAÇÕES</h1>

        {/* Perfil */}
        <section className="mt-10 space-y-3">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">Perfil</h2>
          <p className="font-mono text-xs text-cinza">E-mail: {usuario?.email}</p>
          <Campo id="campo-nome" rotulo="Nome" maxLength={80} valor={nome} onChange={setNome} />
          <button
            type="button"
            onClick={salvarNome}
            disabled={salvandoNome || nome.trim() === usuario?.nome}
            className="bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {salvandoNome ? "Salvando…" : "Salvar nome"}
          </button>
          {msgPerfil && <p className="font-mono text-xs text-tinta-suave">{msgPerfil}</p>}
        </section>

        {/* Senha */}
        <section className="mt-12 space-y-3 border-t border-tinta/10 pt-8">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">Trocar senha</h2>
          <Campo id="campo-senha-atual" rotulo="Senha atual" tipo="password" valor={senhaAtual} onChange={setSenhaAtual} />
          <Campo id="campo-nova-senha" rotulo="Nova senha" tipo="password" valor={novaSenha} onChange={setNovaSenha} />
          <button
            type="button"
            onClick={salvarSenha}
            disabled={salvandoSenha || !senhaAtual || !novaSenha}
            className="bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {salvandoSenha ? "Salvando…" : "Trocar senha"}
          </button>
          {msgSenha && <p className="font-mono text-xs text-tinta-suave">{msgSenha}</p>}
          {erroSenha && <p className="font-mono text-xs text-rec">{erroSenha}</p>}
        </section>

        {/* Zona de perigo */}
        <section className="mt-12 space-y-3 border-t border-rec/20 pt-8">
          <h2 className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">Excluir conta</h2>
          <p className="text-sm text-tinta-suave">
            Remove permanentemente sua conta e todos os dados (roteiros e pagamentos).
            Confirme com sua senha.
          </p>
          <Campo
            id="campo-senha-exclusao"
            rotulo="Sua senha"
            tipo="password"
            valor={senhaExclusao}
            onChange={setSenhaExclusao}
          />
          <button
            type="button"
            onClick={apagarConta}
            disabled={!senhaExclusao}
            className="border border-rec px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-rec transition-colors hover:bg-rec hover:text-papel disabled:opacity-40"
          >
            Excluir minha conta
          </button>
          {erroConta && <p className="font-mono text-xs text-rec">{erroConta}</p>}
        </section>
      </main>

      <RodapeApp />
      {elemento}
    </div>
  );
}
