# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Idioma

Todo o código, comentários, mensagens de commit e comunicação com o usuário são em **português brasileiro** — nomes de variáveis, funções, arquivos e rotas inclusive (ex.: `usuarioPublico`, `abrirSessao`, `/auth/cadastro`). Mantenha esse padrão.

## Estrutura

Dois projetos independentes na raiz, cada um com seu `package.json`:

- **`frontend/`** — Next.js 16 (App Router) + TypeScript + Tailwind CSS v4. Deploy na Vercel.
- **`backend/`** — Express 4 + TypeScript (via `tsx`, módulos CommonJS) + Mongoose. Deploy no Render.

Não há workspaces npm; instale/rode comandos dentro de cada pasta.

## Comandos

**Backend** (`cd backend`):
- `npm run dev` — API com `tsx watch` em `http://localhost:4000`. Sobe mesmo sem `MONGODB_URI` (com aviso), mas rotas que usam banco respondem 503.
- `npm run dev:memoria` — API + MongoDB **em memória** (mongodb-memory-server). Use para desenvolver/testar sem cluster Atlas; dados somem ao desligar.
- `npm test` — Vitest (integração do auth com Mongo em memória). Um teste só: `npx vitest run -t "nome do teste"`.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run build` / `npm start` — compila para `dist/` e roda o JS.

**Frontend** (`cd frontend`):
- `npm run dev` — Next dev em `http://localhost:3000`.
- `npm run build` / `npm start` / `npm run lint`.

⚠️ **Não rode `next build` no frontend enquanto o `npm run dev` do usuário estiver ativo** — eles compartilham `.next/` e o dev passa a servir CSS/chunks obsoletos (parece bug visual no site). Se buildar, reinicie o dev e faça hard refresh.

## ⚠️ Next.js 16 tem breaking changes

Este é o conteúdo de `frontend/AGENTS.md` (reproduzido aqui para ficar tudo num lugar só):

> **This is NOT the Next.js you know**
>
> This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

Na prática: **consulte `frontend/node_modules/next/dist/docs/` antes de escrever código de frontend** e respeite os avisos de depreciação. Ex.: `useRouter` vem de `next/navigation`, não `next/router`.

## Zod: versões diferentes entre os projetos

- **Backend usa Zod 3**, **frontend usa Zod 4** — as APIs divergem (ex.: no v4, `z.email()` é top-level em vez de `z.string().email()`). Os schemas de auth existem dos dois lados de propósito (validação no cliente **e** no servidor); ao editar um, respeite a versão daquele projeto.

## Arquitetura de autenticação (o ponto mais delicado)

O fluxo cruza `frontend/src/lib/api.ts` ↔ `backend/src/routes/auth.ts`; entenda os dois juntos antes de mexer:

- **Access token JWT (15 min)** — vive **só em memória** no frontend (`lib/api.ts`), nunca em `localStorage` (evita XSS). Enviado em `Authorization: Bearer`.
- **Refresh token (7 dias)** — cookie **`httpOnly`** com `path=/auth`, **rotacionado a cada uso**. O backend guarda só o hash SHA-256 do token ativo (`refreshTokenHash` no doc do usuário). Reuso de um refresh já rotacionado (cookie roubado) → **revoga a sessão inteira**.
- **Anti-CSRF** — `/auth/refresh` e `/auth/logout` exigem o header `x-cliente: gancho-web`. Formulários de terceiros não conseguem enviá-lo; fetch de outra origem dispara preflight barrado pelo CORS. O frontend manda esse header em toda requisição (`lib/api.ts`).
- **CORS** é restrito a `CLIENT_URL` com `credentials: true`; o cookie precisa disso.
- Cookie é `SameSite=Strict` em dev e `SameSite=None; Secure` em produção (frontend e API ficam em domínios diferentes: Vercel × Render).
- Anti-enumeração: e-mail inexistente e senha errada retornam a **mesma** resposta 401.
- Rate limit de 30 req/15 min por IP nas rotas de auth (desligado em `NODE_ENV=test`).

Camadas do backend: `routes/` → `middleware/` (`autenticar` valida Bearer; `validar` aplica Zod) → `services/tokens.ts` (geração/verificação/hash) → `models/` (Mongoose). `config/env.ts` valida env com Zod e, em produção, exige `MONGODB_URI` + `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` distintos entre si.

## Design da landing (não é template de SaaS)

Estética editorial "roteiro/papel de estúdio" — evite deliberadamente o clichê "SaaS de IA dark + roxo neon". Tokens de cor em `frontend/src/app/globals.css` (`papel`, `tinta`, `marca`, `rec`); fontes Anton (display) + Archivo (corpo) + IBM Plex Mono. O efeito assinatura é o marca-texto amarelo: `.marca-texto` pinta só a metade de baixo da letra (para **fundo claro**); em **fundo escuro** use `.marca-texto-cheio`, que cobre a letra inteira.

## Honestidade no produto (regra da spec)

Nunca criar depoimentos ou métricas falsos apresentados como reais — exemplos devem ser rotulados como "Demonstração". Em dados de padrões virais, armazenar só o padrão estrutural, nunca transcrições de vídeos de terceiros. Nada de promessas de viralização garantida.

## Fases de construção

O projeto é construído **em fases, com confirmação do usuário antes de cada uma**. Concluídas: 1-Setup, 2-Landing, 3-Auth+segurança. Próximas: 4-Dashboard+geração (plano free, entra a camada `ai-provider` Groq/Gemini free → Claude pro), 5-Formulário avançado/plano pago, 6-Estrutura de pagamento (Mercado Pago **preparado, sem cobrança ativa**), 7-Polimento. Status detalhado no `README.md`.
