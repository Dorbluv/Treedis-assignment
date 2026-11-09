const STEPS = [
  { key: 'machine', label: 'Machine' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'plan', label: 'Plan' },
  { key: 'finding', label: 'Finding' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];
export type ProgressStep = StepKey | 'complete';

/** Completed steps link back. The current step and future steps do not. */
export function Progress({ current, hrefs }: { current: ProgressStep; hrefs: Partial<Record<StepKey, string>> }) {
  const index = current === 'complete' ? STEPS.length : STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="progress" aria-label="Progress">
      {STEPS.map((step, position) => {
        const done = position < index;
        const state = done ? 'is-done' : position === index ? 'is-current' : '';
        const mark = <span className="progress-mark" aria-hidden="true">{done ? '✓' : position + 1}</span>;
        const href = done ? hrefs[step.key] : undefined;
        return (
          <li key={step.key} className={state} aria-current={position === index ? 'step' : undefined}>
            {href ? (
              <a className="progress-link" href={href} aria-label={`Back to ${step.label}, completed`}>
                {mark}
                <span className="progress-label">{step.label}</span>
              </a>
            ) : (
              <>
                {mark}
                {step.label}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
