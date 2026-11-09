import type { ReactNode } from 'react';

/** A work panel: its body scrolls on tablet and desktop, and its action stays pinned. */
export function Screen({ action, children }: { action: ReactNode; children: ReactNode }) {
  return (
    <div className="work-panel">
      <div className="work-body">{children}</div>
      {action}
    </div>
  );
}
