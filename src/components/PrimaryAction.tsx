const HINT_ID = 'primary-action-hint';
export const DEMO_TEXT = 'Demo with synthetic data. Not for operational use.';

interface PrimaryActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Replaces the Next line while the action is disabled, and says why. */
  hint?: string;
  next?: string;
  nextLabel?: string;
}

/** The one primary action, in a bar that stays in view while the panel scrolls. */
export function PrimaryAction({ label, href, onClick, disabled, hint, next, nextLabel = 'Next:' }: PrimaryActionProps) {
  const showHint = Boolean(disabled && hint);
  return (
    <div className="action-bar">
      <div className="action-row">
        {showHint ? (
          <span id={HINT_ID} className="action-next">{hint}</span>
        ) : (
          next && <span className="action-next"><strong>{nextLabel}</strong> {next}</span>
        )}
        {href ? (
          <a className="button" data-primary href={href}>{label}</a>
        ) : (
          <button
            type="button"
            className="button"
            data-primary
            aria-disabled={disabled || undefined}
            aria-describedby={showHint ? HINT_ID : undefined}
            onClick={disabled ? undefined : onClick}
          >
            {label}
          </button>
        )}
      </div>
      <p className="action-demo">{DEMO_TEXT}</p>
    </div>
  );
}
