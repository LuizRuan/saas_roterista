"use client";

/**
 * Campo de texto estilo "sublinhado" (border-b-2, sem caixa) usado nos
 * formulários do designer e do admin. O fluxo de auth usa o `Campo` em caixa
 * (components/auth/campo.tsx) de propósito — não unificar os dois.
 */
export function CampoSublinhado({
  id,
  rotulo,
  dica,
  placeholder,
  maximo,
  maxLength,
  linhas = 1,
  valor,
  onChange,
  erro,
  mostrarRotulo = true,
}: {
  id: string;
  rotulo: string;
  dica?: string;
  placeholder: string;
  /** Quando presente, mostra o contador e limita a digitação (folga de 50). */
  maximo?: number;
  /** Limite duro de digitação sem contador (para campos sem `maximo`). */
  maxLength?: number;
  /** >1 vira textarea. */
  linhas?: number;
  valor: string;
  onChange: (v: string) => void;
  erro?: string;
  /** false quando o chamador já renderiza o rótulo (ex.: <legend> própria). */
  mostrarRotulo?: boolean;
}) {
  const perto = maximo !== undefined && valor.length > maximo * 0.85;
  const excedido = maximo !== undefined && valor.length > maximo;
  const limite = maxLength ?? (maximo !== undefined ? maximo + 50 : undefined);

  const classeCampo = `w-full border-b-2 bg-transparent px-0 py-2 text-sm placeholder:text-cinza focus:outline-none ${
    erro
      ? "border-rec"
      : excedido
        ? "border-rec/50"
        : "border-tinta/20 focus:border-tinta"
  }`;

  return (
    <div className="space-y-2">
      {mostrarRotulo && (
        <div className="flex items-baseline justify-between">
          <label
            htmlFor={id}
            className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta"
          >
            {rotulo}
          </label>
          {maximo !== undefined && (
            <span
              className={`font-mono text-[10px] tabular-nums transition-colors ${
                excedido
                  ? "text-rec font-semibold"
                  : perto
                    ? "text-tinta-suave"
                    : "text-cinza"
              }`}
            >
              {valor.length}/{maximo}
            </span>
          )}
        </div>
      )}

      {dica && (
        <p className="font-mono text-[10px] leading-snug text-cinza">{dica}</p>
      )}

      {linhas > 1 ? (
        <textarea
          id={id}
          rows={linhas}
          maxLength={limite}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={mostrarRotulo ? undefined : rotulo}
          className={`resize-none leading-relaxed ${classeCampo}`}
        />
      ) : (
        <input
          id={id}
          type="text"
          maxLength={limite}
          placeholder={placeholder}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-label={mostrarRotulo ? undefined : rotulo}
          className={classeCampo}
        />
      )}

      {erro && <p className="font-mono text-xs text-rec">{erro}</p>}
    </div>
  );
}
