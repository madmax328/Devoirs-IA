"use client";

import { loginSchema, registerSchema } from "@devoirs/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";
import { t, tError } from "@/lib/i18n";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = new FormData(e.currentTarget);
    const raw = {
      name: String(form.get("name") ?? ""),
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      acceptTerms: form.get("acceptTerms") === "on",
    };

    const parsed = mode === "register" ? registerSchema.safeParse(raw) : loginSchema.safeParse(raw);
    if (!parsed.success) {
      setError(tError(parsed.error.issues[0]?.message ?? "errors.generic"));
      return;
    }

    setPending(true);
    const result =
      mode === "register"
        ? await authClient.signUp.email({ ...raw, email: parsed.data.email, acceptTerms: true } as Parameters<
            typeof authClient.signUp.email
          >[0])
        : await authClient.signIn.email({ email: parsed.data.email, password: raw.password });
    setPending(false);

    if (result.error) {
      if (mode === "login") setError(t("auth.invalidCredentials"));
      else if (result.error.status === 422 || /exist/i.test(result.error.code ?? ""))
        setError(t("auth.emailTaken"));
      else setError(tError(result.error.message ?? "errors.generic"));
      return;
    }
    router.push("/parent");
    router.refresh();
  }

  return (
    <form className="card stack" onSubmit={onSubmit} noValidate>
      <h1>{mode === "register" ? t("auth.registerTitle") : t("auth.loginTitle")}</h1>
      {mode === "register" && (
        <div className="field">
          <label htmlFor="name">{t("auth.name")}</label>
          <input id="name" name="name" type="text" autoComplete="given-name" required />
        </div>
      )}
      <div className="field">
        <label htmlFor="email">{t("auth.email")}</label>
        <input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div className="field">
        <label htmlFor="password">{t("auth.password")}</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={mode === "register" ? "new-password" : "current-password"}
          required
        />
        {mode === "register" && <span className="hint">{t("auth.passwordHint")}</span>}
      </div>
      {mode === "register" && (
        <label className="check">
          <input type="checkbox" name="acceptTerms" />
          <span>{t("auth.acceptTerms")}</span>
        </label>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="btn btn-block" type="submit" disabled={pending}>
        {pending ? t("common.loading") : mode === "register" ? t("auth.register") : t("auth.login")}
      </button>
      <Link href={mode === "register" ? "/connexion" : "/inscription"} className="small">
        {mode === "register" ? t("auth.hasAccount") : t("auth.noAccount")}
      </Link>
    </form>
  );
}
