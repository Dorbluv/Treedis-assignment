import { useEffect, useState, type KeyboardEvent } from 'react';
import { alerts, assets, records } from '../data';
import { machineStatus } from '../domain/floor';
import { followUp, type FollowUp } from '../domain/status';
import type { Alert, Asset } from '../domain/types';
import type { EscalationMap, PlanMap } from '../storage/plans';

type Point = [number, number, number];

const project = ([x, y, z]: Point): [number, number] => [430 + (x - y) * 0.866 * 36, 110 + (x + y) * 18 - z * 36];
const pts = (points: Point[]) => points.map((point) => project(point).map((n) => n.toFixed(1)).join(',')).join(' ');

interface Faces {
  top: string;
  left: string;
  right: string;
}

const NORMAL: Faces = { top: '#7FA3B8', left: '#4E7186', right: '#3B596C' };
const SELECTED: Faces = { top: '#FF8F7E', left: '#BF5A4C', right: '#94433A' };
const CONVEYOR: Faces = { top: '#46586B', left: '#2C3A49', right: '#223040' };

interface Geometry {
  x: [number, number];
  y: [number, number];
  z: number;
}

const GEOMETRY: Record<string, Geometry> = {
  'F-118': { x: [2.5, 5], y: [1, 2.6], z: 1.6 },
  'M-204': { x: [2.6, 4.6], y: [4.4, 6], z: 1.5 },
  'G-204': { x: [7, 9], y: [4.4, 6], z: 1.2 },
  'C-204': { x: [1.2, 12.8], y: [6.4, 7.8], z: 0.5 },
  'M-310': { x: [9.8, 11.8], y: [8.5, 10], z: 1.4 },
};

/** Painter's order, so nearer equipment draws over farther equipment. */
const DRAW_ORDER = ['F-118', 'M-204', 'G-204', 'C-204', 'M-310'];

const FULL_VIEW = { x: 60, y: 70, w: 840, h: 510 };

const PHONE_CROPS: Record<string, { x: number; y: number; w: number; h: number }> = {
  'M-204': { x: 150, y: 150, w: 500, h: 260 },
  'G-204': { x: 267, y: 175, w: 500, h: 260 },
  'C-204': { x: 180, y: 240, w: 500, h: 260 },
  'M-310': { x: 228, y: 300, w: 500, h: 260 },
  'F-118': { x: 241, y: 70, w: 500, h: 260 },
};

const LABEL_ANCHORS: Record<string, [number, number]> = {
  'F-118': [570, 92],
  'M-204': [150, 150],
  'G-204': [640, 214],
  'C-204': [700, 410],
  'M-310': [196, 500],
};

const PHONE_HOME_ANCHORS: Record<string, [number, number]> = {
  'F-118': [612, 74],
  'M-204': [64, 122],
  'G-204': [612, 196],
  'C-204': [612, 400],
  'M-310': [64, 462],
};

