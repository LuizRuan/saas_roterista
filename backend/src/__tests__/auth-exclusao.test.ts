import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { UsuarioModel } from "../models/usuario";
import { RoteiroModel } from "../models/roteiro";

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
});

const contaValida = {
  nome: "Ruan Criador",
  email: "ruan@gmail.com",
  senha: "senha-forte-123",
  aceitouTermos: true,
};

function cookieRefresh(res: request.Response): string | undefined {
  const cookies: string[] = res.get("Set-Cookie") ?? [];
  return cookies.find((c) => c.startsWith("gancho_refresh="));
}

async function criarConta() {
  const res = await request(app).post("/auth/cadastro").send(contaValida);
  return {
    usuarioId: res.body.usuario.id as string,
    accessToken: res.body.accessToken as string,
    cookie: cookieRefresh(res)!,
  };
}

describe("DELETE /auth/conta", () => {
  it("exige autenticação", async () => {
    const res = await request(app)
      .delete("/auth/conta")
      .set("x-cliente", "gancho-web")
      .send({ senha: contaValida.senha });

    expect(res.status).toBe(401);
  });

  it("exige o cabeçalho x-cliente (anti-CSRF)", async () => {
    const { accessToken } = await criarConta();

    const res = await request(app)
      .delete("/auth/conta")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ senha: contaValida.senha });

    expect(res.status).toBe(403);
  });

  it("com senha errada, recusa e não apaga a conta", async () => {
    const { accessToken } = await criarConta();

    const res = await request(app)
      .delete("/auth/conta")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-cliente", "gancho-web")
      .send({ senha: "senha-totalmente-errada" });

    expect(res.status).toBe(401);
    expect(await UsuarioModel.countDocuments({})).toBe(1);
  });

  it("com senha certa, apaga a conta e os roteiros, e limpa o cookie de sessão", async () => {
    const { usuarioId, accessToken, cookie } = await criarConta();

    await RoteiroModel.create({
      usuarioId,
      tema: "tema de teste",
      formato: "reels-30s",
      tom: "urgente",
      gancho: "g", problema: "p", virada: "v", prova: "pr", cta: "c",
    });
    expect(await RoteiroModel.countDocuments({ usuarioId })).toBe(1);

    const res = await request(app)
      .delete("/auth/conta")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-cliente", "gancho-web")
      .send({ senha: contaValida.senha });

    expect(res.status).toBe(204);
    expect(await UsuarioModel.findById(usuarioId)).toBeNull();
    expect(await RoteiroModel.countDocuments({ usuarioId })).toBe(0);

    // Cookie de refresh foi limpo — sessão morta
    const respostaLimpaCookie = res.get("Set-Cookie") ?? [];
    expect(respostaLimpaCookie.some((c) => c.startsWith("gancho_refresh=;"))).toBe(true);

    // A conta some de verdade — refresh com o cookie antigo já não vale mais
    const refreshDepois = await request(app)
      .post("/auth/refresh")
      .set("Cookie", cookie)
      .set("x-cliente", "gancho-web");
    expect(refreshDepois.status).toBe(401);
  });
});
