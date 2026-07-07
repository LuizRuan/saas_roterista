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
    // Contador atômico de roteiros gerados no dia — usado para aplicar o
    // limite diário do plano free sem race condition (ver reservarUsoDiario).
    usoRoteirosDiario: {
      dia: { type: Date, default: null },
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

/** Forma pública do usuário — nunca expõe senhaHash/refreshTokenHash. */
export function usuarioPublico(usuario: UsuarioDoc) {
  return {
    id: usuario._id.toString(),
    nome: usuario.nome,
    email: usuario.email,
    plano: usuario.plano,
    papel: usuario.papel as "usuario" | "admin",
    criadoEm: usuario.createdAt,
  };
}
