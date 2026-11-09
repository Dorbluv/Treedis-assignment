import { alertFor } from '../data';
import type { RetrievalResult } from '../domain/types';
import { AlertMark } from './Icons';

/** Phone only: keeps the machine in view once the plant floor is off screen. */
export function MachineHeader({ result }: { result: RetrievalResult }) {
  const { asset, parent } = result;
  const alert = alertFor(asset.id);
  return (
    <a className="machine-header" href={`#/asset/${asset.id}`}>
      <span className="machine-name">
        {asset.id} {asset.type}
        {parent && <span className="machine-parent"> on {parent.type} {parent.id}</span>}
      </span>
      {alert && (
        <span className="machine-alert">
          <AlertMark /> {alert.title}
        </span>
      )}
    </a>
  );
}
