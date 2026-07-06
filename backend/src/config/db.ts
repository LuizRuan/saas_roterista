import mongoose from "mongoose";
import { env } from "./env";

export async function connectDB(): Promise<boolean> {
  if (!env.MONGODB_URI) {
    console.warn(
      "[db] MONGODB_URI não definida — servidor sobe SEM banco. " +
        "Copie backend/.env.example para backend/.env e cole a URI do MongoDB Atlas."
    );
    return false;
  }

  try {
    await mongoose.connect(env.MONGODB_URI);
    console.log("[db] MongoDB conectado");
    return true;
  } catch (err) {
    console.error("[db] Falha ao conectar no MongoDB:", (err as Error).message);
    // Em produção não faz sentido servir a API sem banco
    if (env.NODE_ENV === "production") process.exit(1);
    return false;
  }
}
