import crypto from "node:crypto";
import express from "express";
import compression from "compression";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";
import { adminRouter } from "./routes/admin";
import { roteirosRouter } from "./routes/roteiros";
import { pagamentosRouter } from "./routes/pagamentos";
import { logger } from "./lib/logger";
import { notificarErroCritico } from "./services/alerta";

const app = express();

// Atrás do proxy do Render, garante o IP real no rate limit e cookies Secure.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

// SEC-18: X-Request-ID — correlaciona logs de um mesmo request para investigação
app.use((_req, res, next) => {
  const id = crypto.randomUUID();
  res.setHeader("X-Request-ID", id);
  next();
});

// SEC-16: Helmet + Permissions-Policy manual (Helmet v8 não expõe essa opção)
app.use(helmet());
app.use((_req, res, next) => {
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  next();
});
// I5: Compressão gzip/deflate — reduz payload JSON ~70%
app.use(compression());
// SEC-10: CORS com validação dinâmica de origin e restrição de métodos/headers
const origensPermitidas = [env.CLIENT_URL];
app.use(
  cors({
    origin: (origin, callback) => {
      // Requests sem origin (curl, server-to-server) — permitidos porque autenticação
      // via Bearer token já protege; e no dev local é necessário.
      if (!origin || origensPermitidas.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization", "x-cliente"],
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  // M2: Cache-Control explícito — dados dinâmicos, sem cache
  res.set("Cache-Control", "no-store");
  const dbOk = mongoose.connection.readyState === 1;

  // SEC-09: em produção, não expor estado do banco nem uptime (fingerprinting)
  if (env.NODE_ENV === "production") {
    res.status(dbOk ? 200 : 503).json({ status: dbOk ? "ok" : "degraded" });
    return;
  }

  res.json({
    status: "ok",
    db: dbOk ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

app.use("/auth", authRouter);
app.use("/admin", adminRouter);
app.use("/roteiros", roteirosRouter);
app.use("/pagamentos", pagamentosRouter);

// Erros inesperados nunca vazam stack trace para o cliente.
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error("api", "Erro não tratado", { erro: err.message, stack: err.stack });
    notificarErroCritico("Erro não tratado na API", { erro: err.message });
    res.status(500).json({ erro: "Erro interno. Tente novamente." });
  }
);

export default app;