function useIsPhone(): boolean {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const query = window.matchMedia('(max-width: 767.98px)');
    const update = () => setIsPhone(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return isPhone;
}

function Box({ g, faces, outline }: { g: Geometry; faces: Faces; outline?: string }) {
  const [x0, x1] = g.x;
  const [y0, y1] = g.y;
  const stroke = outline ? { stroke: outline, strokeWidth: 2 } : {};
  return (
    <>
      <polygon points={pts([[x0, y0, g.z], [x1, y0, g.z], [x1, y1, g.z], [x0, y1, g.z]])} fill={faces.top} {...stroke} />
      <polygon points={pts([[x0, y1, g.z], [x1, y1, g.z], [x1, y1, 0], [x0, y1, 0]])} fill={faces.left} {...stroke} />
      <polygon points={pts([[x1, y0, g.z], [x1, y1, g.z], [x1, y1, 0], [x1, y0, 0]])} fill={faces.right} {...stroke} />
    </>
  );
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

function isConnected(asset: Asset, selected: Asset | null): boolean {
  if (!selected || asset.id === selected.id) return false;
  return asset.id === selected.parentId || asset.parentId === selected.id || (selected.parentId !== null && asset.parentId === selected.parentId);
}

interface MachineState {
  asset: Asset;
  alert: Alert | null;
  value: string | null;
  next: FollowUp | null;
  label: string;
}

function BeltMarks({ g }: { g: Geometry }) {
  const [x0, x1] = g.x;
  const [y0, y1] = g.y;
  const marks = [];
  for (let x = x0; x <= x1 + 1; x += 1) marks.push(x);
  return (
    <>
      <clipPath id="belt-clip">
        <polygon points={pts([[x0, y0, g.z], [x1, y0, g.z], [x1, y1, g.z], [x0, y1, g.z]])} />
      </clipPath>
      <g clipPath="url(#belt-clip)">
        <g className="belt-marks">
          {marks.map((x) => {
            const [ax, ay] = project([x - 1, y0, g.z]);
            const [bx, by] = project([x - 1, y1, g.z]);
            return <line key={x} x1={ax} y1={ay} x2={bx} y2={by} />;
          })}
        </g>
      </g>
    </>
  );
}

function FloorLabel({
  state,
  anchor,
  scale,
  view,
  isNew,
}: {
  state: MachineState;
  anchor: [number, number];
  scale: number;
  view: { x: number; y: number; w: number; h: number };
  isNew: boolean;
}) {
  const { asset, alert, value, next } = state;
  const g = GEOMETRY[asset.id];
  const stateWord = next ? (next.kind === 'escalated' ? 'Escalated' : 'Inspected') : alert ? 'Alert' : 'No alert';
  const line2 = [value, stateWord].filter(Boolean).join(', ');
  const width = (Math.max(line2.length * 7.1, asset.id.length * 9 + 22) + 22) * scale;
  const height = 46 * scale;
  const x = Math.min(Math.max(anchor[0], view.x + 4), view.x + view.w - width - 4);
  const y = Math.min(Math.max(anchor[1], view.y + 4), view.y + view.h - height - 4);
  const [tx, ty] = project([(g.x[0] + g.x[1]) / 2, (g.y[0] + g.y[1]) / 2, g.z]);
  const edgeX = tx < x ? x : tx > x + width ? x + width : tx;
  const edgeY = ty < y ? y : ty > y + height ? y + height : ty;

  return (
    <g className="floor-label" onClick={() => open(asset.id)} aria-hidden="true">
      <line x1={edgeX} y1={edgeY} x2={tx} y2={ty} className="leader" />
      <g transform={`translate(${x} ${y}) scale(${scale})`}>
        <rect width={width / scale} height={46} rx="7" className="label-box" />
        {alert && !next && <path d="M18 8l8 14h-16Z" className="label-triangle" />}
        {next && <circle cx="18" cy="16" r="6" className={`label-${next.kind}${isNew ? ' is-new' : ''}`} />}
        <text x={alert ? 32 : 11} y="21" className="label-id">{asset.id}</text>
        <text x="11" y="38" className="label-state">{line2}</text>
      </g>
    </g>
  );
}

export function IsoFloor({
  selectedId,
  plans,
  escalations,
  animate,
}: {
  selectedId: string | null;
  plans: PlanMap;
  escalations: EscalationMap;
  animate: boolean;
}) {
  const isPhone = useIsPhone();
  const selected = assets.find((asset) => asset.id === selectedId) ?? null;
  const cropped = isPhone && selected;
  const view = cropped ? PHONE_CROPS[selected.id] : FULL_VIEW;
  const scale = isPhone && !selected ? 1.75 : 1;

  const states: Record<string, MachineState> = {};
  for (const asset of assets) {
    const { alert, value } = machineStatus(asset, alerts, records);
    const next = alert ? followUp(plans[asset.id]?.finding, escalations[asset.id], records) : null;
    const status = next ? next.text : alert ? alert.title : 'No alert';
    states[asset.id] = {
      asset,
      alert,
      value,
      next,
      label: [asset.name, status, value, next ? 'reading still above limit' : null].filter(Boolean).join(', '),
    };
  }

  const shaftA = project([4.6, 5.2, 0.8]);
  const shaftB = project([7, 5.2, 0.8]);
  const gridLines = [];
  for (let x = 0; x <= 14; x += 1) gridLines.push([[x, 0, 0], [x, 11, 0]] as [Point, Point]);
  for (let y = 0; y <= 11; y += 1) gridLines.push([[0, y, 0], [14, y, 0]] as [Point, Point]);

  // On open floor, clear of machines and their labels.
  const line1Label = project([11.5, 1.6, 0]);
  const line2Label = project([0.9, 9.6, 0]);
  // A cropped view must not cut a zone name in half.
  const inView = ([x, y]: [number, number]) =>
    x >= view.x + 4 && x + 48 <= view.x + view.w && y - 14 >= view.y && y <= view.y + view.h;

  function machine(id: string) {
    const state = states[id];
    const g = GEOMETRY[id];
    const isSelected = selectedId === id;
    const connected = isConnected(state.asset, selected);
    const base = id === 'C-204' ? CONVEYOR : NORMAL;
    const faces = isSelected ? SELECTED : base;
    const outline = connected ? '#EAF1F6' : id === 'C-204' && !isSelected ? '#75899C' : undefined;
    return (
      <g
        key={id}
        className={`iso-machine${isSelected ? ' is-selected' : ''}${connected ? ' is-connected' : ''}`}
        role="button"
        tabIndex={0}
        aria-label={state.label}
        aria-pressed={isSelected}
        onClick={() => open(id)}
        onKeyDown={(event) => onKey(event, id)}
      >
        <Box g={g} faces={faces} outline={outline} />
        {id === 'C-204' && <BeltMarks g={g} />}
      </g>
    );
  }

  const labelIds = cropped
    ? DRAW_ORDER.filter((id) => id === selected.id || isConnected(states[id].asset, selected))
    : DRAW_ORDER;
  const anchors = isPhone && !selected ? PHONE_HOME_ANCHORS : LABEL_ANCHORS;

  return (
    <svg
      className="iso-floor"
      viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
      role="group"
      aria-label="Plant floor. Select a machine to open it."
      preserveAspectRatio="xMidYMid meet"
    >
      <polygon points={pts([[0, 0, 0], [14, 0, 0], [14, 11, 0], [0, 11, 0]])} className="floor-base" />
      {gridLines.map(([a, b], index) => {
        const [ax, ay] = project(a);
        const [bx, by] = project(b);
        return <line key={index} x1={ax} y1={ay} x2={bx} y2={by} className="floor-grid" />;
      })}
      <polygon points={pts([[0.5, 0.5, 0], [13.5, 0.5, 0], [13.5, 3.2, 0], [0.5, 3.2, 0]])} className="zone-1" />
      <polygon points={pts([[0.5, 3.8, 0], [13.5, 3.8, 0], [13.5, 10.5, 0], [0.5, 10.5, 0]])} className="zone-2" />
      {inView(line1Label) && <text x={line1Label[0]} y={line1Label[1]} className="zone-label zone-label-1">Line 1</text>}
      {inView(line2Label) && <text x={line2Label[0]} y={line2Label[1]} className="zone-label zone-label-2">Line 2</text>}

      {machine('F-118')}
      {machine('M-204')}
      <line x1={shaftA[0]} y1={shaftA[1]} x2={shaftB[0]} y2={shaftB[1]} className="shaft" />
      {machine('G-204')}
      {machine('C-204')}
      {machine('M-310')}

      {labelIds.map((id) => (
        <FloorLabel
          key={id}
          state={states[id]}
          anchor={anchors[id]}
          scale={scale}
          view={view}
          isNew={animate && selectedId === id}
        />
      ))}
    </svg>
  );
}
