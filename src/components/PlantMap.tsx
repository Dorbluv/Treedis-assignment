import type { KeyboardEvent } from 'react';
import { alerts, assets } from '../data';
import type { Asset } from '../domain/types';

type Role = 'selected' | 'parent' | 'sibling' | 'child' | null;

const ROLE_TEXT: Record<Exclude<Role, null>, string> = {
  selected: 'Selected',
  parent: 'Parent conveyor',
  sibling: 'Sibling component',
  child: 'Part of this conveyor',
};

function roleOf(asset: Asset, selected: Asset | null): Role {
  if (!selected) return null;
  if (asset.id === selected.id) return 'selected';
  if (asset.id === selected.parentId) return 'parent';
  if (asset.parentId === selected.id) return 'child';
  if (selected.parentId !== null && asset.parentId === selected.parentId) return 'sibling';
  return null;
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

/** Where a component's connector meets its parent's title bar. */
function connector(asset: Asset, parent: Asset) {
  const x = asset.mapPosition.x + asset.mapPosition.width / 2;
  return { x, y1: asset.mapPosition.y, y2: parent.mapPosition.y + 30 };
}

export function PlantMap({ selectedId }: { selectedId: string | null }) {
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const parent = selected?.parentId ? assets.find((asset) => asset.id === selected.parentId) ?? null : null;
  const related = selected
    ? assets.filter((asset) => {
        const role = roleOf(asset, selected);
        return role === 'selected' || role === 'sibling' || role === 'child';
      })
    : [];
  const bar = parent ?? (selected && related.length > 1 ? selected : null);
  const members = bar ? related.filter((asset) => asset.id !== bar.id) : [];
  const ordered = [...assets].sort((a, b) => (a.parentId === null ? 0 : 1) - (b.parentId === null ? 0 : 1));

  return (
    <svg className="plant-map" viewBox="0 0 360 390" role="group" aria-label="Plant layout. Select equipment to see how it is related.">
      <text x="20" y="26" className="map-line">Line 1</text>
      <text x="20" y="136" className="map-line">Line 2</text>

      {ordered.map((asset) => {
        const { x, y, width, height } = asset.mapPosition;
        const role = roleOf(asset, selected);
        const hasAlert = alerts.some((alert) => alert.assetId === asset.id);
        const isContainer = assets.some((other) => other.parentId === asset.id);
        const detail = role && role !== 'selected' ? ROLE_TEXT[role] : asset.type;
        const label = `${asset.name}${hasAlert ? ', vibration alert' : ''}${role && role !== 'selected' ? `, ${ROLE_TEXT[role]}` : ''}`;
        return (
          <g
            key={asset.id}
            className={`map-asset${role ? ` is-${role}` : ''}${hasAlert ? ' has-alert' : ''}`}
            role="button"
            tabIndex={0}
            aria-label={label}
            aria-pressed={role === 'selected'}
            onClick={() => open(asset.id)}
            onKeyDown={(event) => onKey(event, asset.id)}
          >
            <rect x={x} y={y} width={width} height={height} rx="6" />
            {isContainer ? (
              <text x={x + 12} y={y + 22} className="map-name">
                {asset.id} <tspan className="map-detail">{detail}</tspan>
              </text>
            ) : (
              <>
                <text x={x + 12} y={y + 26} className="map-name">{asset.id}</text>
                <text x={x + 12} y={y + 46} className={hasAlert ? 'map-alert' : 'map-detail'}>
                  {hasAlert ? '! Vibration alert' : detail}
                </text>
              </>
            )}
          </g>
        );
      })}

      {bar && members.map((asset) => {
        const line = connector(asset, bar);
        return <line key={asset.id} x1={line.x} x2={line.x} y1={line.y1} y2={line.y2} className="map-link" />;
      })}
    </svg>
  );
}
