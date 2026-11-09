import { formatDate, formatDay, outcomeOptions } from '../screens/format';
import { machineHistory } from '../domain/snapshot';
import type { Escalation, Finding, RetrievalResult } from '../domain/types';

/** A technician finding: what was observed in this inspection. It is never evidence. */
export function FindingEntry({ result, finding }: { result: RetrievalResult; finding: Finding }) {
  const outcome = outcomeOptions(result).find((option) => option.key === finding.outcome);
  // "Neither" only makes sense next to the cause buttons, so history spells it out.
  const label = finding.outcome === 'neither' ? 'Neither cause found' : outcome?.label ?? finding.outcome;
  return (
    <div className="history-entry">
      <span className="history-date">{formatDate(finding.savedAt)}</span>
      <span className="history-main">
        <strong>{label}</strong>
        {finding.note && <span className="history-note">{finding.note}</span>}
      </span>
      <span className="tag">Technician finding</span>
    </div>
  );
}

export function EscalationEntry({ escalation }: { escalation: Escalation }) {
  return (
    <div className="history-entry">
      <span className="history-date">{formatDate(escalation.escalatedAt)}</span>
      <span className="history-main"><strong>Escalated through site process</strong></span>
      <span className="tag">Escalation</span>
    </div>
  );
}

const TAGS: Record<string, string> = { incident: 'Past incident', assembly: 'Conveyor record' };

export function MachineHistory({
  result,
  finding,
  escalation,
}: {
  result: RetrievalResult;
  finding?: Finding;
  escalation?: Escalation;
}) {
  const { asset } = result;
  const past = machineHistory(result);

  if (!finding && !escalation && past.length === 0) return null;

  return (
    <section aria-label={`${asset.id} history`} className="history">
      <h2>History</h2>
      {escalation && <EscalationEntry escalation={escalation} />}
      {finding && <FindingEntry result={result} finding={finding} />}
      {past.map((record) => (
        <a className="history-entry" key={record.id} href={`#/asset/${asset.id}/investigate/source/${record.id}`}>
          <span className="history-date">{formatDay(record.occurredOn ?? '')}</span>
          <span className="history-main">{record.takeaway}</span>
          <span className="tag">{TAGS[record.kind]}</span>
        </a>
      ))}
    </section>
  );
}
