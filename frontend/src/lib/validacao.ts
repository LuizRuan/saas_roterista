import { z } from "zod";

// ─── Domínios permitidos (idêntico ao backend) ───────────────────────────────
const DOMINIOS_PERMITIDOS = [
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "icloud.com", "me.com", "mac.com",
  "yahoo.com", "yahoo.com.br", "ymail.com",
  "uol.com.br", "bol.com.br", "terra.com.br", "ig.com.br", "globo.com", "r7.com",
  "proton.me", "protonmail.com",
  "zoho.com", "aol.com",
];

function dominioPermitido(email: string): boolean {
  const dominio = email.split("@")[1]?.toLowerCase();
  return dominio ? DOMINIOS_PERMITIDOS.includes(dominio) : false;
}

// ─── Validação de senha ──────────────────────────────────────────────────────
function regrasSenha(senha: string): string | true {
  if (/\s/.test(senha)) return "A senha não pode conter espaços.";
  if (!/[A-Za-z]/.test(senha)) return "A senha precisa de pelo menos uma letra.";
  if (!/[0-9]/.test(senha)) return "A senha precisa de pelo menos um número.";
  return true;
}

// ─── Schemas (espelham backend/src/schemas/auth.ts) ─────────────────────────

export const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "O nome precisa de pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres.")
    .transform((n) => n.replace(/\s+/g, " "))
    .refine((n) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(n), {
      message: "O nome contém caracteres inválidos.",
    }),
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    .refine((e) => !/\s/.test(e), { message: "O e-mail não pode conter espaços." })
    .refine(dominioPermitido, {
      message: "Use um e-mail de um provedor conhecido (Gmail, Outlook, iCloud, Yahoo, etc).",
    }),
  senha: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres.")
    .refine((s) => !/\s/.test(s), { message: "A senha não pode conter espaços." })
    .refine((s) => /[A-Za-z]/.test(s), { message: "A senha precisa de pelo menos uma letra." })
    .refine((s) => /[0-9]/.test(s), { message: "A senha precisa de pelo menos um número." }),
  aceitouTermos: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  }),
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  senha: z.string().min(1, "Informe sua senha."),
});

/** Converte o resultado do Zod em { campo: primeira mensagem }. */
export function errosPorCampo(erro: z.ZodError): Record<string, string> {
  const erros: Record<string, string> = {};
  for (const issue of erro.issues) {
    const campo = String(issue.path[0] ?? "geral");
    if (!erros[campo]) erros[campo] = issue.message;
  }
  return erros;
}
