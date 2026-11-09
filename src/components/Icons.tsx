import type { ReactElement } from 'react';
import type { AssetType } from '../domain/types';

/** Shapes that carry state, so color is never the only signal. */

export function AlertMark() {
  return (
    <svg className="icon icon-alert" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 15.2 14H.8Z" fill="currentColor" />
      <rect x="7.2" y="6" width="1.6" height="4.4" fill="var(--page)" />
      <rect x="7.2" y="11.2" width="1.6" height="1.6" fill="var(--page)" />
    </svg>
  );
}

export function CheckMark() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M3 8.5 6.5 12 13 4.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

export function NoEntryMark() {
  return (
    <svg className="icon" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="6.2" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.8 12.2 12.2 3.8" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function ChevronMark() {
  return (
    <svg className="icon chevron-mark" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

const TYPE_PATHS: Record<AssetType, ReactElement> = {
  motor: (
    <>
      <rect x="1.5" y="4.5" width="10" height="7" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11.5 8h3.5M4.5 4.5v7M7 4.5v7" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  gearbox: (
    <>
      <circle cx="8" cy="8" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="8" cy="8" r="1.1" fill="currentColor" />
      <path d="M8 1.2v2.4M8 12.4v2.4M1.2 8h2.4M12.4 8h2.4M3.2 3.2l1.7 1.7M11.1 11.1l1.7 1.7M3.2 12.8l1.7-1.7M11.1 4.9l1.7-1.7" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
  conveyor: (
    <>
      <rect x="1" y="5" width="14" height="6" rx="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="4" cy="8" r="1.2" fill="currentColor" />
      <circle cx="12" cy="8" r="1.2" fill="currentColor" />
    </>
  ),
  filler: (
    <>
      <path d="M6 1.5h4v3l1.5 2v7a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1v-7L6 4.5Z" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4.5 9h7" stroke="currentColor" strokeWidth="1.4" />
    </>
  ),
};

export function TypeIcon({ type }: { type: AssetType }) {
  return (
    <svg className="icon type-icon" viewBox="0 0 16 16" aria-hidden="true">
      {TYPE_PATHS[type]}
    </svg>
  );
}
