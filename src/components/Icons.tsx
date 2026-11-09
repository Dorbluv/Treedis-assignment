/** Shapes that carry state, so color is never the only signal. */

export function AlertMark() {
  return (
    <svg className="icon icon-alert" viewBox="0 0 16 16" aria-hidden="true">
      <path d="M8 1.5 15.2 14H.8Z" fill="currentColor" />
      <rect x="7.2" y="6" width="1.6" height="4.4" className="icon-bang" />
      <rect x="7.2" y="11.2" width="1.6" height="1.6" className="icon-bang" />
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
