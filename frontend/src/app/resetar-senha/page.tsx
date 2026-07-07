"use client";

import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, type FormEvent, Suspense } from "react";
import { resetarSenha, ErroApi } from "@/lib/api";
import { MolduraAuth } from "@/components/auth/moldura-auth";
import { Campo } from "@/components/auth/campo";
import { BotaoEnviar } from "@/components/auth/botao-enviar";

function FormularioReset() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [sucesso, setSucesso] = useState(false);
  const [erro, setErro] = useState("");

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    setErro("");

    if (novaSenha.length < 8) {
      setErro("A senha precisa de pelo menos 8 caracteres.");
      return;
    }
    if (novaSenha !== confirmar) {
      setErro("As senhas não coincidem.");
      return;
    }
    if (!token) {
      setErro("Token de recuperação ausente. Solicite um novo link.");
      return;
    }

    setEnviando(true);
    try {
      await resetarSenha(token, novaSenha);
      setSucesso(true);
      setTimeout(() => router.replace("/login"), 2500);
    } catch (err) {
      setErro(
        err instanceof ErroApi ? err.message : "Erro ao redefinir. Tente novamente."
      );
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <MolduraAuth
        titulo={
          <>
            SENHA <span className="marca-texto">ALTERADA!</span>
          </>
        }
        subtitulo="Redirecionando para o login…"
        rodape={
          <Link
            href="/login"
            className="font-semibold underline decoration-marca underline-offset-4"
          >
            Ir para login agora
          </Link>
        }
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-marca/20">
            <span className="text-2xl">✅</span>
          </div>
          <p className="text-sm leading-relaxed text-tinta-suave">
            Sua senha foi atualizada. Faça login com a nova senha.
          </p>
        </div>
      </MolduraAuth>
    );
  }

  if (!token) {
    return (
      <MolduraAuth
        titulo={
          <>
            LINK <span className="marca-texto">INVÁLIDO</span>
          </>
        }
        subtitulo="Este link não contém um token de recuperação válido."
        rodape={
          <Link
            href="/recuperar-senha"
            className="font-semibold underline decoration-marca underline-offset-4"
          >
            Solicitar novo link
          </Link>
        }
      >
        <p className="text-sm text-tinta-suave">
          O link pode ter expirado ou sido usado. Solicite uma nova recuperação.
        </p>
      </MolduraAuth>
    );
  }

  return (
    <MolduraAuth
      titulo={
        <>
          NOVA <span className="marca-texto">SENHA</span>
        </>
      }
      subtitulo="Crie uma nova senha para sua conta."
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
          id="nova-senha"
          rotulo="Nova senha"
          type="password"
          autoComplete="new-password"
          placeholder="••••••••"
          value={novaSenha}
          onChange={(e) => setNovaSenha(e.target.value)}
          required
        />
        <div>
          <Campo
            id="confirmar-senha"
            rotulo="Confirmar senha"
            type="password"
            autoComplete="new-password"
            placeholder="••••••••"
            value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            required
          />
          <p className="mt-1 font-mono text-[10px] text-cinza">
            Mínimo de 8 caracteres.
          </p>
        </div>

        {erro && (
          <p role="alert" className="font-mono text-xs text-rec">{erro}</p>
        )}

        <BotaoEnviar enviando={enviando} rotuloEnviando="Salvando…">
          Redefinir senha
        </BotaoEnviar>
      </form>
    </MolduraAuth>
  );
}

export default function PaginaResetarSenha() {
  return (
    <Suspense
      fallback={
        <main className="flex min-h-screen items-center justify-center">
          <p className="font-mono text-sm uppercase tracking-widest text-tinta-suave">
            Carregando…
          </p>
        </main>
      }
    >
      <FormularioReset />
    </Suspense>
  );
}
