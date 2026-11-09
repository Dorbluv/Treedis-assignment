import { PrimaryAction } from '../components/PrimaryAction';
import { records } from '../data';
import type { RetrievalResult, SavedPlan } from '../domain/types';
import { outcomeOptions, time } from './format';

export function DoneScreen({ result, saved }: { result: RetrievalResult; saved: SavedPlan }) {
  const { asset } = result;
  const sop = records.find((record) => record.id === saved.sopRecordId);
  const finding = saved.finding;
  const outcome = outcomeOptions(result).find((option) => option.key === finding?.outcome);
  const planName = sop?.kind === 'sop' ? `${sop.sopNumber} rev ${sop.revision}` : saved.sopRecordId;

  return (
    <div className="panel">
      <h1>Finding saved for {asset.id}</h1>
      <dl className="source">
        <dt>Plan</dt>
        <dd>{planName}, {saved.stepIds.length} steps. Saved {time(saved.savedAt)}.</dd>
        <dt>Evidence used</dt>
        <dd>
          <ul className="inline-refs">
            {saved.evidenceIds.map((id) => (
              <li key={id}><a href={`#/asset/${asset.id}/done/source/${id}`}>{id}</a></li>
            ))}
          </ul>
        </dd>
        <dt>Finding</dt>
        <dd>
          <strong>{outcome?.label ?? finding?.outcome}</strong>
          {finding?.note && <>. Note: {finding.note}</>}
        </dd>
      </dl>
      <PrimaryAction label="Back to plant layout" href="#/" />
    </div>
  );
}
