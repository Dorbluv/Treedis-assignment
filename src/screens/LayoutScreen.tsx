import { AlertMark } from '../components/Icons';
import { MachineHistory } from '../components/MachineHistory';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { alertFor, alerts, assets, records } from '../data';
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

function MachineStatus({ asset, saved, escalation }: { asset: Asset; saved: SavedPlan | null; escalation?: Escalation }) {
  const alert = alertFor(asset.id);
  if (!alert) return <p className="muted">No active alert</p>;
  const next = followUp(saved?.finding, escalation, records);
  return next ? (
    <p className="inspected-title">{next.text}</p>
  ) : (
    <p className="alert-title"><AlertMark /> {alert.title}</p>
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

  const parent = assets.find((candidate) => candidate.id === asset.parentId) ?? null;
  const siblings = asset.parentId
    ? assets.filter((candidate) => candidate.parentId === asset.parentId && candidate.id !== asset.id)
    : [];
  const children = assets.filter((candidate) => candidate.parentId === asset.id);
  const hasRelations = parent || siblings.length > 0 || children.length > 0;

  const action = hasReviewableEvidence(result) ? (
    <PrimaryAction label="Review evidence" href={`#/asset/${asset.id}/evidence`} />
  ) : (
    <PrimaryAction label="Back to plant layout" href="#/" />
  );

  return (
    <Screen action={action}>
      <div className="machine-title">
        <h1>{asset.name}</h1>
        <MachineStatus asset={asset} saved={saved} escalation={escalation} />
      </div>
      {hasRelations && (
        <ul className="relations">
          {parent && <li>Part of {parent.type} {parent.id}</li>}
          {siblings.map((sibling) => (
            <li key={sibling.id}>{sibling.id} shares it. Its records stay out.</li>
          ))}
          {children.map((child) => <li key={child.id}>{child.name} is part of it</li>)}
        </ul>
      )}
      <MachineHistory result={result} finding={saved?.finding} escalation={escalation} />
    </Screen>
  );
}
