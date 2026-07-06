import { z } from "zod";

// Espelha backend/src/schemas/auth.ts — validação nos dois lados, sempre.
export const cadastroSchema = z.object({
  nome: z
    .string()
    .trim()
    .min(2, "O nome precisa de pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: z.email("E-mail inválido."),
  senha: z
    .string()
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email: z.email("E-mail inválido."),
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
