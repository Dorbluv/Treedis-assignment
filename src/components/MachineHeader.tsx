import { alertFor, records } from '../data';
import { inspectionStatus } from '../domain/status';
import type { RetrievalResult, SavedPlan } from '../domain/types';
import { AlertMark, CheckMark } from './Icons';

/** Phone only: keeps the machine in view once the plant floor is off screen. */
export function MachineHeader({ result, saved }: { result: RetrievalResult; saved: SavedPlan | null }) {
  const { asset, parent } = result;
  const alert = alertFor(asset.id);
  const inspection = alert && saved?.finding ? inspectionStatus(saved.finding.outcome, records) : null;
  return (
    <a className="machine-header" href={`#/asset/${asset.id}`}>
      <span className="machine-name">
        {asset.id} {asset.type}
        {parent && <span className="machine-parent"> on {parent.type} {parent.id}</span>}
      </span>
      {inspection ? (
        <span className="machine-inspected">
          <CheckMark /> Inspected: {inspection.short}
        </span>
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
