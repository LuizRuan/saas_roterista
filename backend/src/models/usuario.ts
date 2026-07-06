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
    // SHA-256 do refresh token ativo (rotação): null = nenhuma sessão aberta.
    refreshTokenHash: { type: String, default: null },
  },
  { timestamps: true }
);

export type Usuario = InferSchemaType<typeof usuarioSchema>;
export type UsuarioDoc = HydratedDocument<Usuario>;

export const UsuarioModel = model("Usuario", usuarioSchema);

/** Forma pública do usuário — nunca expõe senhaHash/refreshTokenHash. */
export function usuarioPublico(usuario: UsuarioDoc) {
  return {
    id: usuario._id.toString(),
    nome: usuario.nome,
    email: usuario.email,
    plano: usuario.plano,
    criadoEm: usuario.createdAt,
  };
}
