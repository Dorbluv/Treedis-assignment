import { alerts, records } from '../data';
import { readingStatus } from '../domain/causes';
import { followUp } from '../domain/status';
import type { EscalationMap, PlanMap } from '../storage/plans';
import { AlertMark } from './Icons';
import { PrimaryAction } from './PrimaryAction';

export function HomePanel({ plans, escalations }: { plans: PlanMap; escalations: EscalationMap }) {
  return (
    <>
      <header className="panel-head">
        <div className="head-row">
          <div className="head-text">
            <h1 tabIndex={-1}>{alerts.length} active alerts</h1>
          </div>
          <PrimaryAction label="Open M-204 alert" href="#/asset/M-204" />
        </div>
      </header>
      <div className="panel-body">
        <div className="panel-scroll">
          <ul className="alert-list" aria-label="Active alerts">
            {alerts.map((alert) => {
              const sensor = records.find((record) => record.id === alert.sensorRecordId);
              const reading = sensor?.readings?.find((item) => readingStatus(item) === 'above');
              const next = followUp(plans[alert.assetId]?.finding, escalations[alert.assetId], records);
              return (
                <li key={alert.id}>
                  <a className="alert-row" href={`#/asset/${alert.assetId}`}>
                    <span className="alert-row-main">
                      {next ? <span className={`mark-${next.kind}`} /> : <AlertMark />}
                      <strong>{alert.assetId}</strong> {next ? next.text : alert.title}
                    </span>
                    <span className="alert-row-meta">
                      {reading && <>{reading.value} {reading.unit}, demo limit {reading.limit}. </>}
                      {alert.age} ago
                    </span>
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </>
  );
}
