import { alerts, assets, records } from '../data';
import { machineStatus } from '../domain/floor';
import { followUp, type FollowUp } from '../domain/status';
import type { Asset } from '../domain/types';
import type { EscalationMap, PlanMap } from '../storage/plans';
import { AlertMark, TypeIcon } from './Icons';

type Role = 'selected' | 'parent' | 'sibling' | 'child' | null;

interface FloorState {
  selected: Asset | null;
  plans: PlanMap;
  escalations: EscalationMap;
  animateInspected: boolean;
}

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

/** A finding or escalation moves an alert along. It does not clear it. */
function followUpOf(asset: Asset, state: FloorState, hasAlert: boolean): FollowUp | null {
  return hasAlert ? followUp(state.plans[asset.id]?.finding, state.escalations[asset.id], records) : null;
}

function MachineBody({ asset, role, state }: { asset: Asset; role: Role; state: FloorState }) {
  const { alert, value } = machineStatus(asset, alerts, records);
  const next = followUpOf(asset, state, Boolean(alert));
  const isNew = next && state.animateInspected && state.selected?.id === asset.id ? ' is-new' : '';
  return (
    <>
      <span className="machine-top">
        <TypeIcon type={asset.type} />
        <span className="machine-id">{asset.id}</span>
        {next ? (
          <span className={`status-${next.kind}${isNew}`} />
        ) : alert ? (
          <span className="status-alert"><span className="pulse" /><AlertMark /></span>
        ) : (
          <span className="status-dot" />
        )}
      </span>
      <span className="machine-desc">{describe(asset, role, state.selected)}</span>
      {value && (
        <span className={`machine-value${alert ? ' is-abnormal' : ''}`}>
          {next && <AlertMark />}
          {value}
        </span>
      )}
      {next ? (
        <span className={`machine-inspected-text${isNew}`}>{next.text}</span>
      ) : (
        alert && <span className="machine-alert-text">{alert.title}</span>
      )}
    </>
  );
}

function controlProps(asset: Asset, role: Role, state: FloorState) {
  const { alert, value } = machineStatus(asset, alerts, records);
  const next = followUpOf(asset, state, Boolean(alert));
  const statusText = next ? `${next.text}, readings still above limit` : alert ? alert.title : 'no alert';
  const parts = [asset.name, statusText, value, role && role !== 'selected' ? describe(asset, role, state.selected) : null];
  return {
    type: 'button' as const,
    'aria-pressed': role === 'selected',
    'aria-label': parts.filter(Boolean).join(', '),
    onClick: () => open(asset.id),
  };
}

function Machine({ asset, state, row }: { asset: Asset; state: FloorState; row?: boolean }) {
  const role = roleOf(asset, state.selected);
  const hasAlert = alerts.some((alert) => alert.assetId === asset.id);
  const classes = ['machine', role ? `is-${role}` : '', hasAlert ? 'has-alert' : '', row ? 'machine-row' : ''];
  return (
    <button className={classes.filter(Boolean).join(' ')} {...controlProps(asset, role, state)}>
      <MachineBody asset={asset} role={role} state={state} />
    </button>
  );
}

function Assembly({ belt, state }: { belt: Asset; state: FloorState }) {
  const stations = assets.filter((asset) => asset.parentId === belt.id);
  const role = roleOf(belt, state.selected);
  return (
    <div className={`assembly${role ? ' is-lit' : ''}`}>
      <div className="drive">
        {stations.map((station, index) => (
          <div className="drive-part" key={station.id}>
            {index > 0 && <span className="shaft"><span className="coupling" /></span>}
            <div className="station">
              <Machine asset={station} state={state} />
              <span className="stem" />
            </div>
          </div>
        ))}
      </div>
      <button className={`machine belt${role ? ` is-${role}` : ''}`} {...controlProps(belt, role, state)}>
        <MachineBody asset={belt} role={role} state={state} />
        <span className="belt-track" aria-hidden="true" />
      </button>
    </div>
  );
}

export function PlantFloor({
  selectedId,
  plans,
  escalations,
  animateInspected,
}: {
  selectedId: string | null;
  plans: PlanMap;
  escalations: EscalationMap;
  animateInspected: boolean;
}) {
  const state: FloorState = {
    selected: assets.find((asset) => asset.id === selectedId) ?? null,
    plans,
    escalations,
    animateInspected,
  };
  const anyEscalated = Object.keys(escalations).length > 0;
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
            <div className="zone-head">
              <h2 className="zone-name">Line {line}</h2>
              {index === lines.length - 1 && (
                <p className="legend">
                  <span><span className="status-dot" /> No alert</span>
                  <span><AlertMark /> Alert</span>
                  <span><span className="status-inspected" /> Inspected</span>
                  {anyEscalated && <span><span className="status-escalated" /> Escalated</span>}
                </p>
              )}
            </div>
            {assemblies.map((asset) => <Assembly belt={asset} state={state} key={asset.id} />)}
            {top.filter((asset) => !isParent(asset)).map((asset) => <Machine asset={asset} state={state} row key={asset.id} />)}
          </section>
        );
      })}
    </div>
  );
}
