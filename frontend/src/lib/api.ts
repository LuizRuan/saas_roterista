const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type Usuario = {
  id: string;
  nome: string;
  email: string;
  plano: "free" | "pro";
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

async function requisicao<T>(caminho: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
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
  } catch {
    throw new ErroApi(
      0,
      "Não foi possível falar com o servidor. Confira sua conexão e tente de novo."
    );
  }

  if (res.status === 204) return null as T;

  const corpo = (await res.json().catch(() => null)) as CorpoJson | null;
  if (!res.ok) {
    if (res.status === 401) limparCacheUsuario();
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

/** Tenta restaurar a sessão pelo cookie de refresh. Null = não logado. */
export async function renovarSessao(): Promise<Usuario | null> {
  try {
    const corpo = await requisicao<RespostaSessao>("/auth/refresh", { method: "POST" });
    accessToken = corpo.accessToken;
    definirCacheUsuario(corpo.usuario);
    return corpo.usuario;
  } catch {
    accessToken = null;
    limparCacheUsuario();
    return null;
  }
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
  limiteMensal: number | null;
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
  roteiros: RoteiroSalvo[];
  uso: UsoRoteiros;
}> {
  return requisicao<{ roteiros: RoteiroSalvo[]; uso: UsoRoteiros }>("/roteiros/meus");
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
