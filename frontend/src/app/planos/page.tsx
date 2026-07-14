"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { usuarioAtual, type Usuario } from "@/lib/api";
import { CheckoutPix } from "@/components/dashboard/checkout-pix";

// ---------------------------------------------------------------------------
// Dados dos planos
// ---------------------------------------------------------------------------

const planoFree = [
  "5 roteiros por mês",
  "Tema personalizado",
  "Público-alvo personalizado",
  "Modelo de IA básico",
];

const planoPro = [
  "50 roteiros por mês",
  "Modelo de IA premium e prioridade de geração",
  "Mais chances de criar vídeos que prendem a atenção",
  "Tom narrativo personalizado",
  "Gancho personalizado",
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

export default function PaginaPlanos() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [mostrarCheckout, setMostrarCheckout] = useState(false);
  const [mostrarConteudo, setMostrarConteudo] = useState(false);

  useEffect(() => {
    let ativo = true;
    async function init() {
      try {
        const u = await usuarioAtual();
        if (!ativo) return;
        setUsuario(u);
      } catch {
        // Não logado — ok, só desabilita o botão
      } finally {
        if (ativo) {
          setCarregando(false);
          setTimeout(() => setMostrarConteudo(true), 100);
        }
      }
    }
    init();
    return () => { ativo = false; };
  }, []);

  const eLogado = !!usuario;
  const ePro = usuario?.plano === "pro";

  // Atualiza estado local quando pagamento é confirmado
  function aoFecharCheckout() {
    setMostrarCheckout(false);
    // Recarrega dados do usuário para refletir o novo plano
    usuarioAtual().then((u) => {
      if (u) setUsuario(u);
    }).catch(() => {});
  }

  // Lógica do botão Pro
  function aoClicarAssinar() {
    if (!eLogado) {
      router.push("/login?redirect=/planos");
      return;
    }
    if (ePro) return;
    setMostrarCheckout(true);
  }

  // Texto e estado do botão Pro
  let botaoProTexto = "Assinar Pro — R$ 29,90/mês";
  let botaoProDesabilitado = false;
  let botaoProClasse = "bg-tinta text-papel hover:bg-tinta-suave";

  if (carregando) {
    botaoProTexto = "Carregando…";
    botaoProDesabilitado = true;
    botaoProClasse = "bg-tinta/40 text-papel cursor-wait";
  } else if (!eLogado) {
    botaoProTexto = "Entre para assinar →";
    botaoProClasse = "bg-tinta text-papel hover:bg-tinta-suave";
  } else if (ePro) {
    botaoProTexto = "✓ Seu plano atual";
    botaoProDesabilitado = true;
    botaoProClasse = "bg-marca text-tinta cursor-default";
  }

  return (
    <>
      <main className="min-h-screen bg-papel">
        <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
          <Link
            href="/dashboard"
            className="font-mono text-xs uppercase tracking-widest text-cinza underline decoration-tinta/20 underline-offset-4 transition-colors hover:text-tinta"
          >
            ← Voltar ao dashboard
          </Link>

          <div
            className={`transition-all duration-700 ${
              mostrarConteudo
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            <p className="mt-8 font-mono text-xs font-semibold uppercase tracking-widest text-rec">
              [Planos]
            </p>
            <h1 className="mt-4 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">
              COMECE GRÁTIS. EVOLUA QUANDO FIZER SENTIDO.
            </h1>
            <p className="mt-4 max-w-xl leading-relaxed text-tinta-suave">
              O plano gratuito está aberto e sem cartão. Faça upgrade para o Pro
              e desbloqueie o estúdio completo — pagamento via PIX.
            </p>
          </div>

          <div
            className={`mt-12 grid gap-6 md:grid-cols-2 transition-all duration-700 delay-150 ${
              mostrarConteudo
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            {/* Free */}
            <article className="flex h-full flex-col rounded-lg border border-tinta/15 bg-papel-card p-6">
              <h2 className="font-mono text-sm font-semibold uppercase tracking-widest">
                Free
              </h2>
              <p className="mt-3 font-display text-4xl">R$ 0</p>
              <p className="mt-1 text-sm text-cinza">para sempre</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {planoFree.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-snug">
                    <span aria-hidden className="mt-1 font-mono text-rec">
                      →
                    </span>
                    <span className="text-tinta-suave">{item}</span>
                  </li>
                ))}
              </ul>
              {eLogado && !ePro ? (
                <div className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-tinta/10 px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-tinta">
                  Seu plano atual
                </div>
              ) : (
                <Link
                  href={eLogado ? "/dashboard" : "/cadastro"}
                  className="mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md bg-tinta px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide text-papel transition-colors hover:bg-tinta-suave"
                >
                  {eLogado ? "Ir ao dashboard" : "Começar grátis"}
                </Link>
              )}
            </article>

            {/* Pro */}
            <article className="relative flex h-full flex-col rounded-lg border-2 border-tinta bg-papel-card p-6 shadow-[6px_6px_0_0_rgba(19,18,16,0.15)]">
              {ePro ? (
                <p className="absolute -top-3 right-5 rounded-sm bg-marca px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-tinta">
                  Ativo ✓
                </p>
              ) : (
                <p className="absolute -top-3 right-5 rounded-sm bg-rec px-2 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-wide text-papel">
                  Popular
                </p>
              )}
              <h2 className="font-mono text-sm font-semibold uppercase tracking-widest">
                Pro
              </h2>
              <p className="mt-3 font-display text-4xl">R$ 29,90<span className="text-lg text-cinza">/mês</span></p>
              <p className="mt-1 text-sm text-cinza">pagamento via PIX</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {planoPro.map((item) => (
                  <li key={item} className="flex gap-2.5 leading-snug">
                    <span aria-hidden className="mt-1 font-mono text-marca">
                      →
                    </span>
                    <span className="text-tinta-suave">{item}</span>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                disabled={botaoProDesabilitado}
                onClick={aoClicarAssinar}
                className={`mt-8 inline-flex w-full items-center justify-center gap-2 rounded-md px-6 py-3.5 font-mono text-sm font-semibold uppercase tracking-wide transition-all ${botaoProClasse}`}
              >
                {botaoProTexto}
              </button>
            </article>
          </div>

          <div
            className={`transition-all duration-700 delay-300 ${
              mostrarConteudo
                ? "translate-y-0 opacity-100"
                : "translate-y-4 opacity-0"
            }`}
          >
            {/* Segurança */}
            <div className="mt-8 flex items-start gap-3 border border-tinta/10 bg-papel-card px-5 py-4">
              <span className="mt-0.5 text-sm" aria-hidden>🔒</span>
              <div>
                <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta-suave">
                  Pagamento seguro
                </p>
                <p className="mt-1 text-xs leading-relaxed text-cinza">
                  O pagamento é feito via PIX, diretamente na plataforma. Cada código é
                  único, gerado com criptografia de nível bancário e expira em 15 minutos.
                  Sem cartão, sem intermediários.
                </p>
              </div>
            </div>

            <p className="mt-6 font-mono text-xs leading-5 text-cinza">
              * Ao assinar, você terá acesso imediato aos benefícios do plano Pro
              após a confirmação do pagamento. Dúvidas? Entre em contato pelo e-mail
              de suporte.
            </p>
          </div>
        </div>
      </main>

      {/* Modal de checkout PIX */}
      {mostrarCheckout && usuario && (
        <CheckoutPix
          usuario={usuario}
          aoFechar={aoFecharCheckout}
        />
      )}
    </>
  );
}
