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
  // Opcional em dev; sem ela a verificação é pulada (log de aviso).
  TURNSTILE_SECRET_KEY: z.string().default(""),
  // Pagamento PIX — chave HMAC para assinar códigos PIX (anti-fraude).
  // Obrigatória em produção; em dev usa um default inseguro.
  PIX_HMAC_SECRET: z.string().default("dev-pix-hmac-trocar-em-producao"),
  // Chave PIX do recebedor (e-mail, CPF, telefone ou chave aleatória).
  PIX_CHAVE: z.string().default(""),
  // Valor do plano Pro em centavos (2990 = R$ 29,90).
  PIX_VALOR_PRO_CENTAVOS: z.coerce.number().default(2990),
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
  if (!process.env.PIX_HMAC_SECRET) {
    console.error("[env] PIX_HMAC_SECRET é obrigatória em produção.");
    process.exit(1);
  }
}
