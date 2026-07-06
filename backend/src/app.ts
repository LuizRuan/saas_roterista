import express from "express";
import helmet from "helmet";
import cors from "cors";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import { env } from "./config/env";
import { authRouter } from "./routes/auth";

const app = express();

// Atrás do proxy do Render, garante o IP real no rate limit e cookies Secure.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());
app.use(
  cors({
    origin: env.CLIENT_URL, // apenas o domínio do frontend
    credentials: true, // necessário para o cookie httpOnly do refresh token
  })
);
app.use(express.json({ limit: "100kb" }));
app.use(cookieParser());

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    uptime: Math.round(process.uptime()),
  });
});

app.use("/auth", authRouter);

// Erros inesperados nunca vazam stack trace para o cliente.
app.use(
  (err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    console.error("[api] erro não tratado:", err);
    res.status(500).json({ erro: "Erro interno. Tente novamente." });
  }
);

export default app;
