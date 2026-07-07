import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";
// A API fica em outro domínio em produção (Vercel × Render) — precisa estar
// na connect-src, senão o CSP bloqueia o fetch de auth/roteiros/admin.
const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// CAPTCHA (cadastro/recuperar-senha) — o widget carrega um script e abre um
// iframe de desafio a partir do domínio da Cloudflare.
const TURNSTILE_ORIGIN = "https://challenges.cloudflare.com";

const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline' ${TURNSTILE_ORIGIN}${isDev ? " 'unsafe-eval'" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data:;
  font-src 'self';
  connect-src 'self' ${apiUrl} ${TURNSTILE_ORIGIN};
  frame-src ${TURNSTILE_ORIGIN};
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: cspHeader },
          // Redundante com frame-ancestors, mas mantém navegadores antigos protegidos.
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
        ],
      },
    ];
  },
};

export default nextConfig;
