import { EvidenceCard } from '../components/EvidenceCard';
import { alertFor } from '../data';
import type { EvidenceItem, RetrievalResult } from '../domain/types';

export function EvidenceScreen({ result }: { result: RetrievalResult }) {
  const { asset, parent, included, uncertain, excluded, possibleCauses } = result;
  const alert = alertFor(asset.id);
  const sourceHref = (id: string) => `#/asset/${asset.id}/evidence/source/${id}`;
  const cards = (items: EvidenceItem[]) =>
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

      <section>
        <h2>Included</h2>
        {cards(included)}
      </section>

      {uncertain.length > 0 && (
        <section>
          <h2>Uncertain</h2>
          <p className="muted">Not used as evidence and not cited in the plan.</p>
          {cards(uncertain)}
        </section>
      )}

      {possibleCauses.length > 0 && (
        <section>
          <h2>Possible causes</h2>
          <p className="caution">Neither is confirmed. The inspection is needed to find out.</p>
          <ul className="causes">
            {possibleCauses.map((cause) => (
              <li key={cause.key}>
                {cause.label}
                {' '}<a href={sourceHref(cause.recordId)}>{cause.recordId}</a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2>Excluded</h2>
        {cards(excluded)}
      </section>

      <div className="action-bar">
        <a className="button" href={`#/asset/${asset.id}/plan`}>Review and save inspection plan</a>
      </div>
    </div>
  );
}
