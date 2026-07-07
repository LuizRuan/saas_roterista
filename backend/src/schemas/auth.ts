import { z } from "zod";

// ─── Domínios de e-mail permitidos ──────────────────────────────────────────
// Apenas provedores reais e conhecidos. Bloqueia domínios descartáveis/fake.
const DOMINIOS_PERMITIDOS = [
  // Google
  "gmail.com",
  "googlemail.com",
  // Microsoft
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  // Apple
  "icloud.com",
  "me.com",
  "mac.com",
  // Yahoo
  "yahoo.com",
  "yahoo.com.br",
  "ymail.com",
  // Provedores BR
  "uol.com.br",
  "bol.com.br",
  "terra.com.br",
  "ig.com.br",
  "globo.com",
  "r7.com",
  // Proton
  "proton.me",
  "protonmail.com",
  // Outros confiáveis
  "zoho.com",
  "aol.com",
];

function validarDominioEmail(email: string): boolean {
  const dominio = email.split("@")[1]?.toLowerCase();
  if (!dominio) return false;
  return DOMINIOS_PERMITIDOS.includes(dominio);
}

// ─── Regras de senha ────────────────────────────────────────────────────────
function validarSenha(senha: string): string | true {
  if (/\s/.test(senha)) return "A senha não pode conter espaços.";
  if (!/[A-Za-z]/.test(senha)) return "A senha precisa de pelo menos uma letra.";
  if (!/[0-9]/.test(senha)) return "A senha precisa de pelo menos um número.";
  return true;
}

// ─── Schemas ─────────────────────────────────────────────────────────────────

export const cadastroSchema = z.object({
  nome: z
    .string({ required_error: "Informe seu nome." })
    .trim()
    .min(2, "O nome precisa de pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres.")
    // Remove espaços duplos e caracteres especiais suspeitos
    .transform((n) => n.replace(/\s+/g, " "))
    .refine((n) => /^[a-zA-ZÀ-ÿ\s'-]+$/.test(n), {
      message: "O nome contém caracteres inválidos.",
    }),
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido.")
    // Bloqueia espaços no e-mail
    .refine((e) => !/\s/.test(e), { message: "O e-mail não pode conter espaços." })
    // Apenas domínios confiáveis
    .refine(validarDominioEmail, {
      message:
        "Use um e-mail de um provedor conhecido (Gmail, Outlook, iCloud, Yahoo, etc).",
    }),
  senha: z
    .string({ required_error: "Informe uma senha." })
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    // 72 bytes é o limite efetivo do bcrypt
    .max(72, "A senha pode ter no máximo 72 caracteres.")
    .refine(
      (s) => {
        const resultado = validarSenha(s);
        return resultado === true;
      },
      (s) => {
        const resultado = validarSenha(s);
        return { message: typeof resultado === "string" ? resultado : "" };
      }
    ),
  aceitouTermos: z.boolean().refine((v) => v === true, {
    message: "É necessário aceitar os Termos de Uso e a Política de Privacidade.",
  }),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  senha: z
    .string({ required_error: "Informe sua senha." })
    .min(1, "Informe sua senha."),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
