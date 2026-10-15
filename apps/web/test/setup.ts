import { closeMongo, ensureIndexes, getDb } from "@devoirs/db";
import { afterAll, beforeAll } from "vitest";

// Base dédiée aux tests (jamais celle de dev) — MongoDB local via docker compose, ou service CI.
process.env.MONGODB_URI ??= "mongodb://localhost:27017/devoirs_test?directConnection=true";
if (!/test/.test(process.env.MONGODB_URI))
  throw new Error("MONGODB_URI de test doit pointer vers une base *test*");
process.env.BETTER_AUTH_SECRET ??= "test-secret-test-secret-test-secret-42";
process.env.BETTER_AUTH_URL ??= "http://localhost:3000";

beforeAll(async () => {
  await getDb().dropDatabase();
  await ensureIndexes();
});

afterAll(async () => {
  await closeMongo();
});
