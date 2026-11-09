import { useEffect, useMemo, useRef, useState } from 'react';
import { alertFor, assets, dataset } from './data';
import { retrieve } from './domain/retrieve';
import type { SavedPlan } from './domain/types';
import { resolveTab, tabAvailability, type WorkspaceTab } from './domain/workspace';
import { AlertPanel } from './components/AlertPanel';
import { FloorColumn } from './components/FloorColumn';
import { HomePanel } from './components/HomePanel';
import { MachinePanel } from './components/MachinePanel';
import { TopBar } from './components/TopBar';
import { pageTitle } from './screens/format';
import {
  clearPlans,
  hasSavedPlans,
  loadAllPlans,
  loadEscalations,
  loadPlan,
  type EscalationMap,
  type PlanMap,
} from './storage/plans';

interface Route {
  assetId: string | null;
  tab: WorkspaceTab;
  sourceId: string | null;
  stepId: string | null;
}

const TABS: string[] = ['investigate', 'plan', 'finding'];

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'asset' || !parts[1]) return { assetId: null, tab: 'investigate', sourceId: null, stepId: null };
  const tab = (TABS.includes(parts[2]) ? parts[2] : 'investigate') as WorkspaceTab;
  return {
    assetId: parts[1],
    tab,
    sourceId: parts[3] === 'source' ? parts[4] ?? null : null,
    stepId: parts[3] === 'step' ? parts[4] ?? null : null,
  };
}

function useRoute(): Route {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return useMemo(() => parseHash(hash), [hash]);
}

function safely<T>(read: () => T, fallback: T): T {
  try {
    return read();
  } catch {
    return fallback;
  }
}

export function App() {
  const route = useRoute();
  const [, setTick] = useState(0);
  const refresh = () => setTick((count) => count + 1);

  const asset = assets.find((candidate) => candidate.id === route.assetId) ?? null;
  const alert = asset ? alertFor(asset.id) : null;
  const result = useMemo(() => (asset ? retrieve(asset.id, alertFor(asset.id), dataset) : null), [asset]);

  // Read on every render: each route change or save re-renders, so this is never stale.
  const plans: PlanMap = safely(loadAllPlans, {});
  const escalations: EscalationMap = safely(loadEscalations, {});
  const saved: SavedPlan | null = asset ? safely(() => loadPlan(asset.id), null) : null;
  const escalation = asset ? escalations[asset.id] : undefined;
  const showReset = safely(hasSavedPlans, false);

  const available = tabAvailability(Boolean(result?.applicableSop), Boolean(saved));
  const tab = resolveTab(route.tab, available);

  function resetDemo() {
    safely(() => clearPlans(), undefined);
    window.location.hash = '#/';
    refresh();
  }

  // Tell assistive technology where the user is. Focus moves only when the machine changes.
  const assetId = asset?.id ?? null;
  const lastAsset = useRef(assetId);
  const view = route.sourceId ? 'source' : tab;
  useEffect(() => {
    document.title = pageTitle(view, assetId);
    if (lastAsset.current === assetId) return;
    lastAsset.current = assetId;
    document.querySelector<HTMLElement>('.panel-head h1')?.focus({ preventScroll: true });
  }, [view, assetId]);

  let panel;
  if (!asset || !result) panel = <HomePanel plans={plans} escalations={escalations} />;
  else if (!alert) panel = <MachinePanel key={asset.id} result={result} sourceId={route.sourceId} />;
  else {
    panel = (
      <AlertPanel
        key={asset.id}
        result={result}
        saved={saved}
        escalation={escalation}
        tab={tab}
        stepId={route.stepId}
        sourceId={route.sourceId}
        refresh={refresh}
      />
    );
  }

  const justMoved = Boolean(alert && (saved?.finding || escalation) && tab === 'investigate');

  return (
    <div className="app" data-state={asset ? 'machine' : 'home'}>
      <TopBar currentId={assetId} plans={plans} escalations={escalations} />
      <main className="workspace">
        {panel}
        <FloorColumn
          selectedId={assetId}
          plans={plans}
          escalations={escalations}
          animate={justMoved}
          showReset={showReset}
          onReset={resetDemo}
        />
      </main>
    </div>
  );
}
