import { useState } from 'react';
import { CauseComparison, UntestableCause } from '../components/CauseComparison';
import { EvidenceGroup } from '../components/EvidenceGroup';
import { EvidenceRow } from '../components/EvidenceRow';
import { AlertMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { ReadingMeter } from '../components/ReadingMeter';
import { Screen } from '../components/Screen';
import { alertFor } from '../data';
import {
  causeComparison,
  causesWithoutStep,
  contextStepNotes,
  listPreview,
  separatingSentence,
  usedPreview,
} from '../domain/causes';
import type { Escalation, EvidenceItem, RetrievalResult } from '../domain/types';
import { saveEscalation } from '../storage/plans';

export function EvidenceScreen({ result, escalation }: { result: RetrievalResult; escalation?: Escalation }) {
  const { asset, parent, included, uncertain, excluded, applicableSop } = result;
  const [error, setError] = useState<string | null>(null);
  const alert = alertFor(asset.id);
  const readings = included.find((item) => item.record.id === alert?.sensorRecordId)?.record.readings ?? [];
  const sourceHref = (id: string) => `#/asset/${asset.id}/evidence/source/${id}`;
  const stepHref = (stepId: string) => `${sourceHref(applicableSop?.id ?? '')}/step/${stepId}`;
  const items = causeComparison(result);
  const untestable = causesWithoutStep(result);
  const notes = contextStepNotes(result);
  const noCauses = items.length === 0 && untestable.length === 0;

  function rows(list: EvidenceItem[], tone: 'included' | 'uncertain' | 'excluded') {
    return list.map((item) => (
      <EvidenceRow key={item.record.id} item={item} sourceHref={sourceHref(item.record.id)} tone={tone} />
    ));
  }

  function escalate() {
    try {
      saveEscalation({ assetId: asset.id, escalatedAt: new Date().toISOString() });
      window.location.hash = `#/asset/${asset.id}/done`;
    } catch {
      setError('Could not save on this device. Check that browser storage is allowed.');
    }
  }

  let action;
  if (applicableSop) {
    action = <PrimaryAction label="Continue to inspection plan" href={`#/asset/${asset.id}/plan`} />;
  } else if (!alert) {
    action = <PrimaryAction label="Back to plant layout" href="#/" />;
  } else if (escalation) {
    action = <PrimaryAction label="View escalation" href={`#/asset/${asset.id}/done`} />;
  } else {
    action = <PrimaryAction label="Escalate through site process" onClick={escalate} />;
  }

  return (
    <Screen action={action}>
      <p className="path">{parent && `${parent.id} > `}{asset.id}</p>
      <h1>Evidence for {asset.id}</h1>
      {alert ? (
        <p className="alert-title wide-only"><AlertMark /> {alert.title} on {asset.id}</p>
      ) : (
        <p className="separate">No active alert</p>
      )}

      {readings.length > 0 && (
        <section aria-label="Current readings">
          <div className="meters">
            {readings.map((reading) => <ReadingMeter key={reading.label} reading={reading} />)}
          </div>
          <p className="fine">Demo limits. Last 48 hours.</p>
        </section>
      )}

      {items.length > 0 && (
        <section aria-label="Possible causes">
          <h2>Possible causes</h2>
          <p className="separate">{separatingSentence(items)}</p>
          <CauseComparison items={items} sourceHref={sourceHref} stepHref={stepHref} />

          {notes.map((note) => (
            <p className="note-line note-links" key={note.stepId}>
              <a className="tap-link" href={stepHref(note.stepId)}>Step {note.stepNumber}</a> also checks{' '}
              <a className="tap-link" href={sourceHref(note.recordId)}>{note.checks}</a>. No past incident on this {note.assetType} points to it.
            </p>
          ))}
        </section>
      )}

      {untestable.length > 0 && (
        <section aria-label="Possible cause">
          <h2>Possible cause</h2>
          {untestable.map(({ cause, record }) => (
            <UntestableCause key={cause.key} label={cause.label} record={record} sourceHref={sourceHref(record.id)} />
          ))}
        </section>
      )}

      {alert && noCauses && <p className="separate">Insufficient asset-specific evidence to recommend a likely cause.</p>}

      {alert && !applicableSop && <p className="gap" role="status">No applicable procedure, so no plan.</p>}

      {error && <p className="error" role="alert">{error}</p>}

      <div className="groups">
        {included.length > 0 && (
          <EvidenceGroup
            title="Used as evidence"
            count={included.length}
            preview={usedPreview(included)}
            open={noCauses || undefined}
          >
            {rows(included, 'included')}
          </EvidenceGroup>
        )}

        {uncertain.length > 0 && (
          <EvidenceGroup title="Not sure it applies" count={uncertain.length} preview={listPreview(uncertain)}>
            {rows(uncertain, 'uncertain')}
          </EvidenceGroup>
        )}

        {excluded.length > 0 && (
          <EvidenceGroup title="Left out" count={excluded.length} preview={listPreview(excluded)}>
            {rows(excluded, 'excluded')}
          </EvidenceGroup>
        )}
      </div>
    </Screen>
  );
}
