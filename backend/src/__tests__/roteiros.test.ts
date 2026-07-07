import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Chave falsa só para passar da checagem `env.GROQ_API_KEY` — a IA de verdade
// nunca é chamada porque o pipeline é mockado abaixo.
process.env.GROQ_API_KEY = "chave-de-teste";

const roteiroFake = {
  gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c",
};
const avaliacaoFake = {
  notas: { gancho: 8, retencao: 8, cta: 8, clareza: 8, adequacao: 8 },
  notaFinal: 8,
  aprovado: true,
};

const executarPipelineMock = vi.fn(async () => ({
  roteiro: roteiroFake,
  avaliacao: avaliacaoFake,
  tentativas: 1,
}));

vi.mock("../services/ia/pipeline", () => ({
  executarPipeline: (...args: unknown[]) => executarPipelineMock(...args),
}));
vi.mock("../services/cache-padroes", () => ({
  getPadroesAtivos: vi.fn(async () => []),
}));

const { default: app } = await import("../app");
const { UsuarioModel } = await import("../models/usuario");
const { RoteiroModel } = await import("../models/roteiro");
const { gerarAccessToken } = await import("../services/tokens");

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

beforeEach(async () => {
  await UsuarioModel.deleteMany({});
  await RoteiroModel.deleteMany({});
  executarPipelineMock.mockClear();
  executarPipelineMock.mockResolvedValue({
    roteiro: roteiroFake,
    avaliacao: avaliacaoFake,
    tentativas: 1,
  });
});

async function criarUsuarioComToken() {
  const cadastro = await request(app).post("/auth/cadastro").send({
    nome: "Usuário Free",
    email: "free@gmail.com",
    senha: "senha-forte-123",
    aceitouTermos: true,
  });
  return { accessToken: cadastro.body.accessToken as string, usuarioId: cadastro.body.usuario.id as string };
}

/** Cria uma conta com plano "pro" direto no banco — hoje não existe fluxo de upgrade real. */
async function criarUsuarioProComToken() {
  const usuario = await UsuarioModel.create({
    nome: "Usuário Pro",
    email: "pro@gmail.com",
    senhaHash: "hash-nao-usado-neste-teste",
    plano: "pro",
  });
  return {
    accessToken: gerarAccessToken(usuario._id.toString(), "usuario"),
    usuarioId: usuario._id.toString(),
  };
}

const corpoGerar = {
  tema: "Tema de teste com tamanho suficiente",
  formato: "reels-30s",
  tom: "urgente",
  publico: "",
  palavraChave: "",
};

describe("POST /roteiros/gerar — limite diário do plano free", () => {
  it("nunca deixa passar de 3 gerações no dia mesmo com requisições concorrentes", async () => {
    const { accessToken } = await criarUsuarioComToken();

    const respostas = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post("/roteiros/gerar")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(corpoGerar)
      )
    );

    const sucesso = respostas.filter((r) => r.status === 200);
    const bloqueadas = respostas.filter((r) => r.status === 429);

    expect(sucesso).toHaveLength(3);
    expect(bloqueadas).toHaveLength(2);

    const totalNoBanco = await RoteiroModel.countDocuments({});
    expect(totalNoBanco).toBe(3);
  });

  it("libera a vaga quando a geração falha, permitindo tentar de novo", async () => {
    const { accessToken } = await criarUsuarioComToken();

    executarPipelineMock.mockRejectedValueOnce(new Error("IA falhou"));

    const falhou = await request(app)
      .post("/roteiros/gerar")
      .set("Authorization", `Bearer ${accessToken}`)
      .send(corpoGerar);
    expect(falhou.status).toBe(500);

    // As 3 tentativas seguintes devem ser aceitas normalmente —
    // a tentativa que falhou não deve ter consumido uma vaga do limite diário.
    const respostas = await Promise.all(
      Array.from({ length: 3 }, () =>
        request(app)
          .post("/roteiros/gerar")
          .set("Authorization", `Bearer ${accessToken}`)
          .send(corpoGerar)
      )
    );

    expect(respostas.every((r) => r.status === 200)).toBe(true);
  });
});

describe("GET/DELETE /roteiros/:id — id malformado", () => {
  it("devolve 400 (não 500) para um :id que não é um ObjectId válido", async () => {
    const { accessToken } = await criarUsuarioComToken();

    const get = await request(app)
      .get("/roteiros/isso-nao-e-um-id")
      .set("Authorization", `Bearer ${accessToken}`);
    const del = await request(app)
      .delete("/roteiros/isso-nao-e-um-id")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(get.status).toBe(400);
    expect(del.status).toBe(400);
  });

  it("devolve 404 para um ObjectId válido mas inexistente", async () => {
    const { accessToken } = await criarUsuarioComToken();

    const res = await request(app)
      .get("/roteiros/507f1f77bcf86cd799439011")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });
});

describe("IDOR — um usuário não pode acessar roteiro de outro", () => {
  it("GET e DELETE /roteiros/:id de outro usuário devolvem 404 (não vazam nem apagam)", async () => {
    const dono = await criarUsuarioComToken();

    const gerado = await request(app)
      .post("/roteiros/gerar")
      .set("Authorization", `Bearer ${dono.accessToken}`)
      .send(corpoGerar);
    const idDoRoteiro = gerado.body.roteiro.id as string;

    const cadastroIntruso = await request(app).post("/auth/cadastro").send({
      nome: "Usuário Intruso",
      email: "intruso@gmail.com",
      senha: "senha-forte-123",
      aceitouTermos: true,
    });
    const tokenIntruso = cadastroIntruso.body.accessToken as string;

    const leitura = await request(app)
      .get(`/roteiros/${idDoRoteiro}`)
      .set("Authorization", `Bearer ${tokenIntruso}`);
    const remocao = await request(app)
      .delete(`/roteiros/${idDoRoteiro}`)
      .set("Authorization", `Bearer ${tokenIntruso}`);

    expect(leitura.status).toBe(404);
    expect(remocao.status).toBe(404);

    // O roteiro do dono continua intacto — não foi removido pelo intruso.
    const aindaExiste = await RoteiroModel.findById(idDoRoteiro);
    expect(aindaExiste).not.toBeNull();
  });
});

describe("Plano pro — sem limite diário de geração", () => {
  it("gera mais de 3 roteiros no dia sem ser bloqueado, e a resposta traz limiteDiario: null", async () => {
    const { accessToken } = await criarUsuarioProComToken();

    for (let i = 0; i < 5; i++) {
      const res = await request(app)
        .post("/roteiros/gerar")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(corpoGerar);

      expect(res.status).toBe(200);
      expect(res.body.uso.limiteDiario).toBeNull();
    }
  });

  it("GET /roteiros/meus devolve limiteDiario: null para quem já gerou mais de 3 no dia", async () => {
    const { accessToken } = await criarUsuarioProComToken();

    for (let i = 0; i < 4; i++) {
      await request(app)
        .post("/roteiros/gerar")
        .set("Authorization", `Bearer ${accessToken}`)
        .send(corpoGerar);
    }

    const res = await request(app)
      .get("/roteiros/meus")
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.uso.limiteDiario).toBeNull();
    expect(res.body.uso.usadosHoje).toBe(4);
  });
});
