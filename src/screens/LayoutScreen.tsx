import { PrimaryAction } from '../components/PrimaryAction';
import { alerts, assets } from '../data';
import type { Asset } from '../domain/types';

const ALERT_HREF = '#/asset/M-204';

export function LayoutScreen({ asset, hasEvidenceView }: { asset: Asset | null; hasEvidenceView: boolean }) {
  if (!asset) {
    return (
      <div className="panel">
        <h1>Plant layout</h1>
        {alerts.map((alert) => (
          <p className="alert-line" key={alert.id}>
            <strong>{alert.title}</strong> on {alert.assetId}
          </p>
        ))}
        <p className="muted">Open the alert, or select equipment on the plan.</p>
        <PrimaryAction label="Open M-204 alert" href={ALERT_HREF} />
      </div>
    );
  }

  const parent = assets.find((candidate) => candidate.id === asset.parentId) ?? null;
  const siblings = asset.parentId
    ? assets.filter((candidate) => candidate.parentId === asset.parentId && candidate.id !== asset.id)
    : [];
  const children = assets.filter((candidate) => candidate.parentId === asset.id);

  return (
    <div className="panel">
      <h1>{asset.name}</h1>
      {parent || siblings.length > 0 || children.length > 0 ? (
        <ul className="relations">
          {parent && <li><strong>{parent.id}</strong> is the parent {parent.type}. {asset.id} is part of it.</li>}
          {siblings.map((sibling) => (
            <li key={sibling.id}>
              <strong>{sibling.id}</strong> is a sibling {sibling.type}. Its records are not used for {asset.id} unless they link to it.
            </li>
          ))}
          {children.map((child) => (
            <li key={child.id}><strong>{child.id}</strong> is a {child.type} that is part of {asset.id}.</li>
          ))}
        </ul>
      ) : (
        <p>No parent or sibling equipment on record.</p>
      )}

      {hasEvidenceView ? (
        <PrimaryAction label="Review evidence" href={`#/asset/${asset.id}/evidence`} />
      ) : (
        <>
          <p className="muted">Only M-204 has an evidence view in this version.</p>
          <PrimaryAction label="Go to M-204 alert" href={ALERT_HREF} />
        </>
      )}
    </div>
  );
}
