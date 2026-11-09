import type { KeyboardEvent, ReactNode } from 'react';
import { alerts, assets } from '../data';
import type { Asset } from '../domain/types';

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

/** Plain words for how a piece of equipment relates to the selected one. */
function stationLines(asset: Asset, role: Role, selected: Asset | null): string[] {
  if (role === 'sibling' && selected) {
    const parent = assets.find((candidate) => candidate.id === selected.parentId);
    return [`${capitalize(asset.type)} on the`, `same ${parent?.type ?? 'line'}`];
  }
  if (role === 'child') return ['Part of this', 'conveyor'];
  return [capitalize(asset.type)];
}

function open(id: string) {
  window.location.hash = `#/asset/${id}`;
}

function onKey(event: KeyboardEvent, id: string) {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    open(id);
  }
}

function Control({ asset, role, label, children }: { asset: Asset; role: Role; label: string; children: ReactNode }) {
  return (
    <g
      className={`floor-asset${role ? ` is-${role}` : ''}`}
      role="button"
      tabIndex={0}
      aria-label={label}
      aria-pressed={role === 'selected'}
      onClick={() => open(asset.id)}
      onKeyDown={(event) => onKey(event, asset.id)}
    >
      {children}
    </g>
  );
}

const Y_ALERT_TEXT = 126;

export function PlantFloor({ selectedId }: { selectedId: string | null }) {
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const belt = assets.find((asset) => assets.some((other) => other.parentId === asset.id));
  const stations = assets.filter((asset) => asset.id !== belt?.id);
  const onBelt = stations
    .filter((asset) => asset.parentId === belt?.id)
    .sort((a, b) => a.mapPosition.x - b.mapPosition.x);
  const beltRole = belt ? roleOf(belt, selected) : null;
  const pathLit = beltRole !== null;

  return (
    <svg className="plant-floor" viewBox="0 0 380 294" role="group" aria-label="Plant floor. Select equipment to see how it connects.">
      <text x="14" y="20" className="floor-zone">Line 1</text>
      <text x="206" y="20" className="floor-zone">Line 2</text>
      <text x="14" y="112" className="floor-zone">Line 2</text>

      {belt && (() => {
        const { x, y, width, height } = belt.mapPosition;
        const radius = height / 2;
        const middle = y + radius;
        const chevrons = [];
        for (let at = x + 56; at < x + width - 40; at += 34) chevrons.push(at);
        const text =
          beltRole === 'parent' && selected
            ? `${belt.id} conveyor this ${selected.type} is part of`
            : `${belt.id} conveyor`;
        return (
          <Control asset={belt} role={beltRole} label={`${belt.name}. ${text}`}>
            <rect className="floor-hit" x={x} y={y - 4} width={width} height={height + 8} rx={radius + 4} />
            <rect className="belt" x={x} y={y} width={width} height={height} rx={radius} />
            <circle className="roller" cx={x + radius} cy={middle} r={radius - 8} />
            <circle className="roller" cx={x + width - radius} cy={middle} r={radius - 8} />
            {chevrons.map((at) => (
              <path key={at} className="chevron" d={`M${at} ${middle + 8}l5 4 -5 4`} />
            ))}
            <text x={x + 52} y={middle - 3} className="belt-label">{text}</text>
          </Control>
        );
      })()}

      {/* Each drive station stands on the belt. */}
      {belt && onBelt.map((asset) => {
        const cx = asset.mapPosition.x + asset.mapPosition.width / 2;
        const bottom = asset.mapPosition.y + asset.mapPosition.height;
        return <line key={asset.id} className={`stem${pathLit ? ' is-lit' : ''}`} x1={cx} x2={cx} y1={bottom} y2={belt.mapPosition.y} />;
      })}

      {/* The drive shaft joins the motor to the gearbox. */}
      {onBelt.length === 2 && (
        <g className={`shaft${pathLit ? ' is-lit' : ''}`}>
          <line
            x1={onBelt[0].mapPosition.x + onBelt[0].mapPosition.width}
            x2={onBelt[1].mapPosition.x}
            y1={onBelt[0].mapPosition.y + onBelt[0].mapPosition.height / 2}
            y2={onBelt[0].mapPosition.y + onBelt[0].mapPosition.height / 2}
          />
          <rect
            x={(onBelt[0].mapPosition.x + onBelt[0].mapPosition.width + onBelt[1].mapPosition.x) / 2 - 5}
            y={onBelt[0].mapPosition.y + onBelt[0].mapPosition.height / 2 - 8}
            width="10"
            height="16"
            rx="2"
          />
        </g>
      )}

      {stations.map((asset) => {
        const { x, y, width, height } = asset.mapPosition;
        const role = roleOf(asset, selected);
        const lines = stationLines(asset, role, selected);
        const nameY = lines.length > 1 ? y + 21 : y + height / 2 - 2;
        return (
          <Control asset={asset} role={role} label={`${asset.name}. ${lines.join(' ')}`} key={asset.id}>
            <rect className="station" x={x} y={y} width={width} height={height} rx="6" />
            <text x={x + 12} y={nameY} className="floor-name">{asset.id}</text>
            {lines.map((line, index) => (
              <text key={line} x={x + 12} y={nameY + 18 + index * 15} className="floor-detail">{line}</text>
            ))}
          </Control>
        );
      })}

      {alerts.map((alert) => {
        const asset = assets.find((candidate) => candidate.id === alert.assetId);
        if (!asset) return null;
        const cx = asset.mapPosition.x + 46;
        return (
          <g key={alert.id} className="floor-alert">
            <line x1={cx} x2={cx} y1={Y_ALERT_TEXT + 6} y2={asset.mapPosition.y} />
            <circle className="pulse" cx={cx} cy={Y_ALERT_TEXT - 4} r="11" />
            <path d={`M${cx} ${Y_ALERT_TEXT - 13}l9 16h-18Z`} className="alert-shape" />
            <rect x={cx - 1} y={Y_ALERT_TEXT - 7} width="2" height="6" className="alert-bang" />
            <rect x={cx - 1} y={Y_ALERT_TEXT} width="2" height="2" className="alert-bang" />
            <text x={cx + 16} y={Y_ALERT_TEXT + 1} className="floor-alert-text">{alert.title}</text>
          </g>
        );
      })}
    </svg>
  );
}
