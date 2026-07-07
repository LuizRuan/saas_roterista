import jwt from "jsonwebtoken";
import { describe, expect, it } from "vitest";
import { env } from "../config/env";
import { verificarAccessToken } from "../services/tokens";

describe("verificarAccessToken — algoritmo travado", () => {
  it("rejeita um token assinado com HS384 usando o mesmo segredo (algorithm confusion)", () => {
    const tokenComOutroAlgoritmo = jwt.sign(
      { sub: "usuario-forjado", papel: "admin" },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS384", expiresIn: "15m" }
    );

    expect(verificarAccessToken(tokenComOutroAlgoritmo)).toBeNull();
  });

  it("continua aceitando um token HS256 normal", () => {
    const tokenNormal = jwt.sign(
      { sub: "usuario-normal", papel: "usuario" },
      env.JWT_ACCESS_SECRET,
      { algorithm: "HS256", expiresIn: "15m" }
    );

    expect(verificarAccessToken(tokenNormal)).toMatchObject({
      sub: "usuario-normal",
      papel: "usuario",
    });
  });
});
