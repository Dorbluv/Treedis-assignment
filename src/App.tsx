import { useEffect, useMemo, useState } from 'react';
import { alertFor, assets, dataset } from './data';
import { retrieve } from './domain/retrieve';
import type { SavedPlan } from './domain/types';
import { Banner } from './components/Banner';
import { MachineHeader } from './components/MachineHeader';
import { PlantFloor } from './components/PlantFloor';
import { Progress, type ProgressStep } from './components/Progress';
import { clearPlans, hasSavedPlans, loadPlan } from './storage/plans';
import { DoneScreen } from './screens/DoneScreen';
import { EvidenceScreen } from './screens/EvidenceScreen';
import { FindingScreen } from './screens/FindingScreen';
import { LayoutScreen } from './screens/LayoutScreen';
import { PlanScreen } from './screens/PlanScreen';
import { SourceScreen } from './screens/SourceScreen';

type FlowScreen = 'evidence' | 'plan' | 'finding' | 'done';
type SourceParent = 'evidence' | 'plan' | 'done';

type Route =
  | { name: 'map'; assetId: null }
  | { name: 'selected'; assetId: string }
  | { name: FlowScreen; assetId: string }
  | { name: 'source'; assetId: string; parent: SourceParent; recordId: string; stepId?: string };

const FLOW_SCREENS: string[] = ['evidence', 'plan', 'finding', 'done'];
const SOURCE_PARENTS: string[] = ['evidence', 'plan', 'done'];

const BACK_LABEL: Record<SourceParent, string> = {
  evidence: 'Back to evidence',
  plan: 'Back to plan',
  done: 'Back to summary',
};

const STEP_FOR: Record<SourceParent, ProgressStep> = {
  evidence: 'evidence',
  plan: 'plan',
  done: 'complete',
};

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'asset' || !parts[1]) return { name: 'map', assetId: null };
  const assetId = parts[1];
  const screen = parts[2];
  if (!FLOW_SCREENS.includes(screen)) return { name: 'selected', assetId };
  if (parts[3] === 'source' && parts[4] && SOURCE_PARENTS.includes(screen)) {
    return {
      name: 'source',
      assetId,
      parent: screen as SourceParent,
      recordId: parts[4],
      stepId: parts[5] === 'step' ? parts[6] : undefined,
    };
  }
  return { name: screen as FlowScreen, assetId };
}

function useRoute(): [Route, string] {
  const [hash, setHash] = useState(window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [useMemo(() => parseHash(hash), [hash]), hash];
}

function readPlan(assetId: string): SavedPlan | null {
  try {
    return loadPlan(assetId);
  } catch {
    return null;
  }
}

function anySavedPlans(): boolean {
  try {
    return hasSavedPlans();
  } catch {
    return false;
  }
}

export function App() {
  const [route, hash] = useRoute();
  const [resetCount, setResetCount] = useState(0);
  const asset = assets.find((candidate) => candidate.id === route.assetId) ?? null;
  const result = useMemo(
    () => (asset ? retrieve(asset.id, alertFor(asset.id), dataset) : null),
    [asset],
  );
  // Read on every render: each route change re-renders, so this is never stale.
  const saved = result ? readPlan(result.asset.id) : null;

  function resetDemo() {
    try {
      clearPlans();
    } catch {
      // Storage is unavailable, so there is nothing saved to clear.
    }
    window.location.hash = '#/';
    setResetCount((count) => count + 1);
  }

  // A deeper route falls back to the furthest step the saved state allows.
  let view: Route['name'] = !asset ? 'map' : !result ? 'selected' : route.name;
  if (view === 'finding' && !saved) view = 'plan';
  if (view === 'done' && !saved?.finding) view = saved ? 'finding' : 'plan';

  let step: ProgressStep = 'machine';
  let panel;
  if (!result || !asset || view === 'map' || view === 'selected') {
    panel = (
      <LayoutScreen
        asset={asset}
        showReset={!asset && anySavedPlans()}
        onReset={resetDemo}
      />
    );
  } else if (view === 'source' && route.name === 'source') {
    step = STEP_FOR[route.parent];
    panel = (
      <SourceScreen
        result={result}
        recordId={route.recordId}
        stepId={route.stepId}
        backHref={`#/asset/${asset.id}/${route.parent}`}
        backLabel={BACK_LABEL[route.parent]}
      />
    );
  } else if (view === 'done' && saved) {
    step = 'complete';
    panel = <DoneScreen result={result} saved={saved} onReset={resetDemo} />;
  } else if (view === 'finding' && saved) {
    step = 'finding';
    panel = <FindingScreen result={result} saved={saved} />;
  } else if (view === 'plan') {
    step = 'plan';
    panel = <PlanScreen result={result} saved={saved} />;
  } else {
    step = 'evidence';
    panel = <EvidenceScreen result={result} />;
  }

  const onFloor = view === 'map' || view === 'selected';

  return (
    <div className="app" data-view={view} data-resets={resetCount}>
      <Banner />
      <header className="topbar">
        <a href="#/" className="wordmark">Maintenance Copilot</a>
        <Progress current={step} />
      </header>
      <main className="workspace">
        <section className={`floor-col${onFloor ? ' is-floor-step' : ''}`} aria-label="Plant floor">
          <PlantFloor selectedId={asset?.id ?? null} />
        </section>
        <section className="panel-col" key={hash}>
          {result && !onFloor && <MachineHeader result={result} />}
          {panel}
        </section>
      </main>
    </div>
  );
}
