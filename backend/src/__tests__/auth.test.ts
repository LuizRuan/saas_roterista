import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { UsuarioModel } from "../models/usuario";

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
});

const contaValida = {
  nome: "Ruan Criador",
  email: "ruan@example.com",
  senha: "senha-forte-123",
};

/** Extrai o cookie de refresh do Set-Cookie da resposta. */
function cookieRefresh(res: request.Response): string | undefined {
  const cookies: string[] = res.get("Set-Cookie") ?? [];
  return cookies.find((c) => c.startsWith("gancho_refresh="));
}

describe("POST /auth/cadastro", () => {
  it("cria conta, devolve usuário público, access token e cookie de refresh", async () => {
    const res = await request(app).post("/auth/cadastro").send(contaValida);

    expect(res.status).toBe(201);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(res.body.usuario).toMatchObject({
      nome: contaValida.nome,
      email: contaValida.email,
      plano: "free",
    });
    // Nunca expor dados sensíveis
    expect(JSON.stringify(res.body)).not.toContain("senhaHash");
    expect(JSON.stringify(res.body)).not.toContain("refreshTokenHash");

    const cookie = cookieRefresh(res);
    expect(cookie).toBeDefined();
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Strict");
  });

  it("rejeita e-mail duplicado com 409", async () => {
    await request(app).post("/auth/cadastro").send(contaValida);
    const res = await request(app)
      .post("/auth/cadastro")
      .send({ ...contaValida, nome: "Outro Nome" });

    expect(res.status).toBe(409);
    expect(res.body.erro).toContain("Já existe");
  });

  it("rejeita dados inválidos com 400 e erros por campo", async () => {
    const res = await request(app)
      .post("/auth/cadastro")
      .send({ nome: "R", email: "nao-e-email", senha: "curta" });

    expect(res.status).toBe(400);
    expect(res.body.campos.nome).toBeDefined();
    expect(res.body.campos.email).toBeDefined();
    expect(res.body.campos.senha).toBeDefined();
  });

  it("não guarda a senha em claro", async () => {
    await request(app).post("/auth/cadastro").send(contaValida);
    const doc = await UsuarioModel.findOne({ email: contaValida.email }).lean();

    expect(doc?.senhaHash).toBeDefined();
    expect(doc?.senhaHash).not.toContain(contaValida.senha);
    expect(doc?.senhaHash).toMatch(/^\$2/); // formato bcrypt
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await request(app).post("/auth/cadastro").send(contaValida);
  });

  it("entra com credenciais corretas", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ email: contaValida.email, senha: contaValida.senha });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");
    expect(cookieRefresh(res)).toBeDefined();
  });

  it("responde igual para senha errada e e-mail inexistente (anti-enumeração)", async () => {
    const senhaErrada = await request(app)
      .post("/auth/login")
      .send({ email: contaValida.email, senha: "senha-errada-999" });
    const emailInexistente = await request(app)
      .post("/auth/login")
      .send({ email: "ninguem@example.com", senha: "qualquer-coisa-1" });

    expect(senhaErrada.status).toBe(401);
    expect(emailInexistente.status).toBe(401);
    expect(senhaErrada.body.erro).toBe(emailInexistente.body.erro);
  });
});

describe("GET /auth/eu", () => {
  it("devolve o usuário logado com access token válido", async () => {
    const cadastro = await request(app).post("/auth/cadastro").send(contaValida);

    const res = await request(app)
      .get("/auth/eu")
      .set("Authorization", `Bearer ${cadastro.body.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.usuario.email).toBe(contaValida.email);
  });

  it("recusa sem token e com token inválido", async () => {
    const semToken = await request(app).get("/auth/eu");
    const tokenRuim = await request(app)
      .get("/auth/eu")
      .set("Authorization", "Bearer token-adulterado");

    expect(semToken.status).toBe(401);
    expect(tokenRuim.status).toBe(401);
  });
});

describe("POST /auth/refresh", () => {
  it("rotaciona o refresh token e devolve novo access token", async () => {
    const cadastro = await request(app).post("/auth/cadastro").send(contaValida);
    const cookieAntigo = cookieRefresh(cadastro)!;

    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieAntigo)
      .set("x-cliente", "gancho-web");

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBeTypeOf("string");

    const cookieNovo = cookieRefresh(res);
    expect(cookieNovo).toBeDefined();
    expect(cookieNovo).not.toBe(cookieAntigo);
  });

  it("exige o cabeçalho x-cliente (anti-CSRF)", async () => {
    const cadastro = await request(app).post("/auth/cadastro").send(contaValida);

    const res = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieRefresh(cadastro)!);

    expect(res.status).toBe(403);
  });

  it("detecta reuso de token rotacionado e revoga a sessão inteira", async () => {
    const cadastro = await request(app).post("/auth/cadastro").send(contaValida);
    const cookieAntigo = cookieRefresh(cadastro)!;

    // Rotação legítima
    const primeira = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieAntigo)
      .set("x-cliente", "gancho-web");
    const cookieNovo = cookieRefresh(primeira)!;

    // Reuso do cookie antigo (cenário de roubo) → 401
    const reuso = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieAntigo)
      .set("x-cliente", "gancho-web");
    expect(reuso.status).toBe(401);

    // A sessão inteira foi revogada: até o cookie mais novo deixa de valer
    const depoisDoReuso = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookieNovo)
      .set("x-cliente", "gancho-web");
    expect(depoisDoReuso.status).toBe(401);
  });

  it("recusa sem cookie", async () => {
    const res = await request(app)
      .post("/auth/refresh")
      .set("x-cliente", "gancho-web");

    expect(res.status).toBe(401);
  });
});

describe("POST /auth/logout", () => {
  it("encerra a sessão: refresh posterior falha", async () => {
    const cadastro = await request(app).post("/auth/cadastro").send(contaValida);
    const cookie = cookieRefresh(cadastro)!;

    const logout = await request(app)
      .post("/auth/logout")
      .set("Cookie", cookie)
      .set("x-cliente", "gancho-web");
    expect(logout.status).toBe(204);

    const refresh = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookie)
      .set("x-cliente", "gancho-web");
    expect(refresh.status).toBe(401);
  });
});
