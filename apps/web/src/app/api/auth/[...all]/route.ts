import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

const handler = (request: Request) => auth().handler(request);
export const { GET, POST } = toNextJsHandler(handler);
