import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Padrão estrutural de roteiro viral curado pelo admin.
 * É injetado no prompt da IA para guiar a geração de roteiros dos usuários.
 */
const padraoViralSchema = new Schema(
  {
    titulo: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    formato: {
      type: String,
      enum: ["reels-30s", "reels-60s", "shorts-60s", "tiktok-15s", "tiktok-60s", "youtube-3min"],
      required: true,
    },
    tom: {
      type: String,
      enum: ["urgente", "inspirador", "provocador", "educativo", "curioso"],
      required: true,
    },
    // Seções do roteiro (texto livre — o que o admin escreve)
    gancho: { type: String, required: true, trim: true, maxlength: 400 },
    problema: { type: String, required: true, trim: true, maxlength: 800 },
    virada: { type: String, required: true, trim: true, maxlength: 800 },
    prova: { type: String, required: true, trim: true, maxlength: 800 },
    cta: { type: String, required: true, trim: true, maxlength: 400 },
    // Pode desativar sem deletar — padrões inativos não são enviados à IA
    ativo: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export type PadraoViral = InferSchemaType<typeof padraoViralSchema>;
export type PadraoViralDoc = HydratedDocument<PadraoViral>;

export const PadraoViralModel = model("PadraoViral", padraoViralSchema);

/** Forma pública do padrão — usada nas respostas da API. */
export function padraoPublico(p: PadraoViralDoc) {
  return {
    id: p._id.toString(),
    titulo: p.titulo,
    formato: p.formato,
    tom: p.tom,
    gancho: p.gancho,
    problema: p.problema,
    virada: p.virada,
    prova: p.prova,
    cta: p.cta,
    ativo: p.ativo,
    criadoEm: p.createdAt,
  };
}
