import type { CauseComparisonItem } from '../domain/causes';
import type { MaintenanceRecord } from '../domain/types';
import { formatDay } from '../screens/format';

function Stats({ record }: { record: MaintenanceRecord }) {
  return (
    <dl className="stats">
      <div><dt>Last seen</dt><dd>{formatDay(record.occurredOn ?? '')}</dd></div>
      <div><dt>Fix</dt><dd>{record.fix}</dd></div>
      <div><dt>Downtime</dt><dd>{record.downtimeHours} h</dd></div>
    </dl>
  );
}

/** A possible cause with no procedure step to test it. */
export function UntestableCause({
  label,
  record,
  sourceHref,
}: {
  label: string;
  record: MaintenanceRecord;
  sourceHref: string;
}) {
  return (
    <article className="cause cause-solo">
      <div className="cause-head">
        <h3>{label}</h3>
        <span className="tag tag-dashed">Unconfirmed</span>
      </div>
      <Stats record={record} />
      <a className="source-link" href={sourceHref}>Source</a>
    </article>
  );
}

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
          <Stats record={record} />
          <p className="check">
            <strong><a className="step-link" href={stepHref(step.id)}>Step {stepNumber}</a>: {step.checkPhrase}</strong>
          </p>
          <a className="source-link" href={sourceHref(record.id)}>Source</a>
        </article>
      ))}
    </div>
  );
}
