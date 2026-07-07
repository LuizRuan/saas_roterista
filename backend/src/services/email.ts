import { Resend } from "resend";
import { env } from "../config/env";
import { logger } from "../lib/logger";

let resendClient: Resend | null = null;

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (!resendClient) resendClient = new Resend(env.RESEND_API_KEY);
  return resendClient;
}

/**
 * Envia e-mail de recuperação de senha com o link contendo o token.
 * Retorna true se enviou, false se o serviço não está configurado.
 */
export async function enviarEmailRecuperacao(
  email: string,
  nome: string,
  token: string
): Promise<boolean> {
  const resend = getResend();
  if (!resend) {
    logger.warn("email", "RESEND_API_KEY não configurada — e-mail não enviado.");
    return false;
  }

  const link = `${env.CLIENT_URL}/resetar-senha?token=${token}`;

  await resend.emails.send({
    from: "Gancho <onboarding@resend.dev>",
    to: email,
    subject: "Recuperação de senha — Gancho",
    html: `
      <div style="font-family: monospace; max-width: 480px; margin: 0 auto; padding: 32px 24px;">
        <h1 style="font-size: 20px; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 24px;">
          ● GANCHO
        </h1>
        <p style="font-size: 14px; line-height: 1.8; color: #333;">
          Olá, <strong>${nome.split(" ")[0]}</strong>!
        </p>
        <p style="font-size: 14px; line-height: 1.8; color: #333;">
          Recebemos um pedido para redefinir sua senha. Clique no botão abaixo para criar uma nova:
        </p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="display: inline-block; background: #131210; color: #FAF8F4; padding: 14px 28px; text-decoration: none; font-family: monospace; font-size: 12px; letter-spacing: 2px; text-transform: uppercase; font-weight: bold;">
            Redefinir minha senha
          </a>
        </div>
        <p style="font-size: 12px; color: #999; line-height: 1.6;">
          Se você não pediu isso, ignore este e-mail. O link expira em 1 hora.
        </p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 10px; color: #bbb; letter-spacing: 1px; text-transform: uppercase;">
          Gancho · Roteiros virais com IA
        </p>
      </div>
    `,
  });

  return true;
}
