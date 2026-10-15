import type { Avatar as AvatarId } from "@devoirs/shared";

// Provisoire : des emojis en attendant les illustrations du personnage (voir docs/RESTE-A-FAIRE.md).
const EMOJI: Record<AvatarId, string> = {
  renard: "🦊",
  chouette: "🦉",
  loutre: "🦦",
  "panda-roux": "🐼",
  tortue: "🐢",
  lynx: "🐱",
};

export function avatarEmoji(id: AvatarId): string {
  return EMOJI[id];
}

export function Avatar({ id, large = false }: { id: AvatarId; large?: boolean }) {
  return (
    <span className={large ? "avatar avatar-lg" : "avatar"} aria-hidden="true">
      {EMOJI[id]}
    </span>
  );
}
