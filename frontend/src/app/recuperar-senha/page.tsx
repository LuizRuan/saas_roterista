"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { recuperarSenha, ErroApi } from "@/lib/api";
import { MolduraAuth } from "@/components/auth/moldura-auth";
import { Campo } from "@/components/auth/campo";
import { BotaoEnviar } from "@/components/auth/botao-enviar";
import { Turnstile } from "@/components/auth/turnstile";

export default function PaginaRecuperarSenha() {
  const [email, setEmail] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  const [erro, setErro] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    if (!turnstileToken) {
      setErro("Confirme a verificação de segurança antes de continuar.");
      return;
    }

    setEnviando(true);
    setErro("");
    try {
      await recuperarSenha(email, turnstileToken);
      setEnviado(true);
    } catch (err) {
      setErro(
        err instanceof ErroApi ? err.message : "Erro ao enviar. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (enviado) {
    return (
      <MolduraAuth
        titulo={
          <>
            E-MAIL <span className="marca-texto">ENVIADO</span>
          </>
        }
        subtitulo="Verifique sua caixa de entrada (e o spam!)."
        rodape={
          <>
            Lembrou a senha?{" "}
            <Link
              href="/login"
              className="font-semibold underline decoration-marca underline-offset-4"
            >
              Entrar
            </Link>
          </>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-marca/20">
            <span className="text-2xl">✉️</span>
          </div>
          <p className="text-sm leading-relaxed text-tinta-suave">
            Se <strong className="text-tinta">{email}</strong> estiver cadastrado,
            você receberá um link para redefinir sua senha.
          </p>
          <p className="font-mono text-[10px] text-cinza">
            O link expira em 1 hora.
          </p>
        </div>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth
      titulo={
        <>
          ESQUECEU A <span className="marca-texto">SENHA?</span>
        </>
      }
      subtitulo="Informe seu e-mail e enviaremos um link de recuperação."
      rodape={
        <>
          Lembrou a senha?{" "}
          <Link
            href="/login"
            className="font-semibold underline decoration-marca underline-offset-4"
          >
            Entrar
          </Link>
        </>
      }
    >
      <form onSubmit={aoEnviar} noValidate className="space-y-5">
        <Campo
          id="email-recuperar"
          rotulo="E-mail"
          type="email"
          autoComplete="email"
          placeholder="voce@exemplo.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <Turnstile onToken={setTurnstileToken} />

        {erro && (
          <p role="alert" className="font-mono text-xs text-rec">{erro}</p>
        )}

        <BotaoEnviar enviando={enviando} rotuloEnviando="Enviando…">
          Enviar link de recuperação
        </BotaoEnviar>
      </form>
    </MolduraAuth>
  );
}
