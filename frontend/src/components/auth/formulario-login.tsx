"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErroApi, entrar } from "@/lib/api";
import { errosPorCampo, loginSchema, validarCampo } from "@/lib/validacao";
import { BotaoEnviar } from "./botao-enviar";
import { Campo } from "./campo";
import { MolduraAuth } from "./moldura-auth";

export function FormularioLogin() {
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  function revalidarCampo(campo: string, valor: unknown) {
    setErros((atual) => {
      if (!atual[campo]) return atual;
      const mensagem = validarCampo(loginSchema, campo, valor);
      if (!mensagem) {
        const resto = { ...atual };
        delete resto[campo];
        return resto;
      }
      return { ...atual, [campo]: mensagem };
    });
  }

  async function aoEnviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErroGeral(null);

    const form = new FormData(evento.currentTarget);
    const dados = {
      email: String(form.get("email") ?? ""),
      senha: String(form.get("senha") ?? ""),
    };

    const validado = loginSchema.safeParse(dados);
    if (!validado.success) {
      setErros(errosPorCampo(validado.error));
      return;
    }
    setErros({});

    setEnviando(true);
    try {
      await entrar(validado.data);
      router.push("/dashboard");
    } catch (erro) {
      setErroGeral(
        erro instanceof ErroApi ? erro.message : "Erro inesperado. Tente novamente."
      );
      setEnviando(false);
    }
  }

  return (
    <MolduraAuth
      titulo={
        <>
          DE VOLTA À <span className="marca-texto">GRAVAÇÃO</span>
        </>
      }
      subtitulo="Entre para continuar de onde parou."
      rodape={
        <>
          Ainda não tem conta?{" "}
          <Link
            href="/cadastro"
            className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta"
          >
            Criar conta grátis
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
          id="email"
          name="email"
          type="email"
          rotulo="E-mail"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          erro={erros.email}
          onChange={(e) => revalidarCampo("email", e.target.value)}
        />
        <Campo
          id="senha"
          name="senha"
          type="password"
          rotulo="Senha"
          autoComplete="current-password"
          placeholder="••••••••"
          erro={erros.senha}
          onChange={(e) => revalidarCampo("senha", e.target.value)}
        />

        <BotaoEnviar enviando={enviando} rotuloEnviando="Entrando…">
          Entrar
        </BotaoEnviar>

        <div className="mt-4 text-center">
          <Link
            href="/recuperar-senha"
            className="font-mono text-xs uppercase tracking-widest text-cinza underline decoration-tinta/20 underline-offset-4 transition-colors hover:text-tinta"
          >
            Esqueci minha senha
          </Link>
        </div>
      </form>
    </MolduraAuth>
  );
}
