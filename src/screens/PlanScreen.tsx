import { useState } from 'react';
import { ChevronMark } from '../components/Icons';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import { records } from '../data';
import type { RetrievalResult, SavedPlan, SopRecord } from '../domain/types';
import { savePlan } from '../storage/plans';
import { recordLine } from './format';

type PlanLanguage = 'en' | 'de';

function lineFor(id: string): string {
  const record = records.find((candidate) => candidate.id === id);
  return record ? recordLine(record) : id;
}

const COPY = {
  en: {
    title: 'Review and save inspection plan',
    source: 'Translated from German',
    steps: 'Inspection steps',
    good: 'Good:',
    ifNot: 'If not:',
    references: 'Evidence references',
    save: 'Save inspection plan',
    next: 'Continue to finding',
  },
  de: {
    title: 'Inspektionsplan prüfen und speichern',
    source: 'Originaltext',
    steps: 'Inspektionsschritte',
    good: 'Gut:',
    ifNot: 'Wenn nicht:',
    references: 'Belege',
    save: 'Inspektionsplan speichern',
    next: 'Weiter zum Befund',
  },
};

export function PlanScreen({ result, saved }: { result: RetrievalResult; saved: SavedPlan | null }) {
  const { asset, parent, applicableSop, included } = result;
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<PlanLanguage>('en');

  const savedSop = saved ? records.find((record) => record.id === saved.sopRecordId) : undefined;
  const sop = (savedSop?.kind === 'sop' ? savedSop : applicableSop) as SopRecord | null;

  if (!sop) {
    return (
      <Screen action={<PrimaryAction label="Back to evidence" href={`#/asset/${asset.id}/evidence`} />}>
        <h1>{COPY.en.title}</h1>
        <div className="gap" role="status">
          <p><strong>No applicable procedure for {asset.id}</strong></p>
          <p>No plan can be created. Escalate through your site-approved process.</p>
        </div>
      </Screen>
    );
  }

  const procedure = sop;
  const translated = procedure.language === 'de';
  const copy = COPY[translated ? language : 'en'];
  const german = translated && language === 'de';
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
    <PrimaryAction label={copy.next} href={findingHref} />
  ) : (
    <PrimaryAction label={copy.save} onClick={handleSave} />
  );

  return (
    <Screen action={action}>
      <div lang={german ? 'de' : 'en'} className="plan">
        <p className="path">{parent && `${parent.id} > `}{asset.id}</p>
        <h1>{copy.title}</h1>
        <div className="plan-meta">
          <p className="fine">
            {translated ? copy.source : 'Source'}: <a className="tap-link solo" href={sourceHref(procedure.id)}>{procedure.sopNumber} rev {procedure.revision}</a>
          </p>
          {translated && (
            <div className="switch" role="group" aria-label="Plan language">
              {(['en', 'de'] as const).map((option) => (
                <button
                  type="button"
                  key={option}
                  lang={option}
                  aria-pressed={language === option}
                  onClick={() => setLanguage(option)}
                >
                  {option === 'en' ? 'English' : 'Deutsch'}
                </button>
              ))}
            </div>
          )}
        </div>

        <h2>{copy.steps} ({steps.length})</h2>
        <ol className="steps">
          {steps.map((step, index) => {
            const good = german ? step.goodGerman : step.goodEnglish;
            const ifNot = german ? step.ifNotGerman : step.ifNotEnglish;
            return (
              <li key={step.id}>
                <span className="step-num" aria-hidden="true">{index + 1}</span>
                <div className="step-body">
                  <p className="step-title">{german ? step.titleGerman : step.title}</p>
                  <p className="step-text">{german ? step.original : step.english}</p>
                  {good && <p className="step-check"><span>{copy.good}</span> {good}</p>}
                  {ifNot && <p className="step-check"><span>{copy.ifNot}</span> {ifNot}</p>}
                </div>
              </li>
            );
          })}
        </ol>

        <details className="group">
          <summary>
            <ChevronMark />
            <span className="group-title">{copy.references} ({evidenceIds.length})</span>
          </summary>
          <ul className="ref-list">
            {evidenceIds.map((id) => (
              <li key={id}>
                <a className="tap-link" href={sourceHref(id)}>
                  {german ? id : lineFor(id)}
                </a>
              </li>
            ))}
          </ul>
        </details>

        {error && <p className="error" role="alert">{error}</p>}
      </div>
    </Screen>
  );
}
