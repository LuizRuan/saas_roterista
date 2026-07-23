import { Schema, model, type HydratedDocument, type InferSchemaType } from "mongoose";

/**
 * Um pagamento Pix (Mercado Pago) de um usuário para o plano pro.
 *
 * `planoConcedido` é a trava de idempotência: garante que um webhook duplicado
 * (o Mercado Pago reenvia notificações) não estenda o plano duas vezes.
 */
const pagamentoSchema = new Schema(
  {
    usuarioId: { type: Schema.Types.ObjectId, ref: "Usuario", required: true, index: true },
    // Id do pagamento no Mercado Pago — único, evita processar o mesmo 2x.
    mpPaymentId: { type: String, required: true, unique: true },
    valorCentavos: { type: Number, required: true },
    status: {
      type: String,
      enum: ["pendente", "aprovado", "expirado", "cancelado"],
      default: "pendente",
    },
    // true depois que este pagamento já concedeu o pro (idempotência).
    planoConcedido: { type: Boolean, default: false },
    // Quando o QR expira (para a contagem regressiva no frontend).
    expiraEm: { type: Date, required: true },
  },
  { timestamps: true }
);

pagamentoSchema.index({ usuarioId: 1, createdAt: -1 });

export type Pagamento = InferSchemaType<typeof pagamentoSchema>;
export type PagamentoDoc = HydratedDocument<Pagamento>;

export const PagamentoModel = model("Pagamento", pagamentoSchema);
