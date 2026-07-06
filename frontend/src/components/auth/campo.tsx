"use client";

import { useState, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  id: string;
  rotulo: string;
  erro?: string;
  dica?: string;
};

// Ícone olho aberto
function IconeOlho() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

// Ícone olho fechado (riscado)
function IconeOlhoFechado() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

export function Campo({ id, rotulo, erro, dica, type, ...props }: Props) {
  const [visivel, setVisivel] = useState(false);

  const eSenha = type === "password";
  const tipoEfetivo = eSenha ? (visivel ? "text" : "password") : type;

  return (
    <div>
      <label
        htmlFor={id}
        className="font-mono text-xs font-semibold uppercase tracking-widest text-tinta-suave"
      >
        {rotulo}
      </label>

      <div className="relative mt-2">
        <input
          id={id}
          type={tipoEfetivo}
          aria-invalid={erro ? true : undefined}
          aria-describedby={erro ? `${id}-erro` : dica ? `${id}-dica` : undefined}
          className={`w-full rounded-md border bg-papel px-4 py-3 text-tinta placeholder:text-cinza ${
            eSenha ? "pr-11" : ""
          } ${
            erro ? "border-rec" : "border-tinta/20 hover:border-tinta/40"
          }`}
          {...props}
        />

        {eSenha && (
          <button
            type="button"
            onClick={() => setVisivel((v) => !v)}
            aria-label={visivel ? "Ocultar senha" : "Mostrar senha"}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-cinza transition-colors hover:text-tinta"
          >
            {visivel ? <IconeOlhoFechado /> : <IconeOlho />}
          </button>
        )}
      </div>

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
