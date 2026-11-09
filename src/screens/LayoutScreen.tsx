import { AlertMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { alerts, assets, records } from '../data';
import { readingStatus } from '../domain/causes';
import type { Asset } from '../domain/types';

const ALERT_HREF = '#/asset/M-204';

function HomeAlert() {
  return (
    <>
      {alerts.map((alert) => {
        const sensor = records.find((record) => record.id === alert.sensorRecordId);
        const reading = sensor?.readings?.find((item) => readingStatus(item) === 'above');
        return (
          <div className="alert-hero" key={alert.id}>
            <p className="alert-title"><AlertMark /> {alert.title} on {alert.assetId}</p>
            {reading && <p className="num">{reading.value} {reading.unit}, limit {reading.limit}</p>}
          </div>
        );
      })}
    </>
  );
}

export function LayoutScreen({
  asset,
  showReset,
  onReset,
}: {
  asset: Asset | null;
  showReset: boolean;
  onReset: () => void;
}) {
  if (!asset) {
    return (
      <Screen action={<PrimaryAction label="Open M-204 alert" href={ALERT_HREF} />}>
        <h1>Plant floor</h1>
        <HomeAlert />
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
    </Screen>
  );
}
