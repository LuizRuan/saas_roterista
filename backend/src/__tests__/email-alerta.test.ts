import { describe, expect, it, vi, beforeEach } from "vitest";

const envMock = { ALERTA_EMAIL: "", RESEND_API_KEY: "", CLIENT_URL: "http://localhost:3000" };
vi.mock("../config/env", () => ({ env: envMock }));

const sendMock = vi.fn().mockResolvedValue({ data: {}, error: null });
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: sendMock };
  },
}));

const { enviarAlertaErro } = await import("../services/email");

beforeEach(() => {
  envMock.ALERTA_EMAIL = "";
  envMock.RESEND_API_KEY = "";
  sendMock.mockClear();
});

describe("enviarAlertaErro", () => {
  it("sem ALERTA_EMAIL configurado, não envia nada (padrão desligado)", async () => {
    envMock.RESEND_API_KEY = "chave-resend";

    await enviarAlertaErro("algo quebrou", { motivo: "teste" });

    expect(sendMock).not.toHaveBeenCalled();
  });

  it("com ALERTA_EMAIL e RESEND_API_KEY configurados, envia o alerta", async () => {
    envMock.ALERTA_EMAIL = "dev@exemplo.com";
    envMock.RESEND_API_KEY = "chave-resend";

    await enviarAlertaErro("algo quebrou", { motivo: "teste" });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const chamada = sendMock.mock.calls[0][0];
    expect(chamada.to).toBe("dev@exemplo.com");
    expect(chamada.subject).toContain("algo quebrou");
    expect(chamada.html).toContain("teste");
  });

  it("escapa HTML nos detalhes (evita quebrar o e-mail com conteúdo malformado)", async () => {
    envMock.ALERTA_EMAIL = "dev@exemplo.com";
    envMock.RESEND_API_KEY = "chave-resend";

    await enviarAlertaErro("erro", { erro: "<script>alert(1)</script>" });

    const chamada = sendMock.mock.calls[0][0];
    expect(chamada.html).not.toContain("<script>");
    expect(chamada.html).toContain("&lt;script&gt;");
  });
});
