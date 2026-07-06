import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Roteiro gerado pela IA e salvo para o usuário.
 */
const roteiroSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
    tema: { type: String, required: true, trim: true, maxlength: 280 },
    formato: { type: String, required: true },
    tom: { type: String, required: true },
    publico: { type: String, default: "", trim: true },
    palavraChave: { type: String, default: "", trim: true },
    // Seções do roteiro gerado
    gancho: { type: String, required: true },
    problema: { type: String, required: true },
    virada: { type: String, required: true },
    prova: { type: String, required: true },
    cta: { type: String, required: true },
    // Avaliação do crítico
    notas: {
      gancho: { type: Number, default: 0 },
      retencao: { type: Number, default: 0 },
      cta: { type: Number, default: 0 },
      clareza: { type: Number, default: 0 },
      adequacao: { type: Number, default: 0 },
    },
    notaFinal: { type: Number, default: 0 },
    aprovado: { type: Boolean, default: false },
    tentativas: { type: Number, default: 1 },
  },
  { timestamps: true }
);

export type Roteiro = InferSchemaType<typeof roteiroSchema>;
export type RoteiroDoc = HydratedDocument<Roteiro>;

export const RoteiroModel = model("Roteiro", roteiroSchema);

/** Forma pública — usada nas respostas da API. */
export function roteiroPublico(r: RoteiroDoc) {
  return {
    id: r._id.toString(),
    tema: r.tema,
    formato: r.formato,
    tom: r.tom,
    publico: r.publico,
    palavraChave: r.palavraChave,
    gancho: r.gancho,
    problema: r.problema,
    virada: r.virada,
    prova: r.prova,
    cta: r.cta,
    notas: r.notas,
    notaFinal: r.notaFinal,
    aprovado: r.aprovado,
    tentativas: r.tentativas,
    criadoEm: r.createdAt,
  };
}
