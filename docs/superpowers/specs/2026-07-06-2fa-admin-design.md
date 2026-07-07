# 2FA por e-mail para contas admin

Data: 2026-07-06
Status: aprovado para plano de implementação

## Contexto e motivação

Fase 3 do plano de segurança (pós-hardening de auth: timing leak no login, race
condition em `/roteiros/gerar`, ObjectId validation, JWT algorithm lock,
CAPTCHA Turnstile — ver histórico de commits/conversa). Item pendente: reforço
de autenticação para contas `papel: "admin"`, que hoje têm acesso irrestrito
aos padrões virais (`/admin/padroes`) protegidas só por e-mail+senha.

Decisões já tomadas com o usuário:
- **Método**: código de 6 dígitos por e-mail (reaproveita `services/email.ts`
  e o Resend já configurado), não TOTP.
- **Obrigatoriedade**: opcional — cada admin ativa para a própria conta.
- **Onde ativar**: dentro da página `/admin` já existente (seção nova), sem
  criar rota de "configurações de conta" separada.

## Limitação conhecida (aceita conscientemente)

2FA por e-mail **não protege contra o comprometimento da própria caixa de
entrada** do admin: quem tem acesso ao e-mail consegue tanto resetar a senha
(`/auth/recuperar-senha`) quanto receber o código de 2FA. Esta camada
protege contra **senha vazada isoladamente** (reuso de senha, phishing só de
credencial, dump de banco de outro serviço) — não contra o e-mail em si
comprometido. Se o modelo de ameaça evoluir para incluir isso, considerar TOTP
como opção adicional no futuro (fora do escopo deste spec).

## Modelo de dados

Novos campos em `backend/src/models/usuario.ts` (`usuarioSchema`):

```ts
doisFatoresAtivo: { type: Boolean, default: false },
// Mesmo padrão de resetSenhaHash/resetSenhaExpira — nunca guarda o código em claro.
doisFatoresCodigoHash: { type: String, default: null },
doisFatoresCodigoExpira: { type: Date, default: null },
// Quando o código atual foi gerado — usado só para o cooldown de reenvio (60s).
doisFatoresCodigoGeradoEm: { type: Date, default: null },
// Conta tentativas erradas contra o código atual — zera a cada código novo gerado.
doisFatoresTentativas: { type: Number, default: 0 },
```

`usuarioPublico()` passa a incluir `doisFatoresAtivo` (é a única informação de
2FA segura para expor ao client — nunca hash/expiração/tentativas).

## Fluxo de ativação/desativação (rotas autenticadas, dentro de `/admin`)

Novo arquivo `backend/src/routes/duplo-fator.ts`, montado em `/admin/2fa` no
`app.ts`, protegido pelos mesmos middlewares do `adminRouter`
(`autenticar`, `exigirAdmin`).

### `POST /admin/2fa/ativar`
- Usa a função compartilhada `gerarEEnviarCodigo(usuario)` (nova, em
  `services/duplo-fator.ts`, reaproveitada também no login com 2FA e no
  reenvio): gera código de 6 dígitos (`crypto.randomInt(100000, 999999)`),
  salva `doisFatoresCodigoHash` (SHA-256, mesmo helper de `resetSenhaHash`),
  `doisFatoresCodigoExpira` (agora + 10 min) e `doisFatoresCodigoGeradoEm`
  (agora), zera `doisFatoresTentativas`, envia por e-mail (nova função
  `enviarCodigoDoisFatores` em `services/email.ts`, mesmo padrão visual de
  `enviarEmailRecuperacao`).
- Responde `200 { mensagem: "Código enviado. Confirme para ativar." }`.
- Se `doisFatoresAtivo` já for `true`, responde `400` (já ativo).

### `POST /admin/2fa/confirmar`
- Body: `{ codigo: string }` (Zod: 6 dígitos numéricos).
- Valida hash + expiração (`doisFatoresCodigoExpira > now`).
- Errado → incrementa `doisFatoresTentativas`; acima de 5 tentativas, invalida
  o código (força gerar um novo via `/ativar` de novo) — mesmo espírito do
  rate limit de login.
- Certo → `doisFatoresAtivo = true`, limpa campos de código/tentativas.

### `POST /admin/2fa/desativar`
- Body: `{ senha: string }` — reautenticação obrigatória (evita que uma sessão
  sequestrada desligue a proteção sozinha).
- Valida `bcrypt.compare` contra `senhaHash` do usuário autenticado
  (`req.usuarioId`, não da sessão iniciada há muito tempo).
- Certo → `doisFatoresAtivo = false`, limpa campos de código.
- Errado → `401`.

## Fluxo de login com 2FA ativo

### Mudança em `POST /auth/login`
Depois de validar e-mail+senha (lógica atual inalterada, incluindo o fix de
timing leak da Fase 1):

- Se `usuario.doisFatoresAtivo` for `false` → comportamento atual, sem mudança
  (retorna `accessToken` + cookie de refresh direto).
- Se for `true`:
  - Chama `gerarEEnviarCodigo(usuario)` (mesma função de `/admin/2fa/ativar`).
  - Gera um **`loginToken`**: JWT assinado com `JWT_ACCESS_SECRET`, payload
    `{ sub: usuarioId, escopo: "2fa-pendente" }`, `expiresIn: "5m"`.
  - Responde `200 { precisaCodigo: true, loginToken }` — **sem** `accessToken`
    e **sem** cookie de refresh (a sessão só abre depois do código).

