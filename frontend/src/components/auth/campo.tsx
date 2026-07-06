import type { InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
};

export function Campo({ id, rotulo, erro, dica, ...props }: Props) {
  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave"
      >
        {rotulo}
      </label>
      <input
        id={id}
        aria-invalid={erro ? true : undefined}
        aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
        className={`mt-2 w-full rounded-md border bg-papel px-4 py-3 text-tinta placeholder:text-cinza ${
          erro ? "border-rec" : "border-tinta/20 hover:border-tinta/40"
        }`}
        {...props}
      />
      {erro ? (
        <p id={`${id}-erro`} className="mt-1.5 text-sm font-medium text-rec">
          {erro}
        </p>
      ) : dica ? (
        <p id={`${id}-dica`} className="mt-1.5 font-mono text-xs text-cinza">
          {dica}
        </p>
      ) : null}
    </div>
  );
}
