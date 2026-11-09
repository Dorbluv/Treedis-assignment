import { alertFor, records } from '../data';
import { followUp } from '../domain/status';
import type { Escalation, RetrievalResult, SavedPlan } from '../domain/types';
import { AlertMark } from './Icons';

/** Phone only: keeps the machine in view once the plant floor is off screen. */
export function MachineHeader({
  result,
  saved,
  escalation,
}: {
  result: RetrievalResult;
  saved: SavedPlan | null;
  escalation?: Escalation;
}) {
  const { asset, parent } = result;
  const alert = alertFor(asset.id);
  const next = alert ? followUp(saved?.finding, escalation, records) : null;
  return (
    <a className="machine-header" href={`#/asset/${asset.id}`}>
      <span className="machine-name">
        {asset.id} {asset.type}
        {parent && <span className="machine-parent"> on {parent.type} {parent.id}</span>}
      </span>
      {next ? (
        <span className="machine-inspected">{next.text}</span>
      ) : (
        alert && (
          <span className="machine-alert">
            <AlertMark /> {alert.title}
          </span>
        )
      )}
    </a>
  );
}
