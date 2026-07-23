import { describe, expect, it } from "vitest";
import { escaparHtml } from "../services/email";

describe("escaparHtml — defesa em profundidade no template do e-mail", () => {
  it("neutraliza tags e atributos injetados", () => {
    const malicioso = `<img src=x onerror="alert(1)">`;
    const seguro = escaparHtml(malicioso);

    expect(seguro).not.toContain("<img");
    expect(seguro).not.toContain('onerror="');
    expect(seguro).toContain("&lt;img");
  });

  it("escapa os 5 caracteres perigosos", () => {
    expect(escaparHtml(`& < > " '`)).toBe("&amp; &lt; &gt; &quot; &#39;");
  });

  it("não altera um nome comum", () => {
    expect(escaparHtml("Ruan")).toBe("Ruan");
  });
});
