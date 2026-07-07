import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Ver comentário em rate-limit-ip.test.ts — precisa de arquivo isolado com
// NODE_ENV != "test" para o rate limit de verdade entrar em ação.
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

describe("Rate limit por e-mail em /auth/login (5 req / 30 min)", () => {
  it("bloqueia com 429 a partir da 6ª tentativa para o mesmo e-mail", async () => {
    const email = "alvo-de-brute-force@gmail.com";
    const respostas: number[] = [];

    for (let i = 0; i < 6; i++) {
      const res = await request(app)
        .post("/auth/login")
        .send({ email, senha: `senha-errada-${i}` });
      respostas.push(res.status);
    }

    expect(respostas.slice(0, 5).every((s) => s === 401)).toBe(true);
    expect(respostas[5]).toBe(429);
  }, 20_000);
});
