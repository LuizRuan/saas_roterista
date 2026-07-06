"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErroApi, cadastrar } from "@/lib/api";
import { cadastroSchema, errosPorCampo } from "@/lib/validacao";
import { BotaoEnviar } from "./botao-enviar";
import { Campo } from "./campo";
import { MolduraAuth } from "./moldura-auth";

export function FormularioCadastro() {
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);

    const form = new FormData(evento.currentTarget);
    const dados = {
      nome: String(form.get("nome") ?? ""),
      email: String(form.get("email") ?? ""),
      senha: String(form.get("senha") ?? ""),
    };

    const validado = cadastroSchema.safeParse(dados);
    if (!validado.success) {
      setErros(errosPorCampo(validado.error));
      return;
    }
    setErros({});

    setEnviando(true);
    try {
      await cadastrar(validado.data);
      router.push("/dashboard");
    } catch (erro) {
      if (erro instanceof ErroApi && erro.status === 409) {
        setErros({ email: erro.message });
      } else if (erro instanceof ErroApi) {
        setErroGeral(erro.message);
      } else {
        setErroGeral("Erro inesperado. Tente novamente.");
      }
      setEnviando(false);
    }
  }

  return (
    <MolduraAuth
      arquivo="cadastro.txt"
      titulo={
        <>
          CRIE SUA CONTA <span className="marca-texto">GRÁTIS</span>
        </>
      }
      subtitulo="5 roteiros por mês, sem cartão. Seu primeiro gancho sai em segundos."
      rodape={
        <>
          Já tem conta?{" "}
          <Link
            href="/login"
            className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={aoEnviar} noValidate className="space-y-5">
        {erroGeral && (
          <p
            role="alert"
            className="rounded-md border border-rec/40 bg-rec/10 px-4 py-3 text-sm font-medium text-rec"
          >
            {erroGeral}
          </p>
        )}

        <Campo
          id="nome"
          name="nome"
          rotulo="Nome"
          autoComplete="name"
          placeholder="Como quer ser chamado"
          erro={erros.nome}
        />
        <Campo
          id="email"
          name="email"
          type="email"
          rotulo="E-mail"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          erro={erros.email}
        />
        <Campo
          id="senha"
          name="senha"
          type="password"
          rotulo="Senha"
          autoComplete="new-password"
          placeholder="••••••••"
          dica="Mínimo de 8 caracteres."
          erro={erros.senha}
        />

        <BotaoEnviar enviando={enviando} rotuloEnviando="Criando conta…">
          Criar conta grátis
        </BotaoEnviar>
      </form>
    </MolduraAuth>
  );
}
