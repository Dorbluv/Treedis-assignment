import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { records } from '../data';
import type { RetrievalResult, SavedPlan } from '../domain/types';
import { outcomeOptions, time } from './format';

export function DoneScreen({
  result,
  saved,
  onReset,
}: {
  result: RetrievalResult;
  saved: SavedPlan;
  onReset: () => void;
}) {
  const { asset } = result;
  const sop = records.find((record) => record.id === saved.sopRecordId);
  const finding = saved.finding;
  const outcome = outcomeOptions(result).find((option) => option.key === finding?.outcome);
  const planName = sop?.kind === 'sop' ? `${sop.sopNumber} rev ${sop.revision}` : saved.sopRecordId;

  return (
    <Screen action={<PrimaryAction label="Back to plant layout" href="#/" />}>
      <h1>Finding saved for {asset.id}</h1>
      <dl className="source">
        <dt>Finding</dt>
        <dd>
          <strong>{outcome?.label ?? finding?.outcome}</strong>
          {finding?.note && <>. Note: {finding.note}</>}
        </dd>
        <dt>Plan</dt>
        <dd>{planName}, <span className="num">{saved.stepIds.length}</span> steps. Saved <span className="num">{time(saved.savedAt)}</span>.</dd>
        <dt>Evidence used</dt>
        <dd>
          <ul className="ref-list">
            {saved.evidenceIds.map((id) => (
              <li key={id}>
                <a className="tap-link" href={`#/asset/${asset.id}/done/source/${id}`}>
                  {records.find((record) => record.id === id)?.takeaway ?? id}
                </a>
              </li>
            ))}
          </ul>
        </dd>
      </dl>
      <button type="button" className="reset" onClick={onReset}>Reset demo</button>
    </Screen>
  );
}
