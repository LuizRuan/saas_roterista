import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Precisa estar setada ANTES do primeiro import de config/env — com ela
// configurada, a verificação de CAPTCHA passa a ser exigida de verdade.
process.env.TURNSTILE_SECRET_KEY = "chave-secreta-de-teste";

const { default: app } = await import("../app");
const { UsuarioModel } = await import("../models/usuario");

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

afterEach(() => {
  vi.unstubAllGlobals();
});

function mockCloudflare(success: boolean) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ json: async () => ({ success }) }))
  );
}

const contaValida = {
  nome: "Ruan Criador",
  email: "ruan-turnstile@gmail.com",
  senha: "senha-forte-123",
  aceitouTermos: true,
};

describe("CAPTCHA (Turnstile) obrigatório quando configurado", () => {
  it("rejeita cadastro sem turnstileToken", async () => {
    const res = await request(app).post("/auth/cadastro").send(contaValida);
    expect(res.status).toBe(400);
  });

  it("rejeita cadastro quando a Cloudflare reprova o token", async () => {
    mockCloudflare(false);
    const res = await request(app)
      .post("/auth/cadastro")
      .send({ ...contaValida, turnstileToken: "token-suspeito" });
    expect(res.status).toBe(400);
  });

  it("aceita cadastro quando a Cloudflare aprova o token", async () => {
    mockCloudflare(true);
    const res = await request(app)
      .post("/auth/cadastro")
      .send({ ...contaValida, turnstileToken: "token-legitimo" });
    expect(res.status).toBe(201);
  });

  it("rejeita recuperar-senha sem turnstileToken", async () => {
    const res = await request(app)
      .post("/auth/recuperar-senha")
      .send({ email: contaValida.email });
    expect(res.status).toBe(400);
  });

  it("aceita recuperar-senha quando a Cloudflare aprova o token", async () => {
    mockCloudflare(true);
    const res = await request(app)
      .post("/auth/recuperar-senha")
      .send({ email: contaValida.email, turnstileToken: "token-legitimo" });
    expect(res.status).toBe(200);
  });
});
