import { CauseComparison } from '../components/CauseComparison';
import { EvidenceRow } from '../components/EvidenceRow';
import { AlertMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { ReadingMeter } from '../components/ReadingMeter';
import { Screen } from '../components/Screen';
import { alertFor, assets } from '../data';
import { causeComparison, contextStepNotes, leftOutSummary, separatingSentence } from '../domain/causes';
import type { EvidenceItem, RetrievalResult } from '../domain/types';

const LEFT_OUT_ID = 'left-out';

function typeOf(assetId: string): string {
  return assets.find((asset) => asset.id === assetId)?.type ?? 'equipment';
}

export function EvidenceScreen({ result }: { result: RetrievalResult }) {
  const { asset, parent, included, uncertain, excluded, applicableSop } = result;
  const alert = alertFor(asset.id);
  const readings = included.find((item) => item.record.id === alert?.sensorRecordId)?.record.readings ?? [];
  const sourceHref = (id: string) => `#/asset/${asset.id}/evidence/source/${id}`;
  const stepHref = (stepId: string) => `${sourceHref(applicableSop?.id ?? '')}/step/${stepId}`;
  const items = causeComparison(result);
  const notes = contextStepNotes(result);
  const leftOut = leftOutSummary(result, typeOf);
  const older = excluded.filter((item) => item.record.kind === 'sop');
  const otherComponents = excluded.filter((item) => item.record.kind !== 'sop');

  function rows(list: EvidenceItem[], tone: 'included' | 'uncertain' | 'excluded') {
    return list.map((item) => (
      <EvidenceRow key={item.record.id} item={item} sourceHref={sourceHref(item.record.id)} tone={tone} />
    ));
  }

  function showLeftOut() {
    const section = document.getElementById(LEFT_OUT_ID);
    section?.scrollIntoView?.({ block: 'start' });
    section?.focus({ preventScroll: true });
  }

  return (
    <Screen action={<PrimaryAction label="Continue to inspection plan" href={`#/asset/${asset.id}/plan`} />}>
      <p className="path">{parent && `${parent.id} > `}{asset.id}</p>
      <h1>Evidence for {asset.id}</h1>
      {alert && <p className="alert-title wide-only"><AlertMark /> {alert.title} on {asset.id}</p>}

      {readings.length > 0 && (
        <section aria-label="Current readings">
          <div className="meters">
            {readings.map((reading) => <ReadingMeter key={reading.label} reading={reading} />)}
          </div>
          <p className="fine">Limits are demonstration values. Trends cover the last 48 hours.</p>
        </section>
      )}

      {items.length > 0 && (
        <section aria-label="Possible causes">
          <h2>Possible causes</h2>
          <p className="separate">{separatingSentence(items)}</p>
          <CauseComparison items={items} sourceHref={sourceHref} stepHref={stepHref} />

          {notes.map((note) => (
            <p className="note-line note-links" key={note.stepId}>
              <a className="tap-link" href={stepHref(note.stepId)}>Step {note.stepNumber}</a> also checks {note.checks} because of a{' '}
              <a className="tap-link" href={sourceHref(note.recordId)}>{note.parentType}-level record</a>. It is not listed as a cause because no incident on this {note.assetType} supports it.
            </p>
          ))}

          {leftOut && (
            <p className="note-line">
              <button type="button" className="text-button" onClick={showLeftOut}>{leftOut}</button>
            </p>
          )}
        </section>
      )}

      <section>
        <h2>Used as evidence ({included.length})</h2>
        <div className="rows">{rows(included, 'included')}</div>
      </section>

      {uncertain.length > 0 && (
        <section>
          <h2>Not sure it applies ({uncertain.length})</h2>
          <div className="rows">{rows(uncertain, 'uncertain')}</div>
        </section>
      )}

      <section id={LEFT_OUT_ID} tabIndex={-1} className="anchor">
        <h2>Left out ({otherComponents.length})</h2>
        <div className="rows">{rows(otherComponents, 'excluded')}</div>
      </section>

      {older.length > 0 && (
        <section>
          <h2>Older procedure ({older.length})</h2>
          <div className="rows">{rows(older, 'excluded')}</div>
        </section>
      )}
    </Screen>
  );
}
