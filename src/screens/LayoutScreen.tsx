import { AlertMark } from '../components/Icons';
import { MachineHistory } from '../components/MachineHistory';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { alerts, assets, records } from '../data';
import { readingStatus } from '../domain/causes';
import { inspectionStatus } from '../domain/status';
import type { Asset, RetrievalResult, SavedPlan } from '../domain/types';
import type { PlanMap } from '../storage/plans';

function HomeAlert({ plans }: { plans: PlanMap }) {
  return (
    <>
      {alerts.map((alert) => {
        const sensor = records.find((record) => record.id === alert.sensorRecordId);
        const reading = sensor?.readings?.find((item) => readingStatus(item) === 'above');
        const finding = plans[alert.assetId]?.finding;
        return (
          <div className="alert-hero" key={alert.id}>
            {finding ? (
              <p className="inspected-title">
                {alert.assetId} inspected: {inspectionStatus(finding.outcome, records).short}
              </p>
            ) : (
              <p className="alert-title"><AlertMark /> {alert.title} on {alert.assetId}</p>
            )}
            {reading && (
              <p className="num">
                {finding && <AlertMark />} {reading.value} {reading.unit}, limit {reading.limit}
              </p>
            )}
          </div>
        );
      })}
    </>
  );
}

export function LayoutScreen({
  asset,
  result,
  saved,
  plans,
  showReset,
  onReset,
}: {
  asset: Asset | null;
  result: RetrievalResult | null;
  saved: SavedPlan | null;
  plans: PlanMap;
  showReset: boolean;
  onReset: () => void;
}) {
  if (!asset) {
    const first = alerts[0];
    const label = plans[first.assetId]?.finding ? `Open ${first.assetId}` : `Open ${first.assetId} alert`;
    return (
      <Screen action={<PrimaryAction label={label} href={`#/asset/${first.assetId}`} />}>
        <h1>Plant floor</h1>
        <HomeAlert plans={plans} />
        <p className="muted">Or pick a machine on the floor.</p>
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

  return (
    <Screen action={<PrimaryAction label="Review evidence" href={`#/asset/${asset.id}/evidence`} />}>
      <h1>{asset.name}</h1>
      {hasRelations ? (
        <ul className="relations">
          {parent && <li>Part of {parent.type} {parent.id}</li>}
          {siblings.map((sibling) => (
            <li key={sibling.id}>{sibling.name} shares the {parent?.type}. Its records stay out unless linked.</li>
          ))}
          {children.map((child) => <li key={child.id}>{child.name} is part of it</li>)}
        </ul>
      ) : (
        <p className="muted">No connected equipment on record.</p>
      )}
      {result && <MachineHistory result={result} finding={saved?.finding} />}
    </Screen>
  );
}
