const LABELS = {
  machine: 'Machine',
  evidence: 'Evidence',
  plan: 'Plan',
  finding: 'Finding',
  escalate: 'Escalate',
} as const;

export type StepKey = keyof typeof LABELS;
export type ProgressStep = StepKey | 'complete';
export type ProgressFlow = 'full' | 'escalate' | 'review';

/** Only the steps this machine can actually go through. */
const FLOWS: Record<ProgressFlow, StepKey[]> = {
  full: ['machine', 'evidence', 'plan', 'finding'],
  escalate: ['machine', 'evidence', 'escalate'],
  review: ['machine', 'evidence'],
};

/** Completed steps link back. The current step and future steps do not. */
export function Progress({
  current,
  hrefs,
  flow,
}: {
  current: ProgressStep;
  hrefs: Partial<Record<StepKey, string>>;
  flow: ProgressFlow;
}) {
  const steps = FLOWS[flow];
  const index = current === 'complete' ? steps.length : steps.indexOf(current);
  return (
    <ol className="progress" aria-label="Progress">
      {steps.map((step, position) => {
        const done = position < index;
        const state = done ? 'is-done' : position === index ? 'is-current' : '';
        const mark = <span className="progress-mark" aria-hidden="true">{done ? '✓' : position + 1}</span>;
        const href = done ? hrefs[step] : undefined;
        return (
          <li key={step} className={state} aria-current={position === index ? 'step' : undefined}>
            {href ? (
              <a className="progress-link" href={href} aria-label={`Back to ${LABELS[step]}, completed`}>
                {mark}
                <span className="progress-label">{LABELS[step]}</span>
              </a>
            ) : (
              <>
                {mark}
                {LABELS[step]}
              </>
            )}
          </li>
        );
      })}
    </ol>
  );
}
