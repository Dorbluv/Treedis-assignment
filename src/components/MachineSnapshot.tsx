import { alertFor, assets, records } from '../data';
import { machineSnapshot } from '../domain/snapshot';
import { followUp } from '../domain/status';
import type { Escalation, RetrievalResult, SavedPlan } from '../domain/types';
import { recordLine } from '../screens/format';
import { AlertMark, ChevronMark } from './Icons';

export function MachineSnapshot({
  result,
  saved,
  escalation,
  open = false,
}: {
  result: RetrievalResult;
  saved: SavedPlan | null;
  escalation?: Escalation;
  /** Open where the snapshot is the main content, on machines with no active alert. */
  open?: boolean;
}) {
  const alert = alertFor(result.asset.id);
  const next = alert ? followUp(saved?.finding, escalation, records) : null;
  const { reading, recordCount, latestRecord, procedure, connected } = machineSnapshot(result, assets);

  let status;
  if (next) status = <span className="inspected-title">{next.text}</span>;
  else if (alert) status = <span className="alert-title"><AlertMark /> {alert.title}</span>;
  else status = <span>No active alert</span>;

  return (
    <details className="group machine-details" open={open}>
      <summary>
        <ChevronMark />
        <span className="group-title">Machine details</span>
      </summary>
    <dl className="snapshot">
      <div>
        <dt>Status</dt>
        <dd>
          {status}
          {reading && (
            <span className={reading.above ? 'snapshot-high' : 'snapshot-reading'}>
              {reading.above && next && <AlertMark />}
              {reading.text}
            </span>
          )}
        </dd>
      </div>
      <div>
        <dt>Past records</dt>
        <dd>
          {latestRecord
            ? `${recordCount}. Latest: ${recordLine(latestRecord)}`
            : 'No past records on this machine'}
        </dd>
      </div>
      <div>
        <dt>Procedure</dt>
        <dd>{procedure ?? 'No approved procedure'}</dd>
      </div>
      <div>
        <dt>Connected</dt>
        <dd>{connected}</dd>
      </div>
    </dl>
    </details>
  );
}
