import type { ReactNode } from 'react';
import { ChevronMark } from './Icons';

/** A collapsed group: count and preview up front, records one tap away. */
export function EvidenceGroup({
  id,
  title,
  count,
  preview,
  open,
  onToggle,
  children,
}: {
  id?: string;
  title: string;
  count: number;
  preview: string;
  open?: boolean;
  onToggle?: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <details
      id={id}
      className="group"
      open={open}
      onToggle={(event) => onToggle?.(event.currentTarget.open)}
    >
      <summary>
        <ChevronMark />
        <span className="group-title">{title} ({count})</span>
        <span className="group-preview">{preview}</span>
      </summary>
      <div className="rows">{children}</div>
    </details>
  );
}
