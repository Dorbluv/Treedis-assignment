import { useEffect, useMemo, useState } from 'react';
import { alertFor, assets, dataset } from './data';
import { retrieve } from './domain/retrieve';
import { Banner } from './components/Banner';
import { PlantMap } from './components/PlantMap';
import { LayoutScreen } from './screens/LayoutScreen';
import { EvidenceScreen } from './screens/EvidenceScreen';
import { PlanScreen } from './screens/PlanScreen';
import { SourceScreen } from './screens/SourceScreen';

/** Gate 1 covers the M-204 flow only. */
const EVIDENCE_ASSET = 'M-204';

type ParentScreen = 'evidence' | 'plan';

type Route =
  | { name: 'map'; assetId: null }
  | { name: 'selected'; assetId: string }
  | { name: ParentScreen; assetId: string }
  | { name: 'source'; assetId: string; parent: ParentScreen; recordId: string };

function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean);
  if (parts[0] !== 'asset' || !parts[1]) return { name: 'map', assetId: null };
  const assetId = parts[1];
  const screen = parts[2];
  if (screen !== 'evidence' && screen !== 'plan') return { name: 'selected', assetId };
  if (parts[3] === 'source' && parts[4]) {
    return { name: 'source', assetId, parent: screen, recordId: parts[4] };
  }
  return { name: screen, assetId };
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

export function App() {
  const route = useRoute();
  const asset = assets.find((candidate) => candidate.id === route.assetId) ?? null;
  const result = useMemo(
    () => (asset?.id === EVIDENCE_ASSET ? retrieve(asset.id, alertFor(asset.id), dataset) : null),
    [asset],
  );

  // Without an evidence view, deeper routes fall back to the plant layout.
  const view = !asset ? 'map' : !result ? 'selected' : route.name;

  let panel;
  if (!result || !asset || view === 'map' || view === 'selected') {
    panel = <LayoutScreen asset={asset} hasEvidenceView={Boolean(result)} />;
  } else if (route.name === 'source') {
    panel = (
      <>
        <div className="under-drawer">
          {route.parent === 'plan' ? <PlanScreen key={asset.id} result={result} /> : <EvidenceScreen result={result} />}
        </div>
        <div className="drawer">
          <SourceScreen result={result} recordId={route.recordId} backHref={`#/asset/${asset.id}/${route.parent}`} />
        </div>
      </>
    );
  } else if (view === 'plan') {
    panel = <PlanScreen key={asset.id} result={result} />;
  } else {
    panel = <EvidenceScreen result={result} />;
  }

  return (
    <>
      <Banner />
      <header className="app-header">
        <a href="#/" className="app-title">Maintenance Copilot</a>
      </header>
      <main className="shell" data-view={view}>
        <section className="map-col" aria-label="Plant layout">
          <PlantMap selectedId={asset?.id ?? null} />
        </section>
        <section className="panel-col">{panel}</section>
      </main>
    </>
  );
}
