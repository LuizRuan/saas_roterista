"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ErroApi, cadastrar } from "@/lib/api";
import { cadastroSchema, errosPorCampo, validarCampo } from "@/lib/validacao";
import { BotaoEnviar } from "./botao-enviar";
import { Campo } from "./campo";
import { MolduraAuth } from "./moldura-auth";
import { Turnstile } from "./turnstile";

export function FormularioCadastro() {
  const router = useRouter();
  const [erros, setErros] = useState<Record<string, string>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  // Revalida um campo isolado e limpa/atualiza seu erro — só entra em ação
  // depois que o campo já mostrou algum erro, pra não validar em cima de
  // campos ainda intocados.
  function revalidarCampo(campo: string, valor: unknown) {
    setErros((atual) => {
      if (!atual[campo]) return atual;
      const mensagem = validarCampo(cadastroSchema, campo, valor);
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
      nome: String(form.get("nome") ?? ""),
      email: String(form.get("email") ?? ""),
      senha: String(form.get("senha") ?? ""),
      aceitouTermos: form.get("aceitouTermos") === "on",
    };

    const validado = cadastroSchema.safeParse(dados);
    if (!validado.success) {
      setErros(errosPorCampo(validado.error));
      return;
    }
    setErros({});

    if (!turnstileToken) {
      setErroGeral("Confirme a verificação de segurança antes de continuar.");
      return;
    }

    setEnviando(true);
    try {
      await cadastrar({ ...validado.data, turnstileToken });
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
          onChange={(e) => revalidarCampo("nome", e.target.value)}
        />
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
          autoComplete="new-password"
          placeholder="••••••••"
          dica="Mín. 8 caracteres, com letra e número. Sem espaços."
          erro={erros.senha}
          onChange={(e) => revalidarCampo("senha", e.target.value)}
        />

        <div>
          <label className="flex items-start gap-2.5 text-sm text-tinta-suave">
            <input
              type="checkbox"
              name="aceitouTermos"
              className="mt-0.5 size-4 shrink-0 rounded border-tinta/30 accent-tinta"
              aria-invalid={erros.aceitouTermos ? true : undefined}
              aria-describedby={erros.aceitouTermos ? "aceitouTermos-erro" : undefined}
              onChange={(e) => revalidarCampo("aceitouTermos", e.target.checked)}
            />
            <span>
              Li e aceito os{" "}
              <Link
                href="/termos"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta"
              >
                Termos de Uso
              </Link>{" "}
              e a{" "}
              <Link
                href="/privacidade"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold underline decoration-marca decoration-4 underline-offset-4 hover:text-tinta"
              >
                Política de Privacidade
              </Link>
            </span>
          </label>
          {erros.aceitouTermos ? (
            <p id="aceitouTermos-erro" className="mt-1.5 text-sm font-medium text-rec">
              {erros.aceitouTermos}
            </p>
          ) : null}
        </div>

        <Turnstile onToken={setTurnstileToken} />

        <BotaoEnviar enviando={enviando} rotuloEnviando="Criando conta…">
          Criar conta grátis
        </BotaoEnviar>
      </form>
    </MolduraAuth>
  );
}
