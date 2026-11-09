const STEPS = [
  { key: 'machine', label: 'Machine' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'plan', label: 'Plan' },
  { key: 'finding', label: 'Finding' },
] as const;

export type ProgressStep = (typeof STEPS)[number]['key'] | 'complete';

export function Progress({ current }: { current: ProgressStep }) {
  const index = current === 'complete' ? STEPS.length : STEPS.findIndex((step) => step.key === current);
  return (
    <ol className="progress" aria-label="Progress">
      {STEPS.map((step, position) => {
        const state = position < index ? 'is-done' : position === index ? 'is-current' : '';
        return (
          <li key={step.key} className={state} aria-current={position === index ? 'step' : undefined}>
            <span className="progress-mark" aria-hidden="true">{position < index ? '✓' : position + 1}</span>
            {step.label}
          </li>
        );
      })}
    </ol>
  );
}
