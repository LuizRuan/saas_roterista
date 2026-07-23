import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { UsuarioModel } from "../models/usuario";
import { RoteiroModel } from "../models/roteiro";
import { PagamentoModel } from "../models/pagamento";

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
  await PagamentoModel.deleteMany({});
});

async function criarUsuario() {
  const cadastro = await request(app).post("/auth/cadastro").send({
    nome: "Fulano de Tal",
    email: "fulano@gmail.com",
    senha: "senha-forte-123",
    aceitouTermos: true,
  });
  return { accessToken: cadastro.body.accessToken as string, usuarioId: cadastro.body.usuario.id as string };
}

describe("PATCH /auth/eu — editar perfil", () => {
  it("atualiza o nome", async () => {
    const { accessToken } = await criarUsuario();
    const res = await request(app)
      .patch("/auth/eu")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "Fulano Editado" });

    expect(res.status).toBe(200);
    expect(res.body.usuario.nome).toBe("Fulano Editado");
  });

  it("rejeita nome com caracteres inválidos (400)", async () => {
    const { accessToken } = await criarUsuario();
    const res = await request(app)
      .patch("/auth/eu")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ nome: "<script>" });
    expect(res.status).toBe(400);
  });
});

describe("POST /auth/trocar-senha", () => {
  it("recusa com 401 quando a senha atual está errada", async () => {
    const { accessToken } = await criarUsuario();
    const res = await request(app)
      .post("/auth/trocar-senha")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ senhaAtual: "errada-123", novaSenha: "nova-senha-456" });
    expect(res.status).toBe(401);
  });

  it("troca a senha e passa a aceitar só a nova no login", async () => {
    const { accessToken } = await criarUsuario();
    const troca = await request(app)
      .post("/auth/trocar-senha")
      .set("Authorization", `Bearer ${accessToken}`)
      .send({ senhaAtual: "senha-forte-123", novaSenha: "nova-senha-456" });
    expect(troca.status).toBe(200);

    const loginAntigo = await request(app).post("/auth/login").send({
      email: "fulano@gmail.com",
      senha: "senha-forte-123",
    });
    expect(loginAntigo.status).toBe(401);

    const loginNovo = await request(app).post("/auth/login").send({
      email: "fulano@gmail.com",
      senha: "nova-senha-456",
    });
    expect(loginNovo.status).toBe(200);
  });
});

describe("DELETE /auth/conta — exclusão de conta (LGPD)", () => {
  it("exige o header anti-CSRF x-cliente (403 sem ele)", async () => {
    const { accessToken } = await criarUsuario();
    const res = await request(app).delete("/auth/conta").set("Authorization", `Bearer ${accessToken}`);
    expect(res.status).toBe(403);
  });

  it("recusa com senha incorreta (401)", async () => {
    const { accessToken } = await criarUsuario();
    const res = await request(app)
      .delete("/auth/conta")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-cliente", "gancho-web")
      .send({ senha: "errada-999" });
    expect(res.status).toBe(401);
  });

  it("apaga a conta, os roteiros e os pagamentos do usuário", async () => {
    const { accessToken, usuarioId } = await criarUsuario();

    await RoteiroModel.create({
      usuarioId, tema: "tema teste", formato: "reels-30s", tom: "urgente",
      gancho: "g".repeat(20), problema: "p".repeat(20), virada: "v".repeat(20),
      prova: "pr".repeat(20), cta: "c".repeat(20),
    });
    await PagamentoModel.create({
      usuarioId, mpPaymentId: "MP-DEL", valorCentavos: 1990,
      expiraEm: new Date(Date.now() + 60000),
    });

    const res = await request(app)
      .delete("/auth/conta")
      .set("Authorization", `Bearer ${accessToken}`)
      .set("x-cliente", "gancho-web")
      .send({ senha: "senha-forte-123" });
    expect(res.status).toBe(204);

    expect(await UsuarioModel.countDocuments({ _id: usuarioId })).toBe(0);
    expect(await RoteiroModel.countDocuments({ usuarioId })).toBe(0);
    expect(await PagamentoModel.countDocuments({ usuarioId })).toBe(0);
  });
});
