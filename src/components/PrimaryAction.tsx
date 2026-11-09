interface PrimaryActionProps {
  label: string;
  href?: string;
  onClick?: () => void;
  disabled?: boolean;
}

/** The one primary action on a screen, fixed in the same place at every width. */
export function PrimaryAction({ label, href, onClick, disabled }: PrimaryActionProps) {
  return (
    <div className="action-bar">
      <div className="action-inner">
        {href ? (
          <a className="button" data-primary href={href}>{label}</a>
        ) : (
          <button type="button" className="button" data-primary onClick={onClick} disabled={disabled}>
            {label}
          </button>
        )}
      </div>
    </div>
  );
}
