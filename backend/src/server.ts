import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";
import { logger } from "./lib/logger";

async function main() {
  await connectDB();

  app.listen(env.PORT, () => {
    logger.info("api", `rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });
}

main();
