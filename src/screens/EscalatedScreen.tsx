import { EscalationEntry } from '../components/MachineHistory';
import { PrimaryAction } from '../components/PrimaryAction';
import { ReadingMeter } from '../components/ReadingMeter';
import { Screen } from '../components/Screen';
import { StatusTrack } from '../components/StatusTrack';
import { alertFor } from '../data';
import { readingStatus } from '../domain/causes';
import { ESCALATION_HEADLINE, ESCALATION_STAGES } from '../domain/status';
import type { Escalation, RetrievalResult } from '../domain/types';

export function EscalatedScreen({
  result,
  escalation,
  onReset,
}: {
  result: RetrievalResult;
  escalation: Escalation;
  onReset: () => void;
}) {
  const { asset, included } = result;
  const alert = alertFor(asset.id);
  const high = (included.find((item) => item.record.id === alert?.sensorRecordId)?.record.readings ?? []).filter(
    (reading) => readingStatus(reading) === 'above',
  );

  return (
    <Screen action={<PrimaryAction label="Back to plant layout" href="#/" />}>
      <StatusTrack stages={ESCALATION_STAGES} />
      <h1>{ESCALATION_HEADLINE}</h1>

      {high.length > 0 && (
        <section aria-label="Current readings">
          <div className="meters">
            {high.map((reading) => <ReadingMeter key={reading.label} reading={reading} />)}
          </div>
          <p className="fine">Readings stay high until repaired. Demo limits.</p>
        </section>
      )}

      <section aria-label={`Added to ${asset.id} history`}>
        <h2>Added to {asset.id} history</h2>
        <EscalationEntry escalation={escalation} />
      </section>

      <button type="button" className="reset" onClick={onReset}>Reset demo</button>
    </Screen>
  );
}
