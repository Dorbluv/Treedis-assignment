import { useState } from 'react';
import { LockMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { records } from '../data';
import type { RetrievalResult, SavedPlan, SopRecord } from '../domain/types';
import { savePlan } from '../storage/plans';

export function PlanScreen({ result, saved }: { result: RetrievalResult; saved: SavedPlan | null }) {
  const { asset, parent, applicableSop, included } = result;
  const [error, setError] = useState<string | null>(null);
  const [showGerman, setShowGerman] = useState(false);

  const savedSop = saved ? records.find((record) => record.id === saved.sopRecordId) : undefined;
  const sop = (savedSop?.kind === 'sop' ? savedSop : applicableSop) as SopRecord | null;

  if (!sop) {
    return (
      <Screen action={<PrimaryAction label="Back to evidence" href={`#/asset/${asset.id}/evidence`} />}>
        <h1>Review and save inspection plan</h1>
        <p>There is no applicable procedure for {asset.id}, so no plan can be created.</p>
      </Screen>
    );
  }

  const procedure = sop;
  const evidenceIds = saved ? saved.evidenceIds : included.map((item) => item.record.id);
  const steps = saved ? procedure.steps.filter((step) => saved.stepIds.includes(step.id)) : procedure.steps;
  const findingHref = `#/asset/${asset.id}/finding`;
  const sourceHref = (id: string) => `#/asset/${asset.id}/plan/source/${id}`;

  function handleSave() {
    try {
      savePlan({
        assetId: asset.id,
        sopRecordId: procedure.id,
        stepIds: procedure.steps.map((step) => step.id),
        evidenceIds,
        savedAt: new Date().toISOString(),
      });
      window.location.hash = findingHref;
    } catch {
      setError('Could not save on this device. Check that browser storage is allowed.');
    }
  }

  const action = saved ? (
    <PrimaryAction label="Continue to finding" href={findingHref} />
  ) : (
    <PrimaryAction label="Save inspection plan" onClick={handleSave} />
  );

  return (
    <Screen action={action}>
      <p className="path">{parent && `${parent.id} > `}{asset.id}</p>
      <h1>Review and save inspection plan</h1>
      <p className="muted">
        Steps come only from <a className="tap-link solo" href={sourceHref(procedure.id)}>{procedure.sopNumber} rev {procedure.revision}</a>, the current procedure for {asset.id}. The English is a prepared explanation. The German text is the authoritative version.
      </p>

      <button
        type="button"
        className="secondary-button"
        aria-expanded={showGerman}
        onClick={() => setShowGerman((value) => !value)}
      >
        {showGerman ? 'Hide German text' : 'Show German text'}
      </button>

      <ol className="steps">
        {steps.map((step, index) => (
          <li key={step.id} className={index === 0 ? 'step-first' : undefined}>
            {index === 0 && <p className="step-flag"><LockMark /> Do this first</p>}
            <p className="step-english">{step.english}</p>
            {step.expectedEnglish && <p className="expected">You should see: {step.expectedEnglish}</p>}
            {showGerman && (
              <p className="german" lang={procedure.language}>
                {step.original}{step.expectedOriginal ? ` ${step.expectedOriginal}` : ''}
              </p>
            )}
          </li>
        ))}
      </ol>

      <details className="refs-box">
        <summary>Evidence references ({evidenceIds.length})</summary>
        <ul className="ref-list">
          {evidenceIds.map((id) => (
            <li key={id}>
              <a className="tap-link" href={sourceHref(id)}>{records.find((record) => record.id === id)?.takeaway ?? id}</a>
            </li>
          ))}
        </ul>
      </details>

      {error && <p className="error" role="alert">{error}</p>}
    </Screen>
  );
}
