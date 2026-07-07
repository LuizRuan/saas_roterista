import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Os limitadores de auth.ts pulam a checagem quando NODE_ENV === "test"
// (vitest.config.ts força isso globalmente). Para testar o limite de
// verdade, este arquivo isolado sobrescreve para "development" ANTES do
// primeiro import de config/env — precisa ficar num arquivo próprio para
// não interferir na contagem (por IP) dos outros testes de auth.
process.env.NODE_ENV = "development";

const { default: app } = await import("../app");

let mongo: MongoMemoryServer;

beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri());
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

describe("Rate limit global por IP em /auth (20 req / 15 min)", () => {
  it("bloqueia com 429 a partir da 21ª requisição", async () => {
    const respostas: number[] = [];
    for (let i = 0; i < 21; i++) {
      // E-mail diferente a cada request — isola do limite por e-mail (5/30min),
      // testando só o limite global por IP (20/15min).
      const res = await request(app)
        .post("/auth/login")
        .send({ email: `usuario${i}@gmail.com`, senha: "senha-qualquer-1" });
      respostas.push(res.status);
    }

    // As primeiras 20 passam pelo limitador (401 — credenciais inválidas).
    expect(respostas.slice(0, 20).every((s) => s === 401)).toBe(true);
    // A 21ª é bloqueada pelo rate limit, não pela checagem de credenciais.
    expect(respostas[20]).toBe(429);
  }, 20_000);
});
