import { useState } from 'react';
import { records } from '../data';
import type { RetrievalResult, SavedPlan, SopRecord } from '../domain/types';
import { loadPlan, saveFinding, savePlan } from '../storage/plans';

const SAVE_ERROR = 'Could not save on this device. Check that browser storage is allowed.';

function readPlan(assetId: string): SavedPlan | null {
  try {
    return loadPlan(assetId);
  } catch {
    return null;
  }
}

function time(iso: string): string {
  return new Date(iso).toLocaleString();
}

export function PlanScreen({ result }: { result: RetrievalResult }) {
  const { asset, parent, applicableSop, included, possibleCauses } = result;
  const [saved, setSaved] = useState<SavedPlan | null>(() => readPlan(asset.id));
  const [noteDraft, setNoteDraft] = useState(saved?.finding?.note ?? '');
  const [error, setError] = useState<string | null>(null);

  const savedSop = saved ? records.find((record) => record.id === saved.sopRecordId) : undefined;
  const sop = (savedSop?.kind === 'sop' ? savedSop : applicableSop) as SopRecord | null;

  if (!sop) {
    return (
      <div className="panel">
        <h1>Review and save inspection plan</h1>
        <p>There is no applicable procedure for {asset.id}, so no plan can be created.</p>
      </div>
    );
  }

  const evidenceIds = saved ? saved.evidenceIds : included.map((item) => item.record.id);
  const steps = saved ? sop.steps.filter((step) => saved.stepIds.includes(step.id)) : sop.steps;
  const outcomes = [
    ...possibleCauses.map((cause) => ({ key: cause.key, label: cause.label })),
    { key: 'neither', label: 'Neither' },
    { key: 'inconclusive', label: 'Inconclusive' },
  ];

  function attempt(action: () => void) {
    try {
      action();
      setError(null);
    } catch {
      setError(SAVE_ERROR);
    }
  }

  function handleSave() {
    if (!sop) return;
    const currentSop = sop;
    attempt(() => {
      const plan: SavedPlan = {
        assetId: asset.id,
        sopRecordId: currentSop.id,
        stepIds: currentSop.steps.map((step) => step.id),
        evidenceIds,
        savedAt: new Date().toISOString(),
      };
      savePlan(plan);
      setSaved(plan);
    });
  }

  function handleOutcome(outcome: string) {
    attempt(() => {
      const updated = saveFinding(asset.id, {
        outcome,
        note: saved?.finding?.note,
        savedAt: new Date().toISOString(),
      });
      if (updated) setSaved(updated);
    });
  }

  function handleNote() {
    const outcome = saved?.finding?.outcome;
    if (!outcome) return;
    attempt(() => {
      const updated = saveFinding(asset.id, {
        outcome,
        note: noteDraft.trim() || undefined,
        savedAt: new Date().toISOString(),
      });
      if (updated) setSaved(updated);
    });
  }

  return (
    <div className="panel">
      <nav className="path" aria-label="Equipment path">
        {parent && <span>{parent.id} &gt; </span>}
        <a href={`#/asset/${asset.id}/evidence`}>{asset.id}</a>
      </nav>
      <h1>Review and save inspection plan</h1>
      <p>
        Steps come only from <a href={`#/asset/${asset.id}/plan/source/${sop.id}`}>{sop.sopNumber} rev {sop.revision}</a>, the current procedure for {asset.id}.
      </p>

      <section>
        <h2>Inspection steps</h2>
        <p className="muted">English is a prepared explanation. The German text is the authoritative version.</p>
        <ol className="steps">
          {steps.map((step) => (
            <li key={step.id}>
              <p>{step.english}</p>
              <p className="german" lang={sop.language}>{step.original}</p>
            </li>
          ))}
        </ol>
      </section>

      <section>
        <h2>Evidence references</h2>
        <ul className="refs">
          {evidenceIds.map((id) => (
            <li key={id}><a href={`#/asset/${asset.id}/plan/source/${id}`}>{id}</a></li>
          ))}
        </ul>
      </section>

      {error && <p className="caution" role="alert">{error}</p>}

      {!saved ? (
        <div className="action-bar">
          <button type="button" className="button" onClick={handleSave}>Save inspection plan</button>
        </div>
      ) : (
        <>
          <p className="saved" role="status">Plan saved {time(saved.savedAt)}</p>
          <section>
            <h2>Record finding</h2>
            <p className="muted">What did you observe in this inspection?</p>
            <div className="outcomes">
              {outcomes.map((outcome) => (
                <button
                  type="button"
                  key={outcome.key}
                  className="outcome"
                  aria-pressed={saved.finding?.outcome === outcome.key}
                  onClick={() => handleOutcome(outcome.key)}
                >
                  {outcome.label}
                </button>
              ))}
            </div>
            <label className="note">
              Note (optional)
              <textarea rows={3} value={noteDraft} onChange={(event) => setNoteDraft(event.target.value)} />
            </label>
            <button type="button" className="button secondary" disabled={!saved.finding} onClick={handleNote}>
              Save note
            </button>
            {saved.finding && (
              <p className="saved" role="status">
                Finding saved {time(saved.finding.savedAt)}
                {saved.finding.note ? `. Note: ${saved.finding.note}` : ''}
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
