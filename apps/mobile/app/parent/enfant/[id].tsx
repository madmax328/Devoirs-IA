import type { ChildPublic } from "@devoirs/shared";
import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator } from "react-native";
import { ChildForm } from "@/components/ChildForm";
import { ErrorText, Screen } from "@/components/ui";
import { api } from "@/lib/api";
import { useTheme } from "@/lib/theme";

export default function EditChildScreen() {
  const c = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [child, setChild] = useState<ChildPublic | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api<{ child: ChildPublic }>(`/api/children/${id}`)
      .then((r) => setChild(r.child))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : String(e)));
  }, [id]);

  if (child) return <ChildForm child={child} />;
  return <Screen>{error ? <ErrorText>{error}</ErrorText> : <ActivityIndicator color={c.primary} />}</Screen>;
}
