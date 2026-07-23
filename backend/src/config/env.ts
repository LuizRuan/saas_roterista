import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.coerce.number().default(4000),
  // Vazia em dev permite subir o servidor sem banco; obrigatória em produção
  MONGODB_URI: z.string().default(""),
  CLIENT_URL: z.string().url().default("http://localhost:3000"),
  // Defaults só valem em dev/test; em produção são obrigatórias (checagem abaixo)
  JWT_ACCESS_SECRET: z.string().default("dev-access-secret-trocar-em-producao"),
  JWT_REFRESH_SECRET: z.string().default("dev-refresh-secret-trocar-em-producao"),
  // Chaves de IA — opcionais em dev; sem elas a geração retorna erro 503.
  GROQ_API_KEY: z.string().default(""),
  GEMINI_API_KEY: z.string().default(""),
  // E-mail (recuperação de senha) — resend.com (100 emails/dia grátis)
  RESEND_API_KEY: z.string().default(""),
  // Opcional — se definido, recebe alerta por e-mail quando algo crítico
  // quebra em produção (IA fora do ar, banco caiu, exceção não tratada).
  ALERTA_EMAIL: z.string().default(""),
  // CAPTCHA anti-bot (cadastro e recuperação de senha) — Cloudflare Turnstile.
  // Opcional em dev; sem ela a verificação é pulada (log de aviso). Obrigatória em produção.
  TURNSTILE_SECRET_KEY: z.string().default(""),
  // Origens extras permitidas no CORS (ex.: previews da Vercel), por vírgula.
  CORS_ORIGINS: z.string().default(""),
  // Pagamento Pix (plano pro) — Mercado Pago. Sem o token, as rotas de pagamento
  // respondem 503 (feature desligada), sem travar o boot.
  MERCADOPAGO_ACCESS_TOKEN: z.string().default(""),
  // Segredo para validar a assinatura dos webhooks do Mercado Pago.
  MERCADOPAGO_WEBHOOK_SECRET: z.string().default(""),
  // Preço do plano pro em centavos (default R$ 19,90). Em env para trocar sem deploy.
  PLANO_PRO_PRECO_CENTAVOS: z.coerce.number().int().positive().default(1990),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "[env] Variáveis de ambiente inválidas:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const env = parsed.data;

if (env.NODE_ENV === "production") {
  if (!env.MONGODB_URI) {
    console.error("[env] MONGODB_URI é obrigatória em produção.");
    process.exit(1);
  }
  if (
    !process.env.JWT_ACCESS_SECRET ||
    !process.env.JWT_REFRESH_SECRET ||
    env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET
  ) {
    console.error(
      "[env] Em produção, JWT_ACCESS_SECRET e JWT_REFRESH_SECRET são obrigatórios e devem ser diferentes entre si."
    );
    process.exit(1);
  }
  // SEC-04: secrets fracos permitem brute force do JWT
  if (env.JWT_ACCESS_SECRET.length < 32 || env.JWT_REFRESH_SECRET.length < 32) {
    console.error("[env] JWT_ACCESS_SECRET e JWT_REFRESH_SECRET devem ter pelo menos 32 caracteres.");
    process.exit(1);
  }
  // CLIENT_URL controla CORS e o cookie httpOnly do refresh — sem defini-la o
  // schema cai no default localhost e quebra login/CORS silenciosamente.
  if (!process.env.CLIENT_URL) {
    console.error("[env] CLIENT_URL é obrigatória em produção (origem do frontend para CORS/cookie).");
    process.exit(1);
  }
  // Turnstile é controle de segurança (anti-bot) — exigido para nunca falhar aberto.
  if (!env.TURNSTILE_SECRET_KEY) {
    console.error("[env] TURNSTILE_SECRET_KEY é obrigatória em produção (CAPTCHA anti-bot).");
    process.exit(1);
  }
}
