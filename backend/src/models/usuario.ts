import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const usuarioSchema = new Schema(
  {
    nome: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    senhaHash: { type: String, required: true },
    plano: { type: String, enum: ["free", "pro"], default: "free" },
    // Quando o plano pro expira. null = sem pro. Pro só vale enquanto está no
    // futuro (ver planoProAtivo) — pro expirado é tratado como free sem job.
    planoExpiraEm: { type: Date, default: null },
    papel: { type: String, enum: ["usuario", "admin"], default: "usuario" },
    // SHA-256 do refresh token ativo (rotação): null = nenhuma sessão aberta.
    refreshTokenHash: { type: String, default: null },
    // Recuperação de senha
    resetSenhaHash: { type: String, default: null },
    resetSenhaExpira: { type: Date, default: null },
    // Data do aceite dos Termos de Uso/Política de Privacidade — auditoria de
    // consentimento (LGPD). Guarda a data, não só um boolean, para provar
    // qual versão vigente o usuário aceitou.
    termosAceitosEm: { type: Date, default: null },
    // Contador atômico de roteiros gerados no mês — usado para aplicar o
    // limite mensal do plano free sem race condition (ver reservarUsoMensal).
    usoRoteirosMensal: {
      mes: { type: Date, default: null },
      quantidade: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

export type Usuario = InferSchemaType<typeof usuarioSchema>;
export type UsuarioDoc = HydratedDocument<Usuario>;

// P5: índice em plano para queries futuras (listar pros, métricas por plano)
usuarioSchema.index({ plano: 1 });

export const UsuarioModel = model("Usuario", usuarioSchema);

/**
 * Fonte única da verdade para "o usuário tem pro ativo?". Pro só vale enquanto
 * planoExpiraEm está no futuro — assim um pro expirado é tratado como free em
 * todo lugar (limite mensal, etc.) sem precisar de job para rebaixar contas.
 */
export function planoProAtivo(
  usuario: { plano?: string | null; planoExpiraEm?: Date | null } | null | undefined
): boolean {
  if (!usuario || usuario.plano !== "pro") return false;
  return !!usuario.planoExpiraEm && usuario.planoExpiraEm.getTime() > Date.now();
}

/** Forma pública do usuário — nunca expõe senhaHash/refreshTokenHash. */
export function usuarioPublico(usuario: UsuarioDoc) {
  const proAtivo = planoProAtivo(usuario);
  return {
    id: usuario._id.toString(),
    nome: usuario.nome,
    email: usuario.email,
    // Reflete a validade: pro expirado aparece como "free" para o frontend.
    plano: (proAtivo ? "pro" : "free") as "free" | "pro",
    planoExpiraEm: proAtivo ? usuario.planoExpiraEm : null,
    papel: usuario.papel as "usuario" | "admin",
    criadoEm: usuario.createdAt,
  };
}
