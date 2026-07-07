import type { RequestHandler } from "express";
import type { ZodSchema } from "zod";
import mongoose from "mongoose";

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

/**
 * Valida que req.params[nomeParam] é um ObjectId válido antes de chegar ao
 * Mongoose — sem isso, um id malformado vira CastError não tratado (500
 * genérico) em vez de um 400 claro.
 */
export function validarObjectIdParam(nomeParam: string): RequestHandler {
  return (req, res, next) => {
    if (!mongoose.Types.ObjectId.isValid(req.params[nomeParam])) {
      res.status(400).json({ erro: "Identificador inválido." });
      return;
    }
    next();
  };
}
