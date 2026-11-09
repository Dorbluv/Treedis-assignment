import type { CauseComparisonItem } from '../domain/causes';
import type { MaintenanceRecord } from '../domain/types';
import { longDate } from '../screens/format';

function LastTime({ record }: { record: MaintenanceRecord }) {
  return (
    <>
      <p className="cell-lead">{longDate(record.occurredOn ?? '')}</p>
      <p>Found: {record.foundCondition}</p>
      <p>Fixed by: {record.fix}</p>
      <p>Downtime: <span className="num">{record.downtimeHours}</span> hours</p>
    </>
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
          <div className="cause-head">
            <h3>{cause.label}</h3>
            <span className="tag tag-dashed">Unconfirmed</span>
          </div>
          <div className="cell">
            <h4>Why it is on the list</h4>
            <p>{record.alertMatch}</p>
          </div>
          <div className="cell">
            <h4>Last time on this motor</h4>
            <LastTime record={record} />
          </div>
          <div className="cell">
            <h4>What points to it</h4>
            <ul>
              {record.symptoms?.map((symptom) => <li key={symptom}>{symptom}</li>)}
            </ul>
          </div>
          <div className="cell">
            <h4>How to check it</h4>
            <a className="tap-link step-link" href={stepHref(step.id)}>Step {stepNumber}</a>
            <p>{step.english}</p>
            <p className="expected">You should see: {step.expectedEnglish}</p>
          </div>
          <div className="cell cell-link">
            <a className="tap-link" href={sourceHref(record.id)}>Source record {record.id}</a>
          </div>
        </article>
      ))}
    </div>
  );
}
