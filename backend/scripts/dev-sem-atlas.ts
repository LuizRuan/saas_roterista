/**
 * Sobe a API com um MongoDB EM MEMÓRIA — para desenvolver sem ter o Atlas
 * configurado ainda. Os dados somem quando o processo é encerrado.
 *
 *   npm run dev:memoria
 */
import { MongoMemoryServer } from "mongodb-memory-server";

(async () => {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = `${mongo.getUri()}gancho`;
  console.log(
    `[dev] MongoDB em memória: ${process.env.MONGODB_URI} (dados somem ao desligar)`
  );
  await import("../src/server");
})();
