import { EvidenceCard } from '../components/EvidenceCard';
import { PrimaryAction } from '../components/PrimaryAction';
import { alertFor } from '../data';
import type { EvidenceItem, RetrievalResult } from '../domain/types';

export function EvidenceScreen({ result }: { result: RetrievalResult }) {
  const { asset, parent, included, uncertain, excluded, possibleCauses } = result;
  const alert = alertFor(asset.id);
  const sourceHref = (id: string) => `#/asset/${asset.id}/evidence/source/${id}`;
  const rows = (items: EvidenceItem[]) =>
    items.map((item) => <EvidenceCard key={item.record.id} item={item} sourceHref={sourceHref(item.record.id)} />);

  return (
    <div className="panel">
      <nav className="path" aria-label="Equipment path">
        {parent && (
          <>
            <a href={`#/asset/${parent.id}`}>{parent.id}</a>
            <span aria-hidden="true"> &gt; </span>
          </>
        )}
        <a href={`#/asset/${asset.id}`} aria-current="page">{asset.id}</a>
      </nav>
      <h1>Evidence for {asset.id}</h1>
      {alert && <p className="alert-line"><strong>{alert.title}</strong> on {asset.id}</p>}

      {possibleCauses.length > 0 && (
        <section>
          <h2>Possible causes</h2>
          <p className="caution">Neither is confirmed. The inspection is needed to find out.</p>
          <ul className="causes">
            {possibleCauses.map((cause) => (
              <li key={cause.key}>
                <span className="pill pill-unconfirmed">Unconfirmed</span>
                {' '}{cause.label}
                {' '}<a href={sourceHref(cause.recordId)}>{cause.recordId}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Used as evidence ({included.length})</h2>
        {rows(included)}
      </section>

      {uncertain.length > 0 && (
        <section>
          <h2>Uncertain ({uncertain.length})</h2>
          <p className="muted">Not used as evidence and not cited in the plan.</p>
          {rows(uncertain)}
        </section>
      )}

      <section>
        <h2>Excluded ({excluded.length})</h2>
        {rows(excluded)}
      </section>

      <PrimaryAction label="Continue to inspection plan" href={`#/asset/${asset.id}/plan`} />
    </div>
  );
}
