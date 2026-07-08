import { enviarAlertaErro } from "./email";

/**
 * Notifica falhas críticas por e-mail (via services/email.ts) — não todo
 * `logger.error`, só os sinais de que algo real quebrou em produção (IA fora
 * do ar, banco caiu, exceção não tratada). Rate-limitado em memória pra um
 * incidente em loop não virar uma caixa de entrada cheia de e-mails iguais.
 *
 * Fire-and-forget de propósito: nunca deve atrasar nem derrubar o fluxo que
 * está reportando o erro.
 */

const JANELA_MS = 10 * 60 * 1000; // 10 minutos
let ultimoEnvio = 0;

export function notificarErroCritico(mensagem: string, detalhes: Record<string, unknown> = {}): void {
  const agora = Date.now();
  if (agora - ultimoEnvio < JANELA_MS) return;
  ultimoEnvio = agora;

  enviarAlertaErro(mensagem, detalhes).catch(() => {
    // Não há pra onde escalar uma falha no próprio envio de alerta — melhor
    // engolir do que lançar dentro de um fluxo de tratamento de erro.
  });
}
