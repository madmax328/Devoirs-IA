import { colors, type ColorScheme } from "@devoirs/ui";
import { useColorScheme } from "react-native";

export function useTheme(): ColorScheme {
  return colors[useColorScheme() === "dark" ? "dark" : "light"];
}
