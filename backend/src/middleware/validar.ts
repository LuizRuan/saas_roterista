import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";

/** Valida req.body com um schema Zod; responde 400 com os erros por campo. */
export function validarBody(schema: ZodSchema): RequestHandler {
  return (req, res, next) => {
    const resultado = schema.safeParse(req.body);
    if (!resultado.success) {
      res.status(400).json({
        erro: "Dados inválidos.",
        campos: resultado.error.flatten().fieldErrors,
      });
      return;
    }
    req.body = resultado.data;
    next();
  };
}
