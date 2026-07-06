import { z } from "zod";

export const cadastroSchema = z.object({
  nome: z
    .string({ required_error: "Informe seu nome." })
    .trim()
    .min(2, "O nome precisa de pelo menos 2 caracteres.")
    .max(80, "O nome pode ter no máximo 80 caracteres."),
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  senha: z
    .string({ required_error: "Informe uma senha." })
    .min(8, "A senha precisa de pelo menos 8 caracteres.")
    // 72 bytes é o limite efetivo do bcrypt
    .max(72, "A senha pode ter no máximo 72 caracteres."),
});

export const loginSchema = z.object({
  email: z
    .string({ required_error: "Informe seu e-mail." })
    .trim()
    .toLowerCase()
    .email("E-mail inválido."),
  senha: z.string({ required_error: "Informe sua senha." }).min(1, "Informe sua senha."),
});

export type CadastroInput = z.infer<typeof cadastroSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
