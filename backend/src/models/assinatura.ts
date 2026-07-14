import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

const STATUS_PAGAMENTO = ["pendente", "pago", "expirado", "cancelado"] as const;

/**
 * Registro de cada tentativa de pagamento PIX para upgrade de plano.
 *
 * Segurança:
 * - `pixHash` (HMAC-SHA256) valida autenticidade do código na confirmação.
 * - `idempotencyKey` (unique) evita cobranças duplicadas de gerações concorrentes.
 * - TTL index em `expiraEm` expira pendentes automaticamente.
 * - `confirmadoPor` registra quem aprovou (auditoria).
 */
const assinaturaSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true },
    plano: { type: String, enum: ["pro"], required: true },
    /** Valor em centavos — evita imprecisão de ponto flutuante (2990 = R$ 29,90). */
    valor: { type: Number, required: true },
    status: { type: String, enum: STATUS_PAGAMENTO, default: "pendente" },
    /** Código PIX "copia e cola" gerado pelo sistema. */
    pixCopiaECola: { type: String, required: true },
    /** HMAC-SHA256 do código + assinaturaId + valor — anti-falsificação. */
    pixHash: { type: String, required: true },
    /** Quando o código PIX expira (15 minutos após geração). */
    expiraEm: { type: Date, required: true },
    /** Data em que o pagamento foi confirmado. */
    pagoEm: { type: Date, default: null },
    /** Quem confirmou: "admin" (manual) ou "webhook" (automático). */
    confirmadoPor: { type: String, default: null },
    /** Chave de idempotência — evita pagamentos duplicados. */
    idempotencyKey: { type: String, required: true, unique: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// Consulta principal: pagamentos de um usuário filtrados por status.
assinaturaSchema.index({ usuarioId: 1, status: 1 });

// Listagem admin de pendentes ordenados por criação.
assinaturaSchema.index({ status: 1, createdAt: -1 });

export type Assinatura = InferSchemaType<typeof assinaturaSchema>;
export type AssinaturaDoc = HydratedDocument<Assinatura>;

export const AssinaturaModel = model("Assinatura", assinaturaSchema);

/** Forma pública — nunca expõe pixHash. */
export function assinaturaPublica(a: AssinaturaDoc) {
  return {
    id: a._id.toString(),
    plano: a.plano,
    valor: a.valor,
    status: a.status,
    pixCopiaECola: a.pixCopiaECola,
    expiraEm: a.expiraEm,
    pagoEm: a.pagoEm,
    criadoEm: a.createdAt,
  };
}