### Middleware `autenticar` — rejeitar `loginToken` como Bearer normal
`verificarAccessToken` decodifica qualquer JWT válido com o mesmo secret; sem
tratamento explícito, um `loginToken` vazado funcionaria como Bearer válido
em qualquer rota autenticada. Fix: o payload do `loginToken` inclui
`escopo: "2fa-pendente"`; o middleware `autenticar` rejeita (401) qualquer
token que tenha esse campo. Tokens normais (login completo) nunca têm
`escopo`, então não são afetados.

### `POST /auth/login/verificar-codigo`
- Body: `{ loginToken: string, codigo: string }`.
- Verifica `loginToken` como JWT com `escopo: "2fa-pendente"` (rejeita
  qualquer outro formato/escopo/expirado → 401 "Sessão de login expirada.
  Entre novamente.").
- Busca usuário por `sub` do token, valida hash do código + expiração +
  tentativas (mesma lógica de `/admin/2fa/confirmar`; > 5 tentativas erradas
  invalida o código e exige reenvio).
- Certo → chama `abrirSessao` (idêntico ao login normal): gera
  accessToken+refreshToken, salva hash do refresh, seta cookie, responde
  `{ usuario, accessToken }`.

### `POST /auth/login/reenviar-codigo`
- Body: `{ loginToken: string }`.
- Valida o `loginToken` (mesmo formato acima).
- Cooldown: só permite reenvio se `doisFatoresCodigoGeradoEm` tiver mais de
  60s (`now - doisFatoresCodigoGeradoEm < 60s` → `429`, mensagem "Aguarde
  antes de pedir um novo código.").
- Gera novo código (mesma função `gerarEEnviarCodigo`, que sempre atualiza
  `doisFatoresCodigoGeradoEm` para `now`), responde
  `200 { mensagem: "Novo código enviado." }`.

### Rate limiting
- `/auth/login/verificar-codigo` e `/auth/login/reenviar-codigo` entram sob o
  `limiteAuth` já existente (`authRouter.use(limiteAuth, exigirBanco)` — são
  rotas do mesmo `authRouter`), sem necessidade de limiter dedicado por IP.
- Tentativas erradas de código já são limitadas por conta via
  `doisFatoresTentativas` (não por IP) — cobre o caso de um atacante trocar de
  IP para burlar rate limit de IP.

## Frontend

### Seção "Segurança da conta" em `/admin`
Novo componente `frontend/src/components/admin/secao-dois-fatores.tsx`,
renderizado no topo (ou seção dedicada) de `painel-admin.tsx`. Estados:
- 2FA desligado → botão "Ativar verificação por e-mail" → chama
  `ativarDoisFatores()` → mostra campo de código → `confirmarDoisFatores(codigo)`.
- 2FA ligado → botão "Desativar" → pede a senha atual num campo simples →
  `desativarDoisFatores(senha)`.

Novas funções em `frontend/src/lib/api.ts`: `ativarDoisFatores`,
`confirmarDoisFatores`, `desativarDoisFatores`, e o tipo `Usuario` ganha
`doisFatoresAtivo: boolean`.

### Tela intermediária de login
`formulario-login.tsx`: quando `entrar()` retornar `{ precisaCodigo: true,
loginToken }` em vez de lançar erro ou completar, o componente troca para um
segundo passo (campo de código de 6 dígitos + botão "Reenviar código"),
chamando novo `verificarCodigoLogin(loginToken, codigo)` em `lib/api.ts`. Ao
confirmar, segue o fluxo atual (`router.push("/dashboard")`).

`lib/api.ts`: `entrar()` muda o tipo de retorno para
`Usuario | { precisaCodigo: true; loginToken: string }`; `accessToken` só é
setado no módulo quando a resposta é uma sessão completa.

## Testes (TDD, seguindo o padrão já usado no projeto com `mongodb-memory-server`)

- `POST /admin/2fa/ativar` exige admin (403 pra usuário comum, 401 sem token).
- Ativar → confirmar com código certo → `doisFatoresAtivo` vira `true`.
- Confirmar com código errado não ativa; após 5 erros, código expira mesmo
  dentro do TTL de 10 min.
- Desativar exige senha correta (401 com senha errada); com senha certa,
  `doisFatoresAtivo` volta a `false`.
- Login de conta com 2FA ativo devolve `{ precisaCodigo: true, loginToken }`
  **sem** `accessToken` e **sem** `Set-Cookie` de refresh.
- `loginToken` usado como `Authorization: Bearer` em rota autenticada comum
  (ex. `GET /auth/eu`) é rejeitado com 401 (prova que o escopo separado
  funciona).
- `POST /auth/login/verificar-codigo` com código certo completa a sessão
  (accessToken + cookie), igual ao login sem 2FA.
- Código errado, expirado, ou reenviado antes do cooldown são rejeitados com
  mensagens apropriadas.
- Login de conta **sem** 2FA ativo continua idêntico ao comportamento atual
  (regressão — não pode quebrar o fluxo existente coberto em `auth.test.ts`).

## Fora de escopo (explícito)

- TOTP / apps autenticadores.
- 2FA obrigatório por política (é opcional, por conta).
- 2FA para contas `papel: "usuario"` (só admin, por decisão do usuário).
- Códigos de recuperação (backup codes) — se o e-mail falhar, o único caminho
  é reenviar o código para o mesmo e-mail; não há bypass alternativo.
