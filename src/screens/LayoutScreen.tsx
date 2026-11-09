import { AlertMark } from '../components/Icons';
import { MachineHistory } from '../components/MachineHistory';
import { MachineSnapshot } from '../components/MachineSnapshot';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { alerts, records } from '../data';
import { hasReviewableEvidence, readingStatus } from '../domain/causes';
import { followUp } from '../domain/status';
import type { Asset, Escalation, RetrievalResult, SavedPlan } from '../domain/types';
import type { EscalationMap, PlanMap } from '../storage/plans';

function AlertList({ plans, escalations }: { plans: PlanMap; escalations: EscalationMap }) {
  return (
    <ul className="alert-list" aria-label="Active alerts">
      {alerts.map((alert) => {
        const sensor = records.find((record) => record.id === alert.sensorRecordId);
        const reading = sensor?.readings?.find((item) => readingStatus(item) === 'above');
        const next = followUp(plans[alert.assetId]?.finding, escalations[alert.assetId], records);
        return (
          <li key={alert.id}>
            <a className="alert-row" href={`#/asset/${alert.assetId}`}>
              {next ? (
                <span className="inspected-title">{alert.assetId} {next.text}</span>
              ) : (
                <span className="alert-title"><AlertMark /> {alert.assetId} {alert.title}</span>
              )}
              {reading && (
                <span className="num alert-row-value">
                  {reading.value} {reading.unit}, demo limit {reading.limit}
                </span>
              )}
            </a>
          </li>
        );
      })}
    </ul>
  );
}

export function LayoutScreen({
  asset,
  result,
  saved,
  escalation,
  plans,
  escalations,
  showReset,
  onReset,
}: {
  asset: Asset | null;
  result: RetrievalResult | null;
  saved: SavedPlan | null;
  escalation?: Escalation;
  plans: PlanMap;
  escalations: EscalationMap;
  showReset: boolean;
  onReset: () => void;
}) {
  if (!asset || !result) {
    return (
      <Screen action={<PrimaryAction label="Open M-204 alert" href="#/asset/M-204" />}>
        <h1>Plant floor</h1>
        <AlertList plans={plans} escalations={escalations} />
        {showReset && <button type="button" className="reset" onClick={onReset}>Reset demo</button>}
      </Screen>
    );
  }

  const action = hasReviewableEvidence(result) ? (
    <PrimaryAction label="Review evidence" href={`#/asset/${asset.id}/evidence`} />
  ) : (
    <PrimaryAction label="Back to plant layout" href="#/" />
  );

  return (
    <Screen action={action}>
      <h1>{asset.name}</h1>
      <MachineSnapshot result={result} saved={saved} escalation={escalation} />
      <MachineHistory result={result} finding={saved?.finding} escalation={escalation} />
    </Screen>
  );
}
