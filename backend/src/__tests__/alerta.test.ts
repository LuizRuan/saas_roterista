import { describe, expect, it, vi } from "vitest";

const enviarAlertaErroMock = vi.fn().mockResolvedValue(undefined);
vi.mock("../services/email", () => ({
  enviarAlertaErro: (...args: unknown[]) => enviarAlertaErroMock(...args),
}));

const { notificarErroCritico } = await import("../services/alerta");

describe("notificarErroCritico", () => {
  it("chama enviarAlertaErro com a mensagem e os detalhes, e rate-limita chamadas seguidas", async () => {
    notificarErroCritico("algo quebrou", { motivo: "teste" });
    await vi.waitFor(() => expect(enviarAlertaErroMock).toHaveBeenCalledTimes(1));
    expect(enviarAlertaErroMock).toHaveBeenCalledWith("algo quebrou", { motivo: "teste" });

    // Uma segunda chamada logo em seguida (mesmo incidente em loop) não deve
    // disparar um segundo e-mail — evita lotar a caixa de entrada.
    notificarErroCritico("erro 2, ainda dentro da janela de rate-limit");
    await new Promise((r) => setTimeout(r, 10));
    expect(enviarAlertaErroMock).toHaveBeenCalledTimes(1);
  });
});
