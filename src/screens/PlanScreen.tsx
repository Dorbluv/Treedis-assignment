import { useState } from 'react';
import { PrimaryAction } from '../components/PrimaryAction';
import { records } from '../data';
import type { RetrievalResult, SavedPlan, SopRecord } from '../domain/types';
import { savePlan } from '../storage/plans';

export function PlanScreen({ result, saved }: { result: RetrievalResult; saved: SavedPlan | null }) {
  const { asset, parent, applicableSop, included } = result;
  const [error, setError] = useState<string | null>(null);

  const savedSop = saved ? records.find((record) => record.id === saved.sopRecordId) : undefined;
  const sop = (savedSop?.kind === 'sop' ? savedSop : applicableSop) as SopRecord | null;

  if (!sop) {
    return (
      <div className="panel">
        <h1>Review and save inspection plan</h1>
        <p>There is no applicable procedure for {asset.id}, so no plan can be created.</p>
        <PrimaryAction label="Back to evidence" href={`#/asset/${asset.id}/evidence`} />
      </div>
    );
  }

  const procedure = sop;
  const evidenceIds = saved ? saved.evidenceIds : included.map((item) => item.record.id);
  const steps = saved ? procedure.steps.filter((step) => saved.stepIds.includes(step.id)) : procedure.steps;
  const findingHref = `#/asset/${asset.id}/finding`;

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

  return (
    <div className="panel">
      <nav className="path" aria-label="Equipment path">
        {parent && <span>{parent.id} &gt; </span>}
        <a href={`#/asset/${asset.id}/evidence`}>{asset.id}</a>
      </nav>
      <h1>Review and save inspection plan</h1>
      <p className="muted">
        Steps come only from <a href={`#/asset/${asset.id}/plan/source/${procedure.id}`}>{procedure.sopNumber} rev {procedure.revision}</a>, the current procedure for {asset.id}. English is a prepared explanation. The German text is the authoritative version.
      </p>

      <ol className="steps">
        {steps.map((step) => (
          <li key={step.id}>
            <p className="step-english">{step.english}</p>
            <p className="german" lang={procedure.language}>{step.original}</p>
          </li>
        ))}
      </ol>

      <details className="refs-box">
        <summary>Evidence references ({evidenceIds.length})</summary>
        <ul className="refs">
          {evidenceIds.map((id) => (
            <li key={id}><a href={`#/asset/${asset.id}/plan/source/${id}`}>{id}</a></li>
          ))}
        </ul>
      </details>

      {error && <p className="caution" role="alert">{error}</p>}

      {saved ? (
        <PrimaryAction label="Continue to finding" href={findingHref} />
      ) : (
        <PrimaryAction label="Save inspection plan" onClick={handleSave} />
      )}
    </div>
  );
}
