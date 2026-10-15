import { closeMongo, ensureIndexes } from "../src";

await ensureIndexes();
console.log("Index MongoDB à jour.");
await closeMongo();
