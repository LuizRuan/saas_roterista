const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  plano: "free" | "pro";
  /** Quando o plano pro expira (ISO). null quando free/expirado. */
  planoExpiraEm: string | null;
  papel: "usuario" | "admin";
  criadoEm: string;
};

/**
 * O access token vive só na memória (nunca em localStorage — XSS não alcança).
 * Quem mantém a sessão entre visitas é o cookie httpOnly de refresh, que o
 * navegador envia sozinho para a API.
 */
let accessToken: string | null = null;

/**
 * Cache curto do usuário logado — evita bater em /auth/eu a cada troca de tela.
 * TTL curto para não deixar dados como plano/nome desatualizados por muito tempo.
 */
let usuarioCache: Usuario | null = null;
let usuarioCacheTimestamp: number | null = null;
const TTL_CACHE_USUARIO_MS = 45_000;

function definirCacheUsuario(usuario: Usuario): void {
  usuarioCache = usuario;
  usuarioCacheTimestamp = Date.now();
}

function limparCacheUsuario(): void {
  usuarioCache = null;
  usuarioCacheTimestamp = null;
}

function cacheUsuarioValido(): boolean {
  return (
    usuarioCache !== null &&
    usuarioCacheTimestamp !== null &&
    Date.now() - usuarioCacheTimestamp < TTL_CACHE_USUARIO_MS
  );
}

export class ErroApi extends Error {
  status: number;
  campos?: Record<string, string[]>;

  constructor(status: number, mensagem: string, campos?: Record<string, string[]>) {
    super(mensagem);
    this.status = status;
    this.campos = campos;
  }
}

type CorpoJson = Record<string, unknown>;

const espera = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function requisicao<T>(
  caminho: string,
  init: RequestInit = {},
  tentandoNovamente = false
): Promise<T> {
  // Erro de rede tem retry próprio: o backend no Render free "dorme" e a
  // primeira conexão pode cair enquanto ele sobe. Tentamos algumas vezes com
  // backoff antes de desistir (as telas mostram "acordando o estúdio" nesse meio-tempo).
  let res: Response | null = null;
  const MAX_REDE = 3;
  for (let tentativaRede = 1; tentativaRede <= MAX_REDE; tentativaRede++) {
    try {
      res = await fetch(`${API_URL}${caminho}`, {
        ...init,
        credentials: "include", // envia/recebe o cookie httpOnly de refresh
        headers: {
          "Content-Type": "application/json",
          "x-cliente": "gancho-web", // exigido pela API nas rotas de sessão (anti-CSRF)
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          ...init.headers,
        },
      });
      break;
    } catch {
      if (tentativaRede === MAX_REDE) {
        throw new ErroApi(
          0,
          "Não foi possível falar com o servidor. Confira sua conexão e tente de novo."
        );
      }
      await espera(tentativaRede * 1500);
    }
  }
  res = res!;

  if (res.status === 204) return null as T;

  const corpo = (await res.json().catch(() => null)) as CorpoJson | null;
  if (!res.ok) {
    if (res.status === 401) {
      limparCacheUsuario();
      // O access token vive só em memória: um reload de página o perde, e uma
      // chamada autenticada pode sair antes da renovação (via cookie) terminar.
      // Renova e refaz a chamada uma vez antes de desistir — evita deslogar o
      // usuário por causa dessa corrida. Rotas de /auth/* ficam de fora (login
      // errado ou refresh inválido não devem re-tentar; evita recursão).
      if (!tentandoNovamente && !caminho.startsWith("/auth/")) {
        const usuario = await renovarSessao();
        if (usuario) return requisicao<T>(caminho, init, true);
      }
    }
    throw new ErroApi(
      res.status,
      typeof corpo?.erro === "string" ? corpo.erro : "Erro inesperado. Tente novamente.",
      corpo?.campos as Record<string, string[]> | undefined
    );
  }
  return corpo as T;
}

type RespostaSessao = { usuario: Usuario; accessToken: string };

