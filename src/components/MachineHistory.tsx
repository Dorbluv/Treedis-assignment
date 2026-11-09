import { localDate, outcomeOptions, shortDate } from '../screens/format';
import type { Finding, RetrievalResult } from '../domain/types';

/** A technician finding: what was observed in this inspection. It is never evidence. */
export function FindingEntry({ result, finding }: { result: RetrievalResult; finding: Finding }) {
  const outcome = outcomeOptions(result).find((option) => option.key === finding.outcome);
  // "Neither" only makes sense next to the cause buttons, so history spells it out.
  const label = finding.outcome === 'neither' ? 'Neither cause found' : outcome?.label ?? finding.outcome;
  return (
    <div className="history-entry">
      <span className="history-date">{localDate(finding.savedAt)}</span>
      <span className="history-main">
        <strong>{label}</strong>
        {finding.note && <span className="history-note">{finding.note}</span>}
      </span>
      <span className="tag">Technician finding</span>
    </div>
  );
}

export function MachineHistory({ result, finding }: { result: RetrievalResult; finding?: Finding }) {
  const { asset, included } = result;
  const incidents = included
    .filter((item) => item.record.kind === 'incident' && item.record.assetId === asset.id)
    .sort((a, b) => (b.record.occurredOn ?? '').localeCompare(a.record.occurredOn ?? ''));

  if (!finding && incidents.length === 0) return null;

  return (
    <section aria-label={`${asset.id} history`} className="history">
      <h2>History</h2>
      {finding && <FindingEntry result={result} finding={finding} />}
      {incidents.map(({ record }) => (
        <a className="history-entry" key={record.id} href={`#/asset/${asset.id}/evidence/source/${record.id}`}>
          <span className="history-date">{record.occurredOn ? shortDate(record.occurredOn) : 'Past'}</span>
          <span className="history-main">{record.takeaway}</span>
          <span className="tag">Past incident</span>
        </a>
      ))}
    </section>
  );
}
