/**
 * Script one-shot para mudar o plano de uma conta existente para "pro".
 *
 * Uso:
 *   PRO_EMAIL=seu@email.com npm run promover-pro
 */

import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

async function main() {
  const MONGODB_URI = process.env.MONGODB_URI;
  const PRO_EMAIL = process.env.PRO_EMAIL;

  if (!MONGODB_URI) {
    console.error("❌ MONGODB_URI não definida. Configure o .env antes de rodar.");
    process.exit(1);
  }

  if (!PRO_EMAIL) {
    console.error("❌ Informe o e-mail: PRO_EMAIL=seu@email.com npm run promover-pro");
    process.exit(1);
  }

  await mongoose.connect(MONGODB_URI);

  const { promoverPro } = await import("../src/services/administracao");
  const promovido = await promoverPro(PRO_EMAIL);

  if (!promovido) {
    console.error(`❌ Nenhuma conta encontrada para: ${PRO_EMAIL}`);
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`✅ Conta ${PRO_EMAIL} atualizada para o plano pro com sucesso!`);

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("❌ Erro inesperado:", err);
  process.exit(1);
});
