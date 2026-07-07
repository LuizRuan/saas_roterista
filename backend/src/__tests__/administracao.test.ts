import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { UsuarioModel } from "../models/usuario";
import { promoverAdmin } from "../services/administracao";

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

describe("promoverAdmin", () => {
  it("promove o usuário a admin e revoga a sessão ativa (refreshTokenHash)", async () => {
    const usuario = await UsuarioModel.create({
      nome: "Futuro Admin",
      email: "futuro-admin@gmail.com",
      senhaHash: "hash-qualquer",
      refreshTokenHash: "sessao-ativa-antes-da-promocao",
    });

    const promovido = await promoverAdmin("futuro-admin@gmail.com");

    expect(promovido).toBe(true);
    const atualizado = await UsuarioModel.findById(usuario._id);
    expect(atualizado?.papel).toBe("admin");
    expect(atualizado?.refreshTokenHash).toBeNull();
  });

  it("retorna false quando não existe conta com o e-mail informado", async () => {
    const promovido = await promoverAdmin("ninguem@gmail.com");
    expect(promovido).toBe(false);
  });
});
