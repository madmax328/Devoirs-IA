import { loginSchema, registerSchema } from "@devoirs/shared";
import { Link, router } from "expo-router";
import { useState } from "react";
import { authClient } from "@/lib/auth-client";
import { t, tError } from "@/lib/i18n";
import { Body, Button, Card, Checkbox, ErrorText, Field, Screen, Title } from "./ui";

export function AuthScreen({ mode }: { mode: "login" | "register" }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function submit() {
    setError(null);
    const raw = { name, email, password, acceptTerms };
    const parsed = mode === "register" ? registerSchema.safeParse(raw) : loginSchema.safeParse(raw);
    if (!parsed.success) {
      setError(tError(parsed.error.issues[0]?.message ?? "errors.generic"));
      return;
    }
    setPending(true);
    const result =
      mode === "register"
        ? await authClient.signUp.email({
            name,
            email: parsed.data.email,
            password,
            acceptTerms: true,
          } as Parameters<typeof authClient.signUp.email>[0])
        : await authClient.signIn.email({ email: parsed.data.email, password });
    setPending(false);
    if (result.error) {
      if (mode === "login") setError(t("auth.invalidCredentials"));
      else if (result.error.status === 422 || /exist/i.test(result.error.code ?? ""))
        setError(t("auth.emailTaken"));
      else setError(tError(result.error.message ?? "errors.generic"));
      return;
    }
    router.replace("/parent");
  }

  return (
    <Screen>
      <Title>{t("app.name")}</Title>
      <Body muted>{t("app.tagline")}</Body>
      <Card>
        <Title>{mode === "register" ? t("auth.registerTitle") : t("auth.loginTitle")}</Title>
        {mode === "register" && (
          <Field label={t("auth.name")} value={name} onChangeText={setName} autoComplete="given-name" />
        )}
        <Field
          label={t("auth.email")}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          textContentType="emailAddress"
        />
        <Field
          label={t("auth.password")}
          hint={mode === "register" ? t("auth.passwordHint") : undefined}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete={mode === "register" ? "new-password" : "current-password"}
        />
        {mode === "register" && (
          <Checkbox label={t("auth.acceptTerms")} checked={acceptTerms} onChange={setAcceptTerms} />
        )}
        {error ? <ErrorText>{error}</ErrorText> : null}
        <Button
          label={mode === "register" ? t("auth.register") : t("auth.login")}
          onPress={submit}
          loading={pending}
        />
      </Card>
      <Link
        href={mode === "register" ? "/connexion" : "/inscription"}
        replace
        style={{ textAlign: "center", padding: 12 }}
      >
        <Body center>{mode === "register" ? t("auth.hasAccount") : t("auth.noAccount")}</Body>
      </Link>
    </Screen>
  );
}