export async function cadastrar(dados: {
  nome: string;
  email: string;
  senha: string;
  aceitouTermos: boolean;
  turnstileToken: string;
}): Promise<Usuario> {
  limparCacheUsuario();
  const corpo = await requisicao<RespostaSessao>("/auth/cadastro", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  accessToken = corpo.accessToken;
  definirCacheUsuario(corpo.usuario);
  return corpo.usuario;
}

export async function entrar(dados: { email: string; senha: string }): Promise<Usuario> {
  limparCacheUsuario();
  const corpo = await requisicao<RespostaSessao>("/auth/login", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  accessToken = corpo.accessToken;
  definirCacheUsuario(corpo.usuario);
  return corpo.usuario;
}

export async function sair(): Promise<void> {
  try {
    await requisicao<null>("/auth/logout", { method: "POST" });
  } finally {
    accessToken = null;
    limparCacheUsuario();
  }
}

/**
 * Exclusão definitiva da conta — exige a senha atual. Erro 401 = senha incorreta.
 * Só limpa a sessão local em caso de sucesso — em caso de senha errada, o
 * usuário continua autenticado e pode tentar de novo (limpar sempre, mesmo na
 * falha, derrubaria o access token e a próxima tentativa cairia como "não
 * autenticado", já que /auth/* fica de fora do retry automático de token).
 */
export async function excluirConta(senha: string): Promise<void> {
  await requisicao<null>("/auth/conta", {
    method: "DELETE",
    body: JSON.stringify({ senha }),
  });
  accessToken = null;
  limparCacheUsuario();
}

/** Edita o perfil (nome) da conta logada. */
export async function editarPerfil(nome: string): Promise<Usuario> {
  const corpo = await requisicao<{ usuario: Usuario }>("/auth/eu", {
    method: "PATCH",
    body: JSON.stringify({ nome }),
  });
  limparCacheUsuario();
  return corpo.usuario;
}

/** Troca a senha estando logado. Revoga a sessão — precisa logar de novo. */
export async function trocarSenha(senhaAtual: string, novaSenha: string): Promise<{ mensagem: string }> {
  const corpo = await requisicao<{ mensagem: string }>("/auth/trocar-senha", {
    method: "POST",
    body: JSON.stringify({ senhaAtual, novaSenha }),
  });
  accessToken = null; // sessão revogada no servidor
  limparCacheUsuario();
  return corpo;
}

/**
 * Renovação em andamento, compartilhada entre chamadores concorrentes.
 *
 * Sem isso, duas chamadas autenticadas disparadas em paralelo (ex.: reload de
 * página) poderiam cada uma tentar renovar a sessão com o mesmo cookie — e o
 * backend revoga a sessão inteira ao detectar reuso de um refresh token já
 * rotacionado. Deduplicar garante que só um POST /auth/refresh saia por vez.
 */
let refrescandoPromise: Promise<Usuario | null> | null = null;

/** Tenta restaurar a sessão pelo cookie de refresh. Null = não logado. */
export async function renovarSessao(): Promise<Usuario | null> {
  if (refrescandoPromise) return refrescandoPromise;

  refrescandoPromise = (async () => {
    try {
      const corpo = await requisicao<RespostaSessao>("/auth/refresh", { method: "POST" });
      accessToken = corpo.accessToken;
      definirCacheUsuario(corpo.usuario);
      return corpo.usuario;
    } catch {
      accessToken = null;
      limparCacheUsuario();
      return null;
    } finally {
      refrescandoPromise = null;
    }
  })();

  return refrescandoPromise;
}

/**
 * Usuário logado atual — renova a sessão automaticamente se o access expirou.
 * Usa um cache curto (TTL_CACHE_USUARIO_MS) para evitar bater em /auth/eu a
 * cada troca de tela; o cache nunca sobrevive a logout, 401 ou refresh inválido.
 */
export async function usuarioAtual(): Promise<Usuario | null> {
  if (accessToken && cacheUsuarioValido()) return usuarioCache;

  if (!accessToken) return renovarSessao();

  try {
    const corpo = await requisicao<{ usuario: Usuario }>("/auth/eu");
    definirCacheUsuario(corpo.usuario);
    return corpo.usuario;
  } catch (erro) {
    if (erro instanceof ErroApi && erro.status === 401) return renovarSessao();
    limparCacheUsuario();
    throw erro;
  }
}

// ─── Admin ───────────────────────────────────────────────────────────────────

export type PadraoViral = {
  id: string;
  titulo: string;
  formato: string;
  tom: string;
  gancho: string;
  problema: string;
  virada: string;
  prova: string;
  cta: string;
  ativo: boolean;
  criadoEm: string;
};

export type PadraoViralInput = {
  titulo: string;
  formato: string;
  tom: string;
  gancho: string;
  problema: string;
  virada: string;
  prova: string;
  cta: string;
  ativo?: boolean;
};

export async function listarPadroes(): Promise<PadraoViral[]> {
  const corpo = await requisicao<{ padroes: PadraoViral[] }>("/admin/padroes");
  return corpo.padroes;
}

export async function criarPadrao(dados: PadraoViralInput): Promise<PadraoViral> {
  const corpo = await requisicao<{ padrao: PadraoViral }>("/admin/padroes", {
    method: "POST",
    body: JSON.stringify(dados),
  });
  return corpo.padrao;
}

export async function atualizarPadrao(
  id: string,
  dados: Partial<PadraoViralInput>
): Promise<PadraoViral> {
  const corpo = await requisicao<{ padrao: PadraoViral }>(`/admin/padroes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(dados),
  });
  return corpo.padrao;
}

export async function deletarPadrao(id: string): Promise<void> {
  await requisicao<null>(`/admin/padroes/${id}`, { method: "DELETE" });
}

// ─── Geração de roteiros ─────────────────────────────────────────────────────

export type NotasAvaliacao = {
  gancho: number;
  retencao: number;
  cta: number;
  clareza: number;
  adequacao: number;
};

export type RoteiroIA = {
  gancho: string;
  problema: string;
  virada: string;
  prova: string;
  cta: string;
};

export type AvaliacaoIA = {
  notas: NotasAvaliacao;
  notaFinal: number;
  aprovado: boolean;
  tentativas: number;
};

export type UsoRoteiros = {
  usadosNoMes: number;
  limiteMensal: number;
};

export type RoteiroSalvo = {
  id: string;
  tema: string;
  formato: string;
  tom: string;
  publico: string;
  palavraChave: string;
  gancho: string;
  problema: string;
  virada: string;
  prova: string;
  cta: string;
  notas: NotasAvaliacao;
  notaFinal: number;
  aprovado: boolean;
  tentativas: number;
  criadoEm: string;
};

export type ResultadoGeracao = {
  roteiro: RoteiroSalvo;
  avaliacao: AvaliacaoIA;
  uso: UsoRoteiros;
};

/**
 * Item da listagem (GET /roteiros/meus) — a API devolve só campos leves aqui
 * (sem gancho/problema/virada/prova/cta, ver backend/src/routes/roteiros.ts).
 * Use buscarRoteiro() para pegar o texto completo de um item específico.
 */
export type RoteiroResumo = {
  id: string;
  tema: string;
  formato: string;
  tom: string;
  notas: NotasAvaliacao;
  notaFinal: number;
  aprovado: boolean;
  tentativas: number;
  criadoEm: string;
};

export async function gerarRoteiro(dados: {
  tema: string;
  formato: string;
  tom: string;
  publico: string;
  palavraChave: string;
}): Promise<ResultadoGeracao> {
  return requisicao<ResultadoGeracao>("/roteiros/gerar", {
    method: "POST",
    body: JSON.stringify(dados),
  });
}

export async function listarMeusRoteiros(): Promise<{
  roteiros: RoteiroResumo[];
  uso: UsoRoteiros;
}> {
  return requisicao<{ roteiros: RoteiroResumo[]; uso: UsoRoteiros }>("/roteiros/meus");
}

export async function buscarRoteiro(id: string): Promise<{ roteiro: RoteiroSalvo }> {
  return requisicao<{ roteiro: RoteiroSalvo }>(`/roteiros/${id}`);
}

export async function deletarMeuRoteiro(id: string): Promise<void> {
  await requisicao<null>(`/roteiros/${id}`, { method: "DELETE" });
}

// ─── Recuperação de senha ────────────────────────────────────────────────────

export async function recuperarSenha(
  email: string,
  turnstileToken: string
): Promise<{ mensagem: string }> {
  return requisicao<{ mensagem: string }>("/auth/recuperar-senha", {
    method: "POST",
    body: JSON.stringify({ email, turnstileToken }),
  });
}

export async function resetarSenha(token: string, novaSenha: string): Promise<{ mensagem: string }> {
  return requisicao<{ mensagem: string }>("/auth/resetar-senha", {
    method: "POST",
    body: JSON.stringify({ token, novaSenha }),
  });
}

// ─── Pagamento Pix (plano pro — Mercado Pago) ────────────────────────────────

export type CobrancaPix = {
  pagamentoId: string;
  copiaECola: string;
  qrCodeBase64: string;
  valorCentavos: number;
  expiraEm: string;
};

export type StatusPagamento = "pendente" | "aprovado" | "expirado" | "cancelado";

/** Preço atual do plano pro em centavos (fonte única no backend). */
export async function precoPlanoPro(): Promise<number> {
  const corpo = await requisicao<{ valorCentavos: number }>("/pagamentos/preco");
  return corpo.valorCentavos;
}

/** Cria a cobrança Pix do plano pro e devolve o QR + copia-e-cola. */
export async function criarPagamentoPix(): Promise<CobrancaPix> {
  return requisicao<CobrancaPix>("/pagamentos/criar-pix", { method: "POST", body: "{}" });
}

/** Consulta o status de um pagamento — usado no polling da tela de planos. */
export async function statusPagamento(pagamentoId: string): Promise<StatusPagamento> {
  const corpo = await requisicao<{ status: StatusPagamento }>(`/pagamentos/status/${pagamentoId}`);
  return corpo.status;
}
