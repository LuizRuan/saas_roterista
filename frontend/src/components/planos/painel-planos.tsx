"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  sair,
  usuarioAtual,
  criarPagamentoPix,
  statusPagamento,
  precoPlanoPro,
  ErroApi,
  type Usuario,
  type CobrancaPix,
} from "@/lib/api";
import { CabecalhoApp } from "@/components/app/cabecalho-app";
import { RodapeApp } from "@/components/app/rodape-app";

const BENEFICIOS = [
  "50 roteiros por mês (10× o plano gratuito)",
  "Bem além das 5 gerações do plano free",
  "Acesso a todos os formatos e tons",
  "Prioridade nas melhorias do produto",
];

function formatarPreco(centavos: number): string {
  return `R$ ${(centavos / 100).toFixed(2).replace(".", ",")}`;
}

function formatarData(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

type EstadoPagamento = "ocioso" | "gerando" | "aguardando" | "aprovado" | "expirado" | "erro";

export function PainelPlanos() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [saindo, setSaindo] = useState(false);

  const [estado, setEstado] = useState<EstadoPagamento>("ocioso");
  const [cobranca, setCobranca] = useState<CobrancaPix | null>(null);
  const [erroMensagem, setErroMensagem] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [restante, setRestante] = useState(0); // segundos até o QR expirar
  const [precoCentavos, setPrecoCentavos] = useState<number | null>(null);

  // ── Auth guard + preço ──
  useEffect(() => {
    let ativo = true;
    usuarioAtual()
      .then((u) => {
        if (!ativo) return;
        if (!u) { router.replace("/login"); return; }
        setUsuario(u);
        setCarregando(false);
      })
      .catch(() => { if (ativo) router.replace("/login"); });
    precoPlanoPro()
      .then((c) => { if (ativo) setPrecoCentavos(c); })
      .catch(() => { /* mantém o botão sem valor até carregar */ });
    return () => { ativo = false; };
  }, [router]);

  const proAtivo = usuario?.plano === "pro" && !!usuario.planoExpiraEm;

  async function aoSair() {
    setSaindo(true);
    try { await sair(); } finally { router.replace("/"); }
  }

  async function assinar() {
    setEstado("gerando");
    setErroMensagem("");
    try {
      const c = await criarPagamentoPix();
      setCobranca(c);
      setEstado("aguardando");
    } catch (erro) {
      setEstado("erro");
      setErroMensagem(
        erro instanceof ErroApi ? erro.message : "Não foi possível gerar o Pix. Tente novamente."
      );
    }
  }

  // ── Contagem regressiva do QR ──
  useEffect(() => {
    if (estado !== "aguardando" || !cobranca) return;
    const fim = new Date(cobranca.expiraEm).getTime();
    const tick = () => setRestante(Math.max(0, Math.round((fim - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [estado, cobranca]);

  // ── Polling do status ──
  const aprovarSePago = useCallback(async () => {
    if (!cobranca) return;
    try {
      const s = await statusPagamento(cobranca.pagamentoId);
      if (s === "aprovado") {
        setEstado("aprovado");
        // Recarrega o usuário para refletir o plano pro na sessão.
        const u = await usuarioAtual();
        if (u) setUsuario(u);
      } else if (s === "expirado" || s === "cancelado") {
        setEstado("expirado");
      }
    } catch { /* mantém aguardando; tenta de novo no próximo tick */ }
  }, [cobranca]);

  useEffect(() => {
    if (estado !== "aguardando") return;
    const id = setInterval(aprovarSePago, 4000);
    return () => clearInterval(id);
  }, [estado, aprovarSePago]);

  async function copiar() {
    if (!cobranca) return;
    await navigator.clipboard.writeText(cobranca.copiaECola);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2200);
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

  const min = Math.floor(restante / 60);
  const seg = String(restante % 60).padStart(2, "0");

  return (
    <div className="min-h-screen bg-papel">
      <CabecalhoApp
        usuario={usuario}
        saindo={saindo}
        aoSair={aoSair}
        itensNav={[
          { rotulo: "← Voltar", href: "/dashboard" },
          { rotulo: "Planos", ativo: true },
        ]}
        badgeAdmin="nenhum"
      />

      <main className="mx-auto max-w-2xl px-4 pb-24 pt-12 sm:px-6">
        <p className="font-mono text-xs font-semibold uppercase tracking-widest text-rec">
          [Plano Pro]
        </p>
        <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
50 ROTEIROS <span className="marca-texto">POR MÊS</span>
        </h1>

        {/* Já é pro */}
        {proAtivo ? (
          <div className="mt-8 border border-tinta/15 p-6">
            <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
              ✓ Você é Pro
            </p>
            <p className="mt-2 text-sm text-tinta-suave">
              Seu plano pro está ativo até{" "}
              <strong className="text-tinta">{formatarData(usuario!.planoExpiraEm!)}</strong>.
              Renove por Pix quando quiser estender.
            </p>
          </div>
        ) : (
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-tinta-suave">
            Pague uma vez por Pix e libere 30 dias com 50 roteiros por mês. Sem cartão,
            sem assinatura automática — você renova quando quiser.
          </p>
        )}

        {/* Benefícios */}
        <ul className="mt-8 space-y-2">
          {BENEFICIOS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-sm text-tinta-suave">
              <span aria-hidden className="mt-1.5 inline-block size-1.5 shrink-0 rounded-full bg-marca" />
              {b}
            </li>
          ))}
        </ul>

        {/* Ação / fluxo Pix */}
        {!proAtivo && (
          <div className="mt-10 border-t border-tinta/10 pt-8">
            {(estado === "ocioso" || estado === "gerando" || estado === "erro" || estado === "expirado") && (
              <>
                <button
                  type="button"
                  id="btn-assinar-pix"
                  onClick={assinar}
                  disabled={estado === "gerando"}
                  className="flex items-center gap-3 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
                  {estado === "gerando"
                    ? "Gerando Pix…"
                    : estado === "expirado"
                      ? "Gerar novo Pix"
                      : `Assinar${precoCentavos ? ` por ${formatarPreco(precoCentavos)}` : ""} via Pix`}
                </button>
                {estado === "expirado" && (
                  <p className="mt-3 font-mono text-xs text-rec">
                    O código Pix expirou. Gere um novo para pagar.
                  </p>
                )}
                {erroMensagem && <p className="mt-3 font-mono text-xs text-rec">{erroMensagem}</p>}
              </>
            )}

            {estado === "aguardando" && cobranca && (
              <div className="space-y-5">
                <div className="flex items-center gap-2 font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                  <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
                  Aguardando pagamento · expira em {min}:{seg}
                </div>

                {/* QR Code */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`data:image/png;base64,${cobranca.qrCodeBase64}`}
                  alt="QR Code Pix"
                  className="size-56 border border-tinta/10 bg-white p-2"
                />

                {/* Copia e cola */}
                <div>
                  <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-widest text-tinta-suave">
                    Pix copia e cola
                  </p>
                  <div className="flex items-stretch gap-2">
                    <code className="flex-1 overflow-x-auto whitespace-nowrap border border-tinta/15 bg-tinta/3 px-3 py-2 font-mono text-xs text-tinta-suave">
                      {cobranca.copiaECola}
                    </code>
                    <button
                      type="button"
                      id="btn-copiar-pix"
                      onClick={copiar}
                      className="shrink-0 border border-tinta bg-tinta px-4 font-mono text-xs font-bold uppercase tracking-wider text-papel transition-opacity hover:opacity-80"
                    >
                      {copiado ? "✓" : "Copiar"}
                    </button>
                  </div>
                </div>

                <p className="font-mono text-xs text-cinza">
                  Pague pelo app do seu banco. A liberação do plano é automática assim
                  que o pagamento cair — pode deixar esta tela aberta.
                </p>
              </div>
            )}

            {estado === "aprovado" && (
              <div className="border border-marca/40 bg-marca/10 p-6">
                <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
                  ✓ Pagamento confirmado!
                </p>
                <p className="mt-2 text-sm text-tinta-suave">
                  Seu plano pro está ativo. Aproveite seus 50 roteiros por mês.
                </p>
                <button
                  type="button"
                  onClick={() => router.push("/designer")}
                  className="mt-4 bg-tinta px-5 py-2.5 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-opacity hover:opacity-80"
                >
                  Criar roteiro →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <RodapeApp />
    </div>
  );
}
