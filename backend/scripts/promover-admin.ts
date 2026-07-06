/**
 * Script one-shot para promover uma conta existente a admin.
 *
 * Uso:
 *   ADMIN_EMAIL=seu@email.com npm run promover-admin
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI não definida. Configure o .env antes de rodar.");
    process.exit(1);
  }

  if (!ADMIN_EMAIL) {
    console.error("❌ Informe o e-mail: ADMIN_EMAIL=seu@email.com npm run promover-admin");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const resultado = await mongoose.connection
    .collection("usuarios")
    .updateOne(
      { email: ADMIN_EMAIL.toLowerCase().trim() },
      { $set: { papel: "admin" } }
    );

  if (resultado.matchedCount === 0) {
    console.error(`❌ Nenhuma conta encontrada para: ${ADMIN_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Conta ${ADMIN_EMAIL} promovida a admin com sucesso!`);
  console.log("   Faça logout e login novamente para o novo papel aparecer no token.");

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
