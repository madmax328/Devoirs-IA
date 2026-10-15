import { MongoClient, type Db } from "mongodb";

type Cache = { client: MongoClient | null; uri: string | null };

// En serverless (Vercel), on réutilise la connexion entre deux invocations.
const globalCache = globalThis as typeof globalThis & { __devoirsMongo?: Cache };
const cache: Cache = (globalCache.__devoirsMongo ??= { client: null, uri: null });

export function getMongoUri(): string {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("Variable d'environnement MONGODB_URI manquante (voir .env.example).");
  return uri;
}

export function getMongoClient(uri: string = getMongoUri()): MongoClient {
  if (cache.client && cache.uri === uri) return cache.client;
  cache.client = new MongoClient(uri, { appName: "devoirs-ia", maxPoolSize: 10 });
  cache.uri = uri;
  return cache.client;
}

/** Le nom de la base est celui de l'URI (…/devoirs?…), sinon MONGODB_DB, sinon "devoirs". */
export function getDb(client: MongoClient = getMongoClient()): Db {
  return client.db(process.env.MONGODB_DB || undefined);
}

export async function closeMongo(): Promise<void> {
  if (cache.client) await cache.client.close();
  cache.client = null;
  cache.uri = null;
}
