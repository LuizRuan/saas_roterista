# Gancho — Roteiros Virais com IA

> **"Gancho"** é um nome provisório (gancho = hook, o elemento central de vídeos virais).
> Para trocar, basta renomear aqui e nos `package.json` — nada depende do nome ainda.

Plataforma SaaS que gera roteiros de vídeo virais com IA, baseada em padrões
estruturais extraídos de vídeos que realmente viralizaram (hooks, ritmo,
estrutura de retenção) — não geração genérica de texto.

## Stack

| Camada | Tecnologia | Deploy |
|---|---|---|
| Frontend | Next.js 16 (App Router) + TypeScript + Tailwind CSS | Vercel |
| Backend | Node.js/Express + TypeScript (API REST) | Render |
| Banco | MongoDB Atlas (free tier) + Mongoose | Atlas |
| Auth | JWT (15min) + refresh token em cookie httpOnly, bcrypt | — |
| IA | Camada de abstração: Groq/Gemini (free) → Claude (pro) | — |
| Pagamento | Pix via Mercado Pago (automático, webhook assinado + fallback) | — |

## Estrutura

```
saas_roterista/
├── frontend/   # Next.js — landing page, cadastro/login, dashboard
│   └── src/
│       ├── app/            # rotas (/, /cadastro, /login, /dashboard, …)
│       ├── components/     # landing/, auth/, dashboard/
│       └── lib/            # api.ts (sessão + fetch) e validacao.ts (Zod)
└── backend/    # Express — API REST, autenticação, geração de roteiros
    ├── scripts/  # dev-sem-atlas.ts (MongoDB em memória p/ dev)
    └── src/
        ├── config/     # env (validado com Zod) e conexão MongoDB
        ├── models/     # Mongoose (Usuario)
        ├── schemas/    # validação Zod das rotas
        ├── middleware/ # autenticar (JWT) e validar (Zod)
        ├── services/   # tokens (access 15min + refresh 7d rotacionado)
        ├── routes/     # /auth: cadastro, login, refresh, logout, eu
        ├── app.ts      # Express + helmet + cors + cookies + rotas
        └── server.ts   # bootstrap
```

## Autenticação (Fase 3)

- **Cadastro/Login** com bcrypt (custo 12) e validação Zod no client **e** no server.
- **Access token JWT (15 min)** — só em memória no frontend, nunca em localStorage.
- **Refresh token (7 dias)** — cookie `httpOnly` restrito a `/auth`, com **rotação**:
  cada uso troca o token; reuso de token antigo revoga a sessão inteira.
- **Anti-CSRF** — `/auth/refresh` e `/auth/logout` exigem o cabeçalho `x-cliente`,
  que formulários de terceiros não conseguem enviar (preflight barrado pelo CORS).
- **Rate limit** — 30 requisições / 15 min por IP nas rotas de auth.
- Mensagem única para e-mail inexistente × senha errada (anti-enumeração).

Rotas: `POST /auth/cadastro` · `POST /auth/login` · `POST /auth/refresh` ·
`POST /auth/logout` · `GET /auth/eu` (Bearer).

## Como rodar (desenvolvimento)

Pré-requisitos: Node.js 20+ e uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) (free tier).

**1. Backend** (terminal 1):

```bash
cd backend
npm install
# copie .env.example para .env e cole sua MONGODB_URI do Atlas
npm run dev          # http://localhost:4000  →  GET /health
```

Ainda **sem Atlas**? Rode com um MongoDB em memória (os dados somem ao desligar):

```bash
npm run dev:memoria
```

O `npm run dev` sobe mesmo sem `MONGODB_URI` (com aviso), mas cadastro/login
respondem 503 até existir banco. Testes: `npm test` (13 testes de integração
do auth, com MongoDB em memória).

**2. Frontend** (terminal 2):

```bash
cd frontend
npm install
# copie .env.example para .env.local
npm run dev          # http://localhost:3000
```

## Variáveis de ambiente

- `backend/.env.example` — PORT, MONGODB_URI, CLIENT_URL (CORS), JWT_ACCESS_SECRET e JWT_REFRESH_SECRET (obrigatórios e distintos em produção)
- `frontend/.env.example` — NEXT_PUBLIC_API_URL
- **Nunca commitar `.env`** — os `.gitignore` já cuidam disso.

## Fases de construção

- [x] **Fase 1** — Setup (Next.js + Express + MongoDB + env)
- [x] **Fase 2** — Landing page completa
- [x] **Fase 3** — Cadastro/Login + segurança (JWT, bcrypt, rate limit, CSRF, Turnstile,
  recuperação de senha, conta/LGPD)
- [x] **Fase 4** — Dashboard + geração de roteiro (pipeline de IA multi-agente, limite mensal)
- [ ] **Fase 5** — Formulário avançado + lógica do plano pago
- [x] **Fase 6** — Pagamento **Pix (Mercado Pago)** automático: cobrança com QR + copia-e-cola,
  webhook com assinatura HMAC + fallback por polling, plano pro por 30 dias (50 roteiros/mês).
  Requer `MERCADOPAGO_ACCESS_TOKEN`/`_WEBHOOK_SECRET` em produção.
- [ ] **Fase 7** — Polimento visual, animações, responsividade
