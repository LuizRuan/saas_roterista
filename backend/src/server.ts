import app from "./app";
import { connectDB } from "./config/db";
import { env } from "./config/env";

async function main() {
  await connectDB();

  app.listen(env.PORT, () => {
    console.log(
      `[api] rodando em http://localhost:${env.PORT} (${env.NODE_ENV})`
    );
  });
}

main();
