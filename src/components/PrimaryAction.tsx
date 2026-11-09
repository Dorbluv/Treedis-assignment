const HINT_ID = 'primary-action-hint';

interface PrimaryActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
  /** Says why the action is unavailable. It keeps its space, so the button does not jump. */
  hint?: string;
}

/** The one primary action on a screen, fixed in the same place at every width. */
export function PrimaryAction({ label, href, onClick, disabled, hint }: PrimaryActionProps) {
  const showHint = Boolean(disabled && hint);
  return (
    <div className="action-bar">
      <div className="action-inner">
        {hint && (
          <span id={HINT_ID} className={`action-hint${showHint ? '' : ' is-off'}`}>{hint}</span>
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
    </div>
  );
}
