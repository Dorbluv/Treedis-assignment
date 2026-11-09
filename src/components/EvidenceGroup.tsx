import type { ReactNode } from 'react';
import { ChevronMark } from './Icons';

/** A collapsed group: count and preview up front, records one tap away. */
export function EvidenceGroup({
  title,
  count,
  preview,
  open,
  children,
}: {
  title: string;
  count: number;
  preview: string;
  open?: boolean;
  children: ReactNode;
}) {
  return (
    <details className="group" open={open}>
      <summary>
        <ChevronMark />
        <span className="group-title">{title} ({count})</span>
        <span className="group-preview">{preview}</span>
      </summary>
      <div className="rows">{children}</div>
    </details>
  );
}
