import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../app";
import { UsuarioModel } from "../models/usuario";
import { PadraoViralModel } from "../models/padraoViral";
import { gerarAccessToken } from "../services/tokens";

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
  await PadraoViralModel.deleteMany({});
});

async function criarUsuarioComum() {
  const cadastro = await request(app).post("/auth/cadastro").send({
    nome: "Usuário Comum",
    email: "comum@gmail.com",
    senha: "senha-forte-123",
    aceitouTermos: true,
  });
  return cadastro.body.accessToken as string;
}

async function criarAdminComToken() {
  const usuario = await UsuarioModel.create({
    nome: "Admin",
    email: "admin@gmail.com",
    senhaHash: "hash-nao-usado-neste-teste",
    papel: "admin",
  });
  return gerarAccessToken(usuario._id.toString(), "admin");
}

const padraoValido = {
  titulo: "Padrão de teste",
  formato: "reels-30s",
  tom: "urgente",
  gancho: "Um gancho de teste com mais de dez caracteres",
  problema: "Um problema de teste com mais de dez caracteres",
  virada: "Uma virada de teste com mais de dez caracteres",
  prova: "Uma prova de teste com mais de dez caracteres",
  cta: "Um CTA de teste",
};

describe("Controle de acesso em /admin/padroes", () => {
  it("bloqueia usuário comum com 403 em todas as rotas de padrões", async () => {
    const token = await criarUsuarioComum();

    const listar = await request(app).get("/admin/padroes").set("Authorization", `Bearer ${token}`);
    const criar = await request(app)
      .post("/admin/padroes")
      .set("Authorization", `Bearer ${token}`)
      .send(padraoValido);

    expect(listar.status).toBe(403);
    expect(criar.status).toBe(403);
  });

  it("bloqueia requisição sem token com 401", async () => {
    const res = await request(app).get("/admin/padroes");
    expect(res.status).toBe(401);
  });

  it("permite admin criar, listar, editar e remover um padrão", async () => {
    const token = await criarAdminComToken();

    const criar = await request(app)
      .post("/admin/padroes")
      .set("Authorization", `Bearer ${token}`)
      .send(padraoValido);
    expect(criar.status).toBe(201);

    const id = criar.body.padrao.id as string;

    const editar = await request(app)
      .patch(`/admin/padroes/${id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ titulo: "Título atualizado" });
    expect(editar.status).toBe(200);
    expect(editar.body.padrao.titulo).toBe("Título atualizado");

    const remover = await request(app)
      .delete(`/admin/padroes/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(remover.status).toBe(204);
  });
});
