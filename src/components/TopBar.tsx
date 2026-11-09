import { alerts, records } from '../data';
import { followUp } from '../domain/status';
import type { EscalationMap, PlanMap } from '../storage/plans';
import { AlertMark } from './Icons';
import { DEMO_TEXT } from './PrimaryAction';

export function TopBar({
  currentId,
  plans,
  escalations,
}: {
  currentId: string | null;
  plans: PlanMap;
  escalations: EscalationMap;
}) {
  return (
    <header className="topbar">
      <a href="#/" className="wordmark">Maintenance Copilot</a>
      <a href="#/" className="alert-count"><AlertMark /> {alerts.length} alerts</a>
      <nav className="queue" aria-label="Alert queue">
        {alerts.map((alert) => {
          const next = followUp(plans[alert.assetId]?.finding, escalations[alert.assetId], records);
          return (
            <a
              key={alert.id}
              href={`#/asset/${alert.assetId}`}
              className={`queue-item${alert.assetId === currentId ? ' is-current' : ''}`}
              aria-current={alert.assetId === currentId ? 'page' : undefined}
            >
              {next ? <span className={`mark-${next.kind}`} /> : <AlertMark />}
              <span className="queue-id">{alert.assetId}</span>
              <span className="queue-title">{alert.title}</span>
              <span className="queue-age">{alert.age}</span>
            </a>
          );
        })}
      </nav>
      <p className="demo-text">{DEMO_TEXT}</p>
    </header>
  );
}
