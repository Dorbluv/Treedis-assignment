import { useState } from 'react';
import { CauseComparison } from '../components/CauseComparison';
import { EvidenceGroup } from '../components/EvidenceGroup';
import { EvidenceRow } from '../components/EvidenceRow';
import { AlertMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { ReadingMeter } from '../components/ReadingMeter';
import { Screen } from '../components/Screen';
import { alertFor } from '../data';
import {
  causeComparison,
  contextStepNotes,
  leftOutSummary,
  listPreview,
  separatingSentence,
  usedPreview,
} from '../domain/causes';
import type { EvidenceItem, RetrievalResult } from '../domain/types';

const LEFT_OUT_ID = 'left-out';

export function EvidenceScreen({ result }: { result: RetrievalResult }) {
  const { asset, parent, included, uncertain, excluded, applicableSop } = result;
  const [leftOutOpen, setLeftOutOpen] = useState(false);
  const alert = alertFor(asset.id);
  const readings = included.find((item) => item.record.id === alert?.sensorRecordId)?.record.readings ?? [];
  const sourceHref = (id: string) => `#/asset/${asset.id}/evidence/source/${id}`;
  const stepHref = (stepId: string) => `${sourceHref(applicableSop?.id ?? '')}/step/${stepId}`;
  const items = causeComparison(result);
  const notes = contextStepNotes(result);
  const leftOut = leftOutSummary(result);
  const hasIncident = included.some((item) => item.record.kind === 'incident');
  const noCauseMessage =
    alert || !hasIncident
      ? 'Insufficient asset-specific evidence to recommend a likely cause.'
      : `No active alert on ${asset.id}. Past records are below.`;

  function rows(list: EvidenceItem[], tone: 'included' | 'uncertain' | 'excluded') {
    return list.map((item) => (
      <EvidenceRow key={item.record.id} item={item} sourceHref={sourceHref(item.record.id)} tone={tone} />
    ));
  }

  function showLeftOut() {
    setLeftOutOpen(true);
    requestAnimationFrame(() => {
      const section = document.getElementById(LEFT_OUT_ID);
      section?.scrollIntoView?.({ block: 'start' });
      section?.querySelector('summary')?.focus({ preventScroll: true });
    });
  }

  return (
    <Screen
      action={
        applicableSop ? (
          <PrimaryAction label="Continue to inspection plan" href={`#/asset/${asset.id}/plan`} />
        ) : (
          <PrimaryAction label="Back to plant layout" href="#/" />
        )
      }
    >
      <p className="path">{parent && `${parent.id} > `}{asset.id}</p>
      <h1>Evidence for {asset.id}</h1>
      {alert && <p className="alert-title wide-only"><AlertMark /> {alert.title} on {asset.id}</p>}

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

          {leftOut && (
            <p className="note-line">
              <button type="button" className="text-button" onClick={showLeftOut}>{leftOut}</button>
            </p>
          )}
        </section>
      )}

      {items.length === 0 && <p className="separate">{noCauseMessage}</p>}

      {!applicableSop && (
        <div className="gap" role="status">
          <p><strong>No applicable procedure for {asset.id}</strong></p>
          <p>No plan can be created. Escalate through your site-approved process.</p>
        </div>
      )}

      <div className="groups">
        {included.length > 0 && (
          <EvidenceGroup
            title="Used as evidence"
            count={included.length}
            preview={usedPreview(included)}
            open={items.length === 0 || undefined}
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
          <EvidenceGroup
            id={LEFT_OUT_ID}
            title="Left out"
            count={excluded.length}
            preview={listPreview(excluded)}
            open={leftOutOpen}
            onToggle={setLeftOutOpen}
          >
            {rows(excluded, 'excluded')}
          </EvidenceGroup>
        )}
      </div>
    </Screen>
  );
}
