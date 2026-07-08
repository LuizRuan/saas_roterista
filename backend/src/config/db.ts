import mongoose from "mongoose";
import { env } from "./env";
import { logger } from "../lib/logger";
import { enviarAlertaErro } from "../services/email";

export async function connectDB(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    logger.warn(
      "db",
      "MONGODB_URI não definida — servidor sobe SEM banco. Copie backend/.env.example para backend/.env e cole a URI do MongoDB Atlas."
    );
    return false;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    logger.info("db", "MongoDB conectado");
    return true;
  } catch (err) {
    logger.error("db", "Falha ao conectar no MongoDB", { erro: (err as Error).message });
    // Em produção não faz sentido servir a API sem banco
    if (env.NODE_ENV === "production") {
      // Aguarda o alerta sair antes de derrubar o processo (fire-and-forget
      // não daria tempo — process.exit mataria o envio no meio do caminho).
      await enviarAlertaErro("Falha ao conectar no MongoDB", {
        erro: (err as Error).message,
      }).catch(() => {});
      process.exit(1);
    }
    return false;
  }
}
