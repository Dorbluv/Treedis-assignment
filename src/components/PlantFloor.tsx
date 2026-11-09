import { alerts, assets, records } from '../data';
import { machineStatus } from '../domain/floor';
import type { Asset } from '../domain/types';
import { AlertMark, TypeIcon } from './Icons';

type Role = 'selected' | 'parent' | 'sibling' | 'child' | null;

function roleOf(asset: Asset, selected: Asset | null): Role {
  if (!selected) return null;
  if (asset.id === selected.id) return 'selected';
  if (asset.id === selected.parentId) return 'parent';
  if (asset.parentId === selected.id) return 'child';
  if (selected.parentId !== null && asset.parentId === selected.parentId) return 'sibling';
  return null;
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Plain words for what a machine is, and how it relates to the selected one. */
function describe(asset: Asset, role: Role, selected: Asset | null): string {
  if (role === 'sibling' && selected) {
    const parent = assets.find((candidate) => candidate.id === selected.parentId);
    return `${capitalize(asset.type)} on the same ${parent?.type ?? 'line'}`;
  }
  if (role === 'parent' && selected) return `Conveyor this ${selected.type} is part of`;
  if (role === 'child') return 'Part of this conveyor';
  return capitalize(asset.type);
}

function open(id: string) {
  window.location.hash = `#/asset/${id}`;
}

function MachineBody({ asset, role, selected }: { asset: Asset; role: Role; selected: Asset | null }) {
  const { alert, value } = machineStatus(asset, alerts, records);
  return (
    <>
      <span className="machine-top">
        <TypeIcon type={asset.type} />
        <span className="machine-id">{asset.id}</span>
        {alert ? (
          <span className="status-alert"><span className="pulse" /><AlertMark /></span>
        ) : (
          <span className="status-dot" />
        )}
      </span>
      <span className="machine-desc">{describe(asset, role, selected)}</span>
      {value && <span className={`machine-value${alert ? ' is-abnormal' : ''}`}>{value}</span>}
      {alert && <span className="machine-alert-text">{alert.title}</span>}
    </>
  );
}

function controlProps(asset: Asset, role: Role, selected: Asset | null) {
  const { alert, value } = machineStatus(asset, alerts, records);
  const parts = [asset.name, alert ? alert.title : 'no alert', value, role && role !== 'selected' ? describe(asset, role, selected) : null];
  return {
    type: 'button' as const,
    'aria-pressed': role === 'selected',
    'aria-label': parts.filter(Boolean).join(', '),
    onClick: () => open(asset.id),
  };
}

function Machine({ asset, selected, row }: { asset: Asset; selected: Asset | null; row?: boolean }) {
  const role = roleOf(asset, selected);
  const hasAlert = alerts.some((alert) => alert.assetId === asset.id);
  const classes = ['machine', role ? `is-${role}` : '', hasAlert ? 'has-alert' : '', row ? 'machine-row' : ''];
  return (
    <button className={classes.filter(Boolean).join(' ')} {...controlProps(asset, role, selected)}>
      <MachineBody asset={asset} role={role} selected={selected} />
    </button>
  );
}

function Assembly({ belt, selected }: { belt: Asset; selected: Asset | null }) {
  const stations = assets.filter((asset) => asset.parentId === belt.id);
  const role = roleOf(belt, selected);
  return (
    <div className={`assembly${role ? ' is-lit' : ''}`}>
      <div className="drive">
        {stations.map((station, index) => (
          <div className="drive-part" key={station.id}>
            {index > 0 && <span className="shaft"><span className="coupling" /></span>}
            <div className="station">
              <Machine asset={station} selected={selected} />
              <span className="stem" />
            </div>
          </div>
        ))}
      </div>
      <button className={`machine belt${role ? ` is-${role}` : ''}`} {...controlProps(belt, role, selected)}>
        <MachineBody asset={belt} role={role} selected={selected} />
        <span className="belt-track" aria-hidden="true" />
      </button>
    </div>
  );
}

export function PlantFloor({ selectedId }: { selectedId: string | null }) {
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const lines = [...new Set(assets.map((asset) => asset.line))].sort();
  const isParent = (asset: Asset) => assets.some((other) => other.parentId === asset.id);

  return (
    <div className="floor">
      {lines.map((line, index) => {
        const top = assets.filter((asset) => asset.line === line && asset.parentId === null);
        const assemblies = top.filter(isParent);
        return (
          <section
            className={`zone zone-${line}${assemblies.length === 0 ? ' zone-strip' : ''}`}
            key={line}
            aria-label={`Line ${line}`}
          >
            <h2 className="zone-name">Line {line}</h2>
            {index === lines.length - 1 && (
              <p className="legend">
                <span><span className="status-dot" /> No alert</span>
                <span><AlertMark /> Alert</span>
              </p>
            )}
            {assemblies.map((asset) => <Assembly belt={asset} selected={selected} key={asset.id} />)}
            {top.filter((asset) => !isParent(asset)).map((asset) => <Machine asset={asset} selected={selected} row key={asset.id} />)}
          </section>
        );
      })}
    </div>
  );
}
