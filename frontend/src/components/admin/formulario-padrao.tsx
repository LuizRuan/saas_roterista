"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { criarPadrao, atualizarPadrao, type PadraoViral, type PadraoViralInput } from "@/lib/api";
import { CampoSublinhado } from "@/components/app/campo-sublinhado";

// ---------------------------------------------------------------------------
// Dados estáticos
// ---------------------------------------------------------------------------

const FORMATOS = [
  { valor: "reels-30s", label: "Reels 30s" },
  { valor: "reels-60s", label: "Reels 60s" },
  { valor: "shorts-60s", label: "Shorts 60s" },
  { valor: "tiktok-15s", label: "TikTok 15s" },
  { valor: "tiktok-60s", label: "TikTok 60s" },
  { valor: "youtube-3min", label: "YouTube 3min" },
];

const TONS = [
  { valor: "urgente", label: "Urgente" },
  { valor: "inspirador", label: "Inspirador" },
  { valor: "provocador", label: "Provocador" },
  { valor: "educativo", label: "Educativo" },
  { valor: "curioso", label: "Curioso" },
];

// ---------------------------------------------------------------------------
// Componente principal
// ---------------------------------------------------------------------------

interface Props {
  padraoExistente?: PadraoViral; // se passado = modo edição
}

export function FormularioPadrao({ padraoExistente }: Props) {
  const router = useRouter();
  const modoEdicao = !!padraoExistente;

  const [dados, setDados] = useState<PadraoViralInput>({
    titulo: padraoExistente?.titulo ?? "",
    formato: padraoExistente?.formato ?? "reels-60s",
    tom: padraoExistente?.tom ?? "urgente",
    gancho: padraoExistente?.gancho ?? "",
    problema: padraoExistente?.problema ?? "",
    virada: padraoExistente?.virada ?? "",
    prova: padraoExistente?.prova ?? "",
    cta: padraoExistente?.cta ?? "",
    ativo: padraoExistente?.ativo ?? true,
  });

  const [erros, setErros] = useState<Partial<Record<keyof PadraoViralInput, string>>>({});
  const [erroGeral, setErroGeral] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  function atualizar<K extends keyof PadraoViralInput>(campo: K, valor: PadraoViralInput[K]) {
    setDados((prev) => ({ ...prev, [campo]: valor }));
    setErros((prev) => ({ ...prev, [campo]: undefined }));
  }

  function validar(): boolean {
    const novosErros: Partial<Record<keyof PadraoViralInput, string>> = {};
    if (!dados.titulo.trim()) novosErros.titulo = "Informe um título.";
    if (dados.gancho.trim().length < 10) novosErros.gancho = "Gancho muito curto (mín. 10 caracteres).";
    if (dados.problema.trim().length < 10) novosErros.problema = "Problema muito curto (mín. 10 caracteres).";
    if (dados.virada.trim().length < 10) novosErros.virada = "Virada muito curta (mín. 10 caracteres).";
    if (dados.prova.trim().length < 10) novosErros.prova = "Prova muito curta (mín. 10 caracteres).";
    if (dados.cta.trim().length < 5) novosErros.cta = "CTA muito curto (mín. 5 caracteres).";
    setErros(novosErros);
    return Object.keys(novosErros).length === 0;
  }

  async function aoEnviar(e: FormEvent) {
    e.preventDefault();
    if (!validar()) return;

    setEnviando(true);
    setErroGeral(null);
    try {
      if (modoEdicao && padraoExistente) {
        await atualizarPadrao(padraoExistente.id, dados);
      } else {
        await criarPadrao(dados);
      }
      setSalvo(true);
      setTimeout(() => router.push("/admin"), 800);
    } catch (err) {
      setErroGeral(
        err instanceof Error ? err.message : "Erro ao salvar. Tente novamente."
      );
      setEnviando(false);
    }
  }

  return (
    <form onSubmit={aoEnviar} noValidate className="space-y-10">

      {erroGeral && (
        <p role="alert" className="rounded-sm border border-rec/40 bg-rec/10 px-4 py-3 font-mono text-xs font-medium text-rec">
          {erroGeral}
        </p>
      )}

      {/* ── Metadados ── */}
      <section className="space-y-6">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
          [01] Identificação
        </p>

        <CampoSublinhado
          id="titulo"
          rotulo="Título do padrão"
          dica="Nome interno para identificar o padrão na lista (ex: 'Urgência financeira — 60s')."
          placeholder="Ex: Urgência financeira — Reels 60s"
          maximo={120}
          valor={dados.titulo}
          onChange={(v) => atualizar("titulo", v)}
          erro={erros.titulo}
        />

        {/* Formato */}
        <div className="space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
            Formato do vídeo
          </p>
          <div className="flex flex-wrap gap-2">
            {FORMATOS.map((f) => (
              <button
                key={f.valor}
                type="button"
                onClick={() => atualizar("formato", f.valor)}
                className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                  dados.formato === f.valor
                    ? "border-tinta bg-tinta text-papel"
                    : "border-tinta/20 text-tinta-suave hover:border-tinta/50 hover:text-tinta"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tom */}
        <div className="space-y-3">
          <p className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta">
            Tom narrativo
          </p>
          <div className="flex flex-wrap gap-2">
            {TONS.map((t) => (
              <button
                key={t.valor}
                type="button"
                onClick={() => atualizar("tom", t.valor)}
                className={`border px-3 py-1.5 font-mono text-xs uppercase tracking-wider transition-all ${
                  dados.tom === t.valor
                    ? "border-tinta bg-tinta text-papel"
                    : "border-tinta/20 text-tinta-suave hover:border-tinta/50 hover:text-tinta"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Seções do roteiro ── */}
      <section className="space-y-8">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
          [02] Estrutura do roteiro viral
        </p>

        <CampoSublinhado
          id="gancho"
          rotulo="Gancho (0–3s)"
          dica="A primeira frase que prende antes do swipe. Deve ser impactante e imediata."
          placeholder='Ex: "Você está perdendo dinheiro todo mês sem perceber."'
          maximo={400}
          linhas={3}
          valor={dados.gancho}
          onChange={(v) => atualizar("gancho", v)}
          erro={erros.gancho}
        />

        <CampoSublinhado
          id="problema"
          rotulo="Problema / Desenvolvimento (3–12s)"
          dica="Expande o gancho. Espelha a dor ou situação que o público reconhece."
          placeholder="Ex: A maioria das pessoas trabalha para pagar contas que poderiam ser eliminadas…"
          maximo={800}
          linhas={4}
          valor={dados.problema}
          onChange={(v) => atualizar("problema", v)}
          erro={erros.problema}
        />

        <CampoSublinhado
          id="virada"
          rotulo="Virada / Informação (12–25s)"
          dica="A informação que surpreende ou muda a perspectiva. O coração do roteiro."
          placeholder="Ex: Tem uma regra simples que muda isso: o extrato de 90 dias…"
          maximo={800}
          linhas={4}
          valor={dados.virada}
          onChange={(v) => atualizar("virada", v)}
          erro={erros.virada}
        />

        <CampoSublinhado
          id="prova"
          rotulo="Prova / Credibilidade (25–45s)"
          dica="Resultado concreto, número ou exemplo real que valida a virada."
          placeholder="Ex: Fiz isso em janeiro. Encontrei R$ 340 em assinaturas que não usava…"
          maximo={800}
          linhas={4}
          valor={dados.prova}
          onChange={(v) => atualizar("prova", v)}
          erro={erros.prova}
        />

        <CampoSublinhado
          id="cta"
          rotulo="Call to Action (45s+)"
          dica="Convite direto: salvar, comentar, seguir. Uma ação, sem ambiguidade."
          placeholder="Ex: Salva esse vídeo, faz o teste agora e me conta nos comentários."
          maximo={400}
          linhas={3}
          valor={dados.cta}
          onChange={(v) => atualizar("cta", v)}
          erro={erros.cta}
        />
      </section>

      {/* ── Configurações ── */}
      <section className="space-y-4">
        <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-rec">
          [03] Configurações
        </p>
        <label className="flex cursor-pointer items-center gap-3">
          <div
            role="switch"
            aria-checked={dados.ativo}
            onClick={() => atualizar("ativo", !dados.ativo)}
            className={`relative h-5 w-9 rounded-full transition-colors ${
              dados.ativo ? "bg-tinta" : "bg-tinta/20"
            }`}
          >
            <span
              className={`absolute top-0.5 size-4 rounded-full bg-papel shadow transition-transform ${
                dados.ativo ? "translate-x-4" : "translate-x-0.5"
              }`}
              style={{ background: dados.ativo ? "var(--color-marca)" : undefined }}
            />
          </div>
          <span className="font-mono text-xs uppercase tracking-widest text-tinta-suave">
            {dados.ativo ? "Padrão ativo — será injetado na IA" : "Padrão inativo — não será usado"}
          </span>
        </label>
      </section>

      {/* ── Botões ── */}
      <div className="flex items-center gap-4 border-t border-tinta/10 pt-8">
        <button
          type="submit"
          disabled={enviando || salvo}
          className="flex items-center gap-2 bg-tinta px-6 py-3 font-mono text-xs font-bold uppercase tracking-widest text-papel transition-all hover:bg-tinta-suave disabled:cursor-not-allowed disabled:opacity-50"
        >
          {salvo ? (
            <>
              <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
              Salvo! Redirecionando…
            </>
          ) : enviando ? (
            <>
              <span aria-hidden className="rec-pulso inline-block size-2 rounded-full bg-rec" />
              Salvando…
            </>
          ) : (
            <>
              <span aria-hidden className="inline-block size-2 rounded-full bg-marca" />
              {modoEdicao ? "Salvar alterações" : "Criar padrão"}
            </>
          )}
        </button>

        <button
          type="button"
          onClick={() => router.push("/admin")}
          className="font-mono text-xs uppercase tracking-widest text-tinta-suave underline decoration-marca/50 underline-offset-4 transition-colors hover:text-tinta"
        >
          Cancelar
        </button>
      </div>
    </form>
  );
}
