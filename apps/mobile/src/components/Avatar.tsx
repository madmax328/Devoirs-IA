import type { Avatar as AvatarId } from "@devoirs/shared";
import { Text, View } from "react-native";
import { useTheme } from "@/lib/theme";

// Provisoire : emojis en attendant les illustrations (voir docs/RESTE-A-FAIRE.md).
const EMOJI: Record<AvatarId, string> = {
  renard: "🦊",
  chouette: "🦉",
  loutre: "🦦",
  "panda-roux": "🐼",
  tortue: "🐢",
  lynx: "🐱",
};

export const avatarEmoji = (id: AvatarId) => EMOJI[id];

export function Avatar({ id, size = 64 }: { id: AvatarId; size?: number }) {
  const c = useTheme();
  return (
    <View
      accessible={false}
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: c.surfaceAlt,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text style={{ fontSize: size * 0.55 }}>{EMOJI[id]}</Text>
    </View>
  );
}
