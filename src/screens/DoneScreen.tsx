import { EvidenceGroup } from '../components/EvidenceGroup';
import { FindingEntry } from '../components/MachineHistory';
import { PrimaryAction } from '../components/PrimaryAction';
import { ReadingMeter } from '../components/ReadingMeter';
import { Screen } from '../components/Screen';
import { StatusTrack } from '../components/StatusTrack';
import { alertFor, records } from '../data';
import { readingStatus } from '../domain/causes';
import { inspectionStatus } from '../domain/status';
import type { RetrievalResult, SavedPlan } from '../domain/types';
import { time } from './format';

export function DoneScreen({
  result,
  saved,
  onReset,
}: {
  result: RetrievalResult;
  saved: SavedPlan;
  onReset: () => void;
}) {
  const { asset, included } = result;
  const alert = alertFor(asset.id);
  const finding = saved.finding;
  const status = inspectionStatus(finding?.outcome ?? '', records);
  const sop = records.find((record) => record.id === saved.sopRecordId);
  const planName = sop?.kind === 'sop' ? `${sop.sopNumber} rev ${sop.revision}` : saved.sopRecordId;
  const steps = sop?.kind === 'sop' ? sop.steps.filter((step) => saved.stepIds.includes(step.id)) : [];
  const high = (included.find((item) => item.record.id === alert?.sensorRecordId)?.record.readings ?? []).filter(
    (reading) => readingStatus(reading) === 'above',
  );

  return (
    <Screen action={<PrimaryAction label="Back to plant layout" href="#/" />}>
      {alert && <StatusTrack />}
      <h1>{status.headline}</h1>

      {high.length > 0 && (
        <section aria-label="Current readings">
          <div className="meters">
            {high.map((reading) => <ReadingMeter key={reading.label} reading={reading} />)}
          </div>
          <p className="fine">Readings stay high until repaired.</p>
        </section>
      )}

      {finding && (
        <section aria-label={`Added to ${asset.id} history`}>
          <h2>Added to {asset.id} history</h2>
          <FindingEntry result={result} finding={finding} />
        </section>
      )}

      <div className="groups">
        <EvidenceGroup title="Plan" count={steps.length} preview={`${planName}, saved ${time(saved.savedAt)}`}>
          <ul className="ref-list">
            {steps.map((step) => (
              <li key={step.id}>
                <a className="tap-link" href={`#/asset/${asset.id}/done/source/${saved.sopRecordId}/step/${step.id}`}>
                  {step.title ?? step.english}
                </a>
              </li>
            ))}
          </ul>
        </EvidenceGroup>
        <EvidenceGroup title="Evidence used" count={saved.evidenceIds.length} preview="Records this plan cites">
          <ul className="ref-list">
            {saved.evidenceIds.map((id) => (
              <li key={id}>
                <a className="tap-link" href={`#/asset/${asset.id}/done/source/${id}`}>
                  {records.find((record) => record.id === id)?.takeaway ?? id}
                </a>
              </li>
            ))}
          </ul>
        </EvidenceGroup>
      </div>

      <button type="button" className="reset" onClick={onReset}>Reset demo</button>
    </Screen>
  );
}
