import { z } from "zod";

/** Validação para confirmação de pagamento pelo admin. */
export const confirmarPagamentoSchema = z.object({
  // Nenhum corpo necessário — o ID vem da URL.
  // Mantido como objeto vazio para consistência com o padrão validarBody.
});

/** Validação para cancelamento de pagamento pelo usuário. */
export const cancelarPagamentoSchema = z.object({
  // Idem — ID na URL, sem corpo.
});
