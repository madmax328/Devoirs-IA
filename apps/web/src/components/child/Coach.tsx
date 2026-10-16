import type { ReactNode } from "react";

/** Le coach (personnage provisoire, en attendant les illustrations). */
export function Coach({ children }: { children: ReactNode }) {
  return (
    <div className="coach">
      <span className="coach-avatar" aria-hidden="true">
        ✦
      </span>
      <div className="bubble stack" style={{ gap: 8 }}>
        {children}
      </div>
    </div>
  );
}
