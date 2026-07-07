import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const FORMATOS = ["reels-30s", "reels-60s", "shorts-60s", "tiktok-15s", "tiktok-60s", "youtube-3min"] as const;
const TONS = ["urgente", "inspirador", "provocador", "educativo", "curioso"] as const;

/**
 * Roteiro gerado pela IA e salvo para o usuário.
 */
const roteiroSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    tema: { type: String, required: true, trim: true, maxlength: 280 },
    formato: { type: String, required: true, enum: FORMATOS },
    tom: { type: String, required: true, enum: TONS },
    publico: { type: String, default: "", trim: true, maxlength: 80 },
    palavraChave: { type: String, default: "", trim: true, maxlength: 60 },
    // Seções do roteiro gerado — com maxlength para evitar abuso
    gancho: { type: String, required: true, maxlength: 600 },
    problema: { type: String, required: true, maxlength: 1200 },
    virada: { type: String, required: true, maxlength: 1200 },
    prova: { type: String, required: true, maxlength: 1200 },
    cta: { type: String, required: true, maxlength: 600 },
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
  // P6: roteiros nunca são editados — updatedAt é desperdício de espaço
  { timestamps: { createdAt: true, updatedAt: false } }
);

// P3: índice composto que cobre listagem + contagem diária.
// Substitui o índice simples { usuarioId: 1 }.
roteiroSchema.index({ usuarioId: 1, createdAt: -1 });

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
