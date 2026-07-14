"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  gerarPix,
  cancelarPagamento,
  ErroApi,
  type DadosPix,
  type Usuario,
} from "@/lib/api";
import { usePollingPagamento } from "@/hooks/use-polling-pagamento";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatarValor(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function tempoRestante(expiraEm: string): { minutos: number; segundos: number; expirou: boolean } {
  const diff = new Date(expiraEm).getTime() - Date.now();
  if (diff <= 0) return { minutos: 0, segundos: 0, expirou: true };
  const minutos = Math.floor(diff / 60_000);
  const segundos = Math.floor((diff % 60_000) / 1000);
  return { minutos, segundos, expirou: false };
}

// ---------------------------------------------------------------------------
// Timer regressivo
// ---------------------------------------------------------------------------

function TimerRegressivo({ expiraEm }: { expiraEm: string }) {
  const [tempo, setTempo] = useState(() => tempoRestante(expiraEm));

  useEffect(() => {
    const intervalo = setInterval(() => {
      setTempo(tempoRestante(expiraEm));
    }, 1000);
    return () => clearInterval(intervalo);
  }, [expiraEm]);

  if (tempo.expirou) {
    return (
      <span className="font-mono text-xs font-semibold text-rec">
        Expirado
      </span>
    );
  }

  return (
    <span className="font-mono text-xs tabular-nums text-rec">
      <span className="rec-pulso inline-block size-1.5 rounded-full bg-rec mr-1.5" aria-hidden />
      Expira em {String(tempo.minutos).padStart(2, "0")}:{String(tempo.segundos).padStart(2, "0")}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Estados do Modal
// ---------------------------------------------------------------------------

function EstadoGerando() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <span
        aria-hidden
        className="rec-pulso inline-block size-3 rounded-full bg-rec mb-4"
      />
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        Gerando código PIX seguro…
      </p>
      <p className="mt-2 text-xs text-cinza">
        Aguarde um instante.
      </p>
    </div>
  );
}

function EstadoErro({
  mensagem,
  aoTentar,
  aoFechar,
}: {
  mensagem: string;
  aoTentar: () => void;
  aoFechar: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="font-display text-4xl text-rec mb-4" aria-hidden>✗</span>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
        Erro ao gerar pagamento
      </p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-tinta-suave">
        {mensagem}
      </p>
      <div className="mt-6 flex gap-3">
        <button
          type="button"
          onClick={aoFechar}
          className="px-4 py-2 font-mono text-xs font-semibold uppercase tracking-widest text-cinza underline decoration-cinza/30 underline-offset-4 transition-colors hover:text-tinta"
        >
          Fechar
        </button>
        <button
          type="button"
          onClick={aoTentar}
          className="bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  );
}

function EstadoPago({ nomeUsuario }: { nomeUsuario: string }) {
  const router = useRouter();
  const primeiroNome = nomeUsuario.split(" ")[0];

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center checkout-sucesso-animar">
      <div className="relative mb-4">
        <span
          className="flex size-14 items-center justify-center bg-marca font-display text-2xl text-tinta"
          aria-hidden
        >
          ✓
        </span>
      </div>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-marca">
        Pagamento confirmado!
      </p>
      <p className="mt-3 font-display text-2xl tracking-tight text-tinta">
        BEM-VINDO AO PRO, {primeiroNome.toUpperCase()}!
      </p>
      <div className="mt-6 space-y-1.5 text-left">
        {[
          "50 roteiros por mês",
          "IA premium com prioridade",
          "Tom narrativo personalizado",
          "Gancho personalizado",
        ].map((item) => (
          <p key={item} className="flex items-center gap-2 text-sm text-tinta-suave">
            <span aria-hidden className="font-mono text-xs text-marca">→</span>
            {item}
          </p>
        ))}
      </div>
      <button
        type="button"
        onClick={() => router.push("/dashboard")}
        className="mt-8 flex items-center gap-2 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
      >
        <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
        Ir para o estúdio
        <span aria-hidden>→</span>
      </button>
    </div>
  );
}

function EstadoExpirado({ aoGerarNovo }: { aoGerarNovo: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <span className="font-display text-4xl text-cinza mb-4" aria-hidden>⏱</span>
      <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave">
        Código PIX expirado
      </p>
      <p className="mt-3 max-w-xs text-sm leading-relaxed text-cinza">
        O código de pagamento expirou após 15 minutos.
        Nenhuma cobrança foi feita.
      </p>
      <button
        type="button"
        onClick={aoGerarNovo}
        className="mt-6 bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave"
      >
        Gerar novo código PIX
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Componente principal: Modal de checkout PIX
// ---------------------------------------------------------------------------

export function CheckoutPix({
  usuario,
  aoFechar,
}: {
  usuario: Usuario;
  aoFechar: () => void;
}) {
  const [fase, setFase] = useState<"gerando" | "aguardando" | "pago" | "expirado" | "erro">("gerando");
  const [dados, setDados] = useState<DadosPix | null>(null);
  const [erroMsg, setErroMsg] = useState("");
  const [copiado, setCopiado] = useState(false);
  const copiarTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { status: statusPolling } = usePollingPagamento(
    fase === "aguardando" ? dados?.assinaturaId ?? null : null,
    () => setFase("pago")
  );

  // Atualiza fase baseado no polling
  useEffect(() => {
    if (statusPolling === "pago") setFase("pago");
    if (statusPolling === "expirado") setFase("expirado");
    if (statusPolling === "cancelado") aoFechar();
  }, [statusPolling, aoFechar]);

  const iniciarPagamento = useCallback(async () => {
    setFase("gerando");
    setDados(null);
    setErroMsg("");
    setCopiado(false);

    try {
      const resultado = await gerarPix();
      setDados(resultado);
      setFase("aguardando");
    } catch (err) {
      const msg = err instanceof ErroApi
        ? err.message
        : "Não foi possível gerar o código PIX. Tente novamente.";
      setErroMsg(msg);
      setFase("erro");
    }
  }, []);

  // Gera PIX ao montar
  useEffect(() => {
    iniciarPagamento();
  }, [iniciarPagamento]);

  async function aoCancelar() {
    if (dados?.assinaturaId) {
      try {
        await cancelarPagamento(dados.assinaturaId);
      } catch {
        // Ignora erro de cancelamento — fechar o modal já é suficiente
      }
    }
    aoFechar();
  }

  async function aoCopiar() {
    if (!dados?.pixCopiaECola) return;
    try {
      await navigator.clipboard.writeText(dados.pixCopiaECola);
      setCopiado(true);
      if (copiarTimeoutRef.current) clearTimeout(copiarTimeoutRef.current);
      copiarTimeoutRef.current = setTimeout(() => setCopiado(false), 3000);
    } catch {
      // Fallback para browsers que não suportam clipboard API
      const input = document.createElement("textarea");
      input.value = dados.pixCopiaECola;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiado(true);
      if (copiarTimeoutRef.current) clearTimeout(copiarTimeoutRef.current);
      copiarTimeoutRef.current = setTimeout(() => setCopiado(false), 3000);
    }
  }

  // Cleanup
  useEffect(() => {
    return () => {
      if (copiarTimeoutRef.current) clearTimeout(copiarTimeoutRef.current);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-tinta/60 backdrop-blur-sm checkout-overlay-animar"
      onClick={(e) => {
        // Fecha ao clicar no overlay (mas não no conteúdo)
        if (e.target === e.currentTarget && fase !== "gerando" && fase !== "aguardando") {
          aoFechar();
        }
      }}
    >
      <div className="relative mx-4 w-full max-w-md border-2 border-tinta bg-papel shadow-[8px_8px_0_0_rgba(19,18,16,0.15)] checkout-modal-animar">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-tinta/15 px-6 py-4">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
            [Pagamento PIX]
          </p>
          {fase !== "gerando" && fase !== "aguardando" && (
            <button
              type="button"
              onClick={aoFechar}
              className="flex size-7 items-center justify-center font-mono text-lg text-cinza transition-colors hover:text-tinta"
              aria-label="Fechar"
            >
              ×
            </button>
          )}
        </div>

        {/* Conteúdo */}
        <div className="px-6 py-6">
          {fase === "gerando" && <EstadoGerando />}

          {fase === "erro" && (
            <EstadoErro
              mensagem={erroMsg}
              aoTentar={iniciarPagamento}
              aoFechar={aoFechar}
            />
          )}

          {fase === "pago" && <EstadoPago nomeUsuario={usuario.nome} />}

          {fase === "expirado" && <EstadoExpirado aoGerarNovo={iniciarPagamento} />}

          {fase === "aguardando" && dados && (
            <div className="flex flex-col items-center">
              {/* Valor */}
              <p className="font-display text-2xl tracking-tight text-tinta">
                PLANO PRO · {formatarValor(dados.valor)}/MÊS
              </p>

              {/* QR Code */}
              <div className="mt-6 border border-tinta/15 bg-papel-card p-3">
                <img
                  src={dados.qrCodeBase64}
                  alt="QR Code do PIX"
                  width={280}
                  height={280}
                  className="block"
                />
              </div>

              <p className="mt-4 text-center text-sm text-tinta-suave">
                Escaneie com o app do seu banco<br />
                ou copie o código abaixo:
              </p>

              {/* Código copia e cola */}
              <div className="mt-4 flex w-full items-stretch gap-2">
                <div className="flex-1 overflow-hidden border border-tinta/15 bg-papel-card px-3 py-2.5">
                  <p className="truncate font-mono text-xs text-tinta-suave select-all">
                    {dados.pixCopiaECola}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={aoCopiar}
                  className={`shrink-0 px-4 font-mono text-[10px] font-bold uppercase tracking-widest transition-all ${
                    copiado
                      ? "bg-marca text-tinta"
                      : "bg-tinta text-papel hover:bg-tinta-suave"
                  }`}
                >
                  {copiado ? "✓ Copiado" : "Copiar"}
                </button>
              </div>

              {/* Timer */}
              <div className="mt-4">
                <TimerRegressivo expiraEm={dados.expiraEm} />
              </div>

              {/* Aguardando */}
              <div className="mt-6 w-full border-t border-tinta/10 pt-4">
                <div className="flex items-center justify-center gap-2">
                  <span className="rec-pulso inline-block size-1.5 rounded-full bg-marca" aria-hidden />
                  <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta-suave">
                    Aguardando pagamento…
                  </p>
                </div>
                <p className="mt-2 text-center text-xs text-cinza">
                  Após pagar, a confirmação aparecerá aqui automaticamente.<br />
                  Não feche esta tela.
                </p>
              </div>

              {/* Cancelar */}
              <button
                type="button"
                onClick={aoCancelar}
                className="mt-6 font-mono text-[10px] uppercase tracking-widest text-cinza underline decoration-cinza/30 underline-offset-4 transition-colors hover:text-rec"
              >
                Cancelar pagamento
              </button>

              {/* Selo de segurança */}
              <div className="mt-4 flex items-center gap-1.5 text-cinza">
                <span className="text-xs" aria-hidden>🔒</span>
                <p className="font-mono text-[9px] tracking-wider">
                  Pagamento seguro · Código único gerado exclusivamente para você
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
