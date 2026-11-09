import type { CauseComparisonItem } from '../domain/causes';
import { shortDate } from '../screens/format';

export function CauseComparison({
  items,
  sourceHref,
  stepHref,
}: {
  items: CauseComparisonItem[];
  sourceHref: (recordId: string) => string;
  stepHref: (stepId: string) => string;
}) {
  return (
    <div className="compare">
      {items.map(({ cause, record, step, stepNumber }) => (
        <article className="cause" key={cause.key}>
          <h3>{cause.label}</h3>
          <dl className="stats">
            <div><dt>Last seen</dt><dd>{shortDate(record.occurredOn ?? '')}</dd></div>
            <div><dt>Fix</dt><dd>{record.fix}</dd></div>
            <div><dt>Downtime</dt><dd>{record.downtimeHours} h</dd></div>
          </dl>
          <p className="check">
            <strong>Check:</strong> <a className="tap-link" href={stepHref(step.id)}>Step {stepNumber}</a>, {step.checkPhrase}
          </p>
          <a className="tap-link source-link" href={sourceHref(record.id)}>Source</a>
        </article>
      ))}
    </div>
  );
}
