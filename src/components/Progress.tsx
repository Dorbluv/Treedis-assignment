import { NoEntryMark } from './Icons';

const STEPS = [
  { key: 'machine', label: 'Machine' },
  { key: 'evidence', label: 'Evidence' },
  { key: 'plan', label: 'Plan' },
  { key: 'finding', label: 'Finding' },
] as const;

export type StepKey = (typeof STEPS)[number]['key'];
export type ProgressStep = StepKey | 'complete';

const PLAN_POSITION = 2;

/**
 * Completed steps link back. The current step and future steps do not.
 * With no procedure, Plan shows as blocked and nothing past it can be reached.
 */
export function Progress({
  current,
  hrefs,
  planBlocked,
}: {
  current: ProgressStep;
  hrefs: Partial<Record<StepKey, string>>;
  planBlocked: boolean;
}) {
  const reached = current === 'complete' ? STEPS.length : STEPS.findIndex((step) => step.key === current);
  const index = planBlocked ? Math.min(reached, PLAN_POSITION) : reached;
  return (
    <ol className="progress" aria-label="Progress">
      {STEPS.map((step, position) => {
        if (planBlocked && step.key === 'plan') {
          return (
            <li key={step.key} className="is-blocked">
              <span className="progress-mark" aria-hidden="true"><NoEntryMark /></span>
              <span className="progress-blocked">
                {step.label}
                <span className="progress-reason">No procedure</span>
              </span>
            </li>
          );
        }
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
