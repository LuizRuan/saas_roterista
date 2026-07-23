import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";

// Serviço do Mercado Pago mockado — nenhuma chamada real de rede.
const consultarPagamentoMock = vi.fn(async () => ({ status: "approved", valorCentavos: 1990 }));
const validarAssinaturaMock = vi.fn(() => true);

vi.mock("../services/mercadopago", () => ({
  pagamentoConfigurado: () => true,
  criarPagamentoPix: vi.fn(async () => ({
    mpPaymentId: "MP-123",
    copiaECola: "00020126...br.gov.bcb.pix",
    qrCodeBase64: "iVBORw0KGgoAAAANSUhEUg==",
  })),
  consultarPagamento: (...a: unknown[]) => consultarPagamentoMock(...(a as [])),
  validarAssinaturaWebhook: (...a: unknown[]) => validarAssinaturaMock(...(a as [])),
}));

const { default: app } = await import("../app");
const { UsuarioModel, planoProAtivo } = await import("../models/usuario");
const { PagamentoModel } = await import("../models/pagamento");

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
  await PagamentoModel.deleteMany({});
  consultarPagamentoMock.mockClear();
  consultarPagamentoMock.mockResolvedValue({ status: "approved", valorCentavos: 1990 });
  validarAssinaturaMock.mockClear();
  validarAssinaturaMock.mockReturnValue(true);
});

async function criarUsuarioComToken(email = "cliente@gmail.com") {
  const cadastro = await request(app).post("/auth/cadastro").send({
    nome: "Cliente Teste",
    email,
    senha: "senha-forte-123",
    aceitouTermos: true,
  });
  return { accessToken: cadastro.body.accessToken as string, usuarioId: cadastro.body.usuario.id as string };
}

async function criarCobranca(accessToken: string) {
  const res = await request(app)
    .post("/pagamentos/criar-pix")
    .set("Authorization", `Bearer ${accessToken}`)
    .send({});
  return res;
}

function dispararWebhook() {
  return request(app)
    .post("/pagamentos/webhook?type=payment&data.id=MP-123")
    .set("x-signature", "ts=1,v1=abc")
    .set("x-request-id", "req-1")
    .send({ type: "payment", data: { id: "MP-123" } });
}

describe("POST /pagamentos/criar-pix", () => {
  it("cria a cobrança e devolve copia-e-cola + QR", async () => {
    const { accessToken } = await criarUsuarioComToken();
    const res = await criarCobranca(accessToken);

    expect(res.status).toBe(201);
    expect(res.body.copiaECola).toContain("br.gov.bcb.pix");
    expect(res.body.qrCodeBase64).toBeTruthy();
    expect(res.body.valorCentavos).toBe(1990);

    const pag = await PagamentoModel.findOne({ mpPaymentId: "MP-123" });
    expect(pag?.status).toBe("pendente");
  });

  it("exige autenticação (401 sem token)", async () => {
    const res = await request(app).post("/pagamentos/criar-pix").send({});
    expect(res.status).toBe(401);
  });
});

describe("POST /pagamentos/webhook — segurança e idempotência", () => {
  it("rejeita com 401 quando a assinatura é inválida", async () => {
    validarAssinaturaMock.mockReturnValue(false);
    const res = await dispararWebhook();
    expect(res.status).toBe(401);
  });

  it("concede o pro (com expiração ~30 dias) quando aprovado e valor confere", async () => {
    const { accessToken, usuarioId } = await criarUsuarioComToken();
    await criarCobranca(accessToken);

    const res = await dispararWebhook();
    expect(res.status).toBe(200);

    const usuario = await UsuarioModel.findById(usuarioId);
    expect(usuario?.plano).toBe("pro");
    expect(planoProAtivo(usuario)).toBe(true);
    const dias = (usuario!.planoExpiraEm!.getTime() - Date.now()) / (24 * 60 * 60 * 1000);
    expect(dias).toBeGreaterThan(29);
    expect(dias).toBeLessThan(31);

    const pag = await PagamentoModel.findOne({ mpPaymentId: "MP-123" });
    expect(pag?.status).toBe("aprovado");
    expect(pag?.planoConcedido).toBe(true);
  });

  it("é idempotente — webhook duplicado não estende o plano duas vezes", async () => {
    const { accessToken, usuarioId } = await criarUsuarioComToken();
    await criarCobranca(accessToken);

    await dispararWebhook();
    const primeira = (await UsuarioModel.findById(usuarioId))!.planoExpiraEm!.getTime();

    await dispararWebhook();
    const segunda = (await UsuarioModel.findById(usuarioId))!.planoExpiraEm!.getTime();

    expect(segunda).toBe(primeira);
  });

  it("NÃO concede o pro quando o valor pago diverge do esperado", async () => {
    const { accessToken, usuarioId } = await criarUsuarioComToken();
    await criarCobranca(accessToken);

    consultarPagamentoMock.mockResolvedValue({ status: "approved", valorCentavos: 1 });

    const res = await dispararWebhook();
    expect(res.status).toBe(200);

    const usuario = await UsuarioModel.findById(usuarioId);
    expect(usuario?.plano).toBe("free");
    expect(usuario?.planoExpiraEm).toBeNull();
  });
});

describe("GET /pagamentos/status/:id", () => {
  it("o dono vê o status; outro usuário recebe 404 (IDOR)", async () => {
    // Mantém pendente no MP para o status não ser aprovado pelo fallback.
    consultarPagamentoMock.mockResolvedValue({ status: "pending", valorCentavos: 1990 });

    const dono = await criarUsuarioComToken("dono@gmail.com");
    const criar = await criarCobranca(dono.accessToken);
    const pagamentoId = criar.body.pagamentoId as string;

    const doDono = await request(app)
      .get(`/pagamentos/status/${pagamentoId}`)
      .set("Authorization", `Bearer ${dono.accessToken}`);
    expect(doDono.status).toBe(200);
    expect(doDono.body.status).toBe("pendente");

    const intruso = await criarUsuarioComToken("intruso@gmail.com");
    const doIntruso = await request(app)
      .get(`/pagamentos/status/${pagamentoId}`)
      .set("Authorization", `Bearer ${intruso.accessToken}`);
    expect(doIntruso.status).toBe(404);
  });

  it("FALLBACK: confirma o pro pelo polling quando o webhook nunca chegou", async () => {
    const { accessToken, usuarioId } = await criarUsuarioComToken();
    const criar = await criarCobranca(accessToken);
    const pagamentoId = criar.body.pagamentoId as string;

    // Webhook nunca disparado. O MP já aprovou (mock padrão approved/1990).
    const res = await request(app)
      .get(`/pagamentos/status/${pagamentoId}`)
      .set("Authorization", `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("aprovado");

    const usuario = await UsuarioModel.findById(usuarioId);
    expect(planoProAtivo(usuario)).toBe(true);
  });
});

describe("planoProAtivo — validade", () => {
  it("pro com expiração futura é ativo; expirada é tratado como free", () => {
    const futuro = new Date(Date.now() + 60_000);
    const passado = new Date(Date.now() - 60_000);

    expect(planoProAtivo({ plano: "pro", planoExpiraEm: futuro })).toBe(true);
    expect(planoProAtivo({ plano: "pro", planoExpiraEm: passado })).toBe(false);
    expect(planoProAtivo({ plano: "pro", planoExpiraEm: null })).toBe(false);
    expect(planoProAtivo({ plano: "free", planoExpiraEm: futuro })).toBe(false);
  });
});
