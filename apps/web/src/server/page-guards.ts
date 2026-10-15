import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getParent, requireChild, type ParentContext } from "./guards";
import type { ChildSessionContext } from "./services/child-auth";

/** Pour les pages serveur : redirige vers la connexion si besoin. */
export async function parentOrRedirect(): Promise<ParentContext> {
  const parent = await getParent(await headers());
  if (!parent) redirect("/connexion");
  return parent;
}

export async function childOrRedirect(): Promise<ChildSessionContext> {
  try {
    return await requireChild(await headers());
  } catch {
    redirect("/enfant");
  }
}
