import { useEffect, useRef, useState } from 'react';
import { alertFor, records } from '../data';
import { machineHistory } from '../domain/snapshot';
import { summaryAllowed } from '../domain/summary';
import { causeComparison, causesWithoutStep, contextStepNotes, separatingSentence } from '../domain/causes';
import { ESCALATION_HEADLINE, inspectionStatus } from '../domain/status';
import type { Alert, Escalation, RetrievalResult, SavedPlan, SopRecord } from '../domain/types';
import {
  causeHeading,
  primaryActionKind,
  safetyMessage,
  statusPills,
  tabAvailability,
  type WorkspaceTab,
} from '../domain/workspace';
import { formatDateTime, outcomeOptions, recordLine } from '../screens/format';
import { saveEscalation, saveFinding, savePlan } from '../storage/plans';
import { CauseComparison, UntestableCause } from './CauseComparison';
import { EvidenceRecords } from './EvidenceRecords';
import { AlertMark, CheckMark, ChevronMark } from './Icons';
import { MachineHistory } from './MachineHistory';
import { MachineSnapshot } from './MachineSnapshot';
import { NoProcedureCallout } from './NoProcedureCallout';
import { PrimaryAction } from './PrimaryAction';
import { ReadingCard } from './ReadingCard';
import { SourceSheet } from './SourceSheet';
import { SummaryCard } from './SummaryCard';
import { WorkspaceTabs, tabId, tabPanelId, type TabDefinition } from './WorkspaceTabs';

const COPY = {
  en: {
    lead: 'Review and save inspection plan',
    source: 'Translated from German',
    steps: 'Inspection steps',
    good: 'Good:',
    ifNot: 'If not:',
    references: 'Evidence references',
    save: 'Save inspection plan',
    nextLabel: 'Next:',
    nextAfterSave: 'do the steps, then record a finding',
  },
  de: {
    lead: 'Inspektionsplan prüfen und speichern',
    source: 'Originaltext',
    steps: 'Inspektionsschritte',
    good: 'Gut:',
    ifNot: 'Wenn nicht:',
    references: 'Belege',
    save: 'Inspektionsplan speichern',
    nextLabel: 'Weiter:',
    nextAfterSave: 'Schritte ausführen, dann Befund erfassen',
  },
};

const SAVE_ERROR = 'Could not save on this device. Check that browser storage is allowed.';

function InvestigateTab({
  result,
  alert,
  escalation,
  base,
}: {
  result: RetrievalResult;
  alert: Alert;
  escalation?: Escalation;
  base: string;
}) {
  const { asset, applicableSop } = result;
  const sourceHref = (id: string) => `${base}/investigate/source/${id}`;
  const stepHref = (stepId: string) => `${base}/plan/step/${stepId}`;
  const items = causeComparison(result);
  const untestable = causesWithoutStep(result);
  const notes = contextStepNotes(result);
  const noCauses = items.length === 0 && untestable.length === 0;

  return (
    <>
      {items.length > 0 && (
        <section aria-label="Possible causes">
          <h2>{causeHeading(items.length)}</h2>
          <p className="separate">{separatingSentence(items)}</p>
          <CauseComparison items={items} sourceHref={sourceHref} stepHref={stepHref} />
          {notes.map((note) => (
            <p className="note-line" key={note.stepId}>
              <a href={stepHref(note.stepId)}>Step {note.stepNumber}</a> also checks{' '}
              <a href={sourceHref(note.recordId)}>{note.checks}</a>. No past incident on this {note.assetType} points to it.
            </p>
          ))}
        </section>
      )}

      {untestable.length > 0 && (
        <section aria-label="Possible cause">
          <h2>{causeHeading(untestable.length)}</h2>
          {untestable.map(({ cause, record }) => (
            <UntestableCause key={cause.key} label={cause.label} record={record} sourceHref={sourceHref(record.id)} />
          ))}
        </section>
      )}

      {alert && noCauses && (
        <div className="insufficient">
          <p className="separate">Insufficient asset-specific evidence to recommend a likely cause.</p>
          {machineHistory(result).length === 0 && <p className="note-line">No past incidents on this machine</p>}
        </div>
      )}
      {!applicableSop && <NoProcedureCallout assetId={asset.id} hasAlert escalated={Boolean(escalation)} />}

      <EvidenceRecords result={result} sourceHref={sourceHref} />
    </>
  );
}

function PlanTab({
  procedure,
  saved,
  evidenceIds,
  language,
  onLanguage,
  stepId,
  base,
}: {
  procedure: SopRecord;
  saved: SavedPlan | null;
  evidenceIds: string[];
  language: 'en' | 'de';
  onLanguage: (language: 'en' | 'de') => void;
  stepId: string | null;
  base: string;
}) {
  const translated = procedure.language === 'de';
  const german = translated && language === 'de';
  const copy = COPY[german ? 'de' : 'en'];
  const steps = saved ? procedure.steps.filter((step) => saved.stepIds.includes(step.id)) : procedure.steps;
  const sourceHref = (id: string) => `${base}/plan/source/${id}`;
  const target = useRef<HTMLLIElement>(null);

  useEffect(() => {
    target.current?.scrollIntoView?.({ block: 'center' });
  }, [stepId]);

  return (
    <div lang={german ? 'de' : 'en'} className="plan">
      <p className="plan-lead">{copy.lead}</p>
      <div className="plan-meta">
        <p className="fine">
          {translated ? copy.source : 'Source'}: <a className="sop-link" href={sourceHref(procedure.id)}>{procedure.sopNumber} rev {procedure.revision}</a>
        </p>
        {translated && (
          <div className="switch" role="group" aria-label="Plan language">
            {(['en', 'de'] as const).map((option) => (
              <button type="button" key={option} lang={option} aria-pressed={language === option} onClick={() => onLanguage(option)}>
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
            <li key={step.id} ref={step.id === stepId ? target : undefined} className={step.id === stepId ? 'is-target' : undefined}>
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
          {evidenceIds.map((id) => {
            const record = records.find((candidate) => candidate.id === id);
            return (
              <li key={id}>
                <a href={sourceHref(id)}>{german || !record ? id : recordLine(record)}</a>
              </li>
            );
          })}
        </ul>
      </details>
    </div>
  );
}

function FindingTab({
  result,
  saved,
  outcome,
  note,
  onOutcome,
  onNote,
}: {
  result: RetrievalResult;
  saved: SavedPlan;
  outcome: string | null;
  note: string;
  onOutcome: (key: string) => void;
  onNote: (value: string) => void;
}) {
  const options = outcomeOptions(result);
  const finding = saved.finding;

  if (finding) {
    const label = options.find((option) => option.key === finding.outcome)?.label ?? finding.outcome;
    return (
      <div className="finding-saved">
        <p className="confirm" role="status"><CheckMark /> <strong>Finding saved</strong> <span>{formatDateTime(finding.savedAt)}</span></p>
        <dl className="source">
          <dt>Outcome</dt>
          <dd><strong>{label}</strong></dd>
          {finding.note && (
            <>
              <dt>Note</dt>
              <dd>{finding.note}</dd>
            </>
          )}
        </dl>
      </div>
    );
  }

  const suggestions = options.find((option) => option.key === outcome)?.suggestions ?? [];

  function insert(suggestion: string) {
    const text = note.trim();
    if (text.includes(suggestion)) return;
    onNote(text ? `${text}. ${suggestion}` : suggestion);
  }

  return (
    <div className="finding">
      <p className="confirm" role="status"><CheckMark /> <strong>Plan saved</strong> <span>{formatDateTime(saved.savedAt)}</span></p>
      <div className="outcomes" role="group" aria-label="Finding outcome">
        {options.map((option) => (
          <button type="button" key={option.key} className="outcome" aria-pressed={outcome === option.key} onClick={() => onOutcome(option.key)}>
            {outcome === option.key && <CheckMark />}
            {option.label}
          </button>
        ))}
      </div>
      <textarea rows={2} aria-label="Note (optional)" placeholder="Add a note" value={note} onChange={(event) => onNote(event.target.value)} />
      {suggestions.length > 0 && (
        <div className="chips" role="group" aria-label="Note suggestions">
          {suggestions.map((suggestion) => (
            <button type="button" className="chip" key={suggestion} onClick={() => insert(suggestion)}>{suggestion}</button>
          ))}
        </div>
      )}
    </div>
  );
}

export function AlertPanel({
  result,
  saved,
  escalation,
  tab,
  stepId,
  sourceId,
  refresh,
}: {
  result: RetrievalResult;
  saved: SavedPlan | null;
  escalation?: Escalation;
  tab: WorkspaceTab;
  stepId: string | null;
  sourceId: string | null;
  refresh: () => void;
}) {
  const { asset, parent, included, applicableSop } = result;
  const alert = alertFor(asset.id) as Alert;
  const [outcome, setOutcome] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [error, setError] = useState<string | null>(null);
  const scroll = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroll.current?.scrollTo?.(0, 0);
  }, [tab]);

  const base = `#/asset/${asset.id}`;
  const savedSop = saved ? records.find((record) => record.id === saved.sopRecordId) : undefined;
  // A saved plan never creates a procedure: with no applicable SOP there is nothing to show.
  const procedure = applicableSop ? ((savedSop?.kind === 'sop' ? savedSop : applicableSop) as SopRecord) : null;
  const hasSop = Boolean(procedure);
  const planSaved = Boolean(saved);
  const findingSaved = Boolean(saved?.finding);
  const escalated = Boolean(escalation);
  const available = tabAvailability(hasSop, planSaved);
  const evidenceIds = saved ? saved.evidenceIds : included.map((item) => item.record.id);
  const kind = primaryActionKind({ hasAlert: true, hasSop, planSaved, findingSaved, escalated, tab });
  const german = language === 'de' && tab === 'plan' && procedure?.language === 'de';
  const safety = tab === 'finding' ? null : safetyMessage(procedure, german ? 'de' : 'en');
  const readings = included.find((item) => item.record.id === alert.sensorRecordId)?.record.readings ?? [];
  const moved = findingSaved || escalated;

  function goTab(next: WorkspaceTab) {
    window.location.hash = next === 'investigate' ? base : `${base}/${next}`;
  }

  function attempt(action: () => void) {
    try {
      action();
      setError(null);
      refresh();
    } catch {
      setError(SAVE_ERROR);
    }
  }

  function handleSavePlan() {
    if (!procedure) return;
    const sop = procedure;
    attempt(() => {
      savePlan({
        assetId: asset.id,
        sopRecordId: sop.id,
        stepIds: sop.steps.map((step) => step.id),
        evidenceIds,
        savedAt: new Date().toISOString(),
      });
      goTab('finding');
    });
  }

  function handleSaveFinding() {
    if (tab !== 'finding') {
      goTab('finding');
      return;
    }
    if (!outcome) return;
    attempt(() => {
      saveFinding(asset.id, { outcome, note: note.trim() || undefined, savedAt: new Date().toISOString() });
      goTab('investigate');
    });
  }

  function handleEscalate() {
    attempt(() => saveEscalation({ assetId: asset.id, escalatedAt: new Date().toISOString() }));
  }

  let action;
  if (kind === 'start-plan') {
    action = <PrimaryAction label="Start inspection plan" onClick={() => goTab('plan')} next="check the inspection steps" />;
  } else if (kind === 'save-plan') {
    const copy = COPY[german ? 'de' : 'en'];
    action = <PrimaryAction label={copy.save} onClick={handleSavePlan} next={copy.nextAfterSave} nextLabel={copy.nextLabel} />;
  } else if (kind === 'save-finding') {
    action = (
      <PrimaryAction
        label="Save finding"
        onClick={handleSaveFinding}
        disabled={tab === 'finding' && !outcome}
        hint="Pick one to save"
        next="record what you found"
      />
    );
  } else if (kind === 'escalate') {
    action = <PrimaryAction label="Escalate through site process" onClick={handleEscalate} next="send it to site review" />;
  } else {
    const after = saved?.finding ? inspectionStatus(saved.finding.outcome, records).next : 'wait for site review';
    action = <PrimaryAction label="Back to plant floor" href="#/" next={after} />;
  }

  const headline = escalated
    ? ESCALATION_HEADLINE
    : saved?.finding
      ? inspectionStatus(saved.finding.outcome, records).headline
      : `${asset.id} ${alert.title.toLowerCase()}`;
  const pills = statusPills(hasSop, findingSaved, escalated);
  const statusLine = escalated ? 'Escalated' : findingSaved ? 'Inspected' : 'Investigating';

  const tabs: TabDefinition[] = [
    { key: 'investigate', label: 'Investigate', enabled: true },
    { key: 'plan', label: hasSop ? 'Inspection plan' : 'No procedure', enabled: available.plan, blocked: !hasSop },
    { key: 'finding', label: 'Finding', enabled: available.finding },
  ];

  return (
    <>
      <header className="panel-head">
        <p className="location">{moved ? `${asset.id}, line` : 'Line'} {asset.line}{parent ? `, ${parent.type} ${parent.id}` : ''}</p>
        <h1 tabIndex={-1}>{headline}</h1>
        <p className="status-line">{statusLine}</p>
        <ol className="pills" aria-label="Machine status">
          {pills.map((pill) => (
            <li key={pill.label} className={`pill pill-${pill.state}`} aria-current={pill.state === 'current' ? 'step' : undefined}>
              {pill.label}
            </li>
          ))}
        </ol>
      </header>

      <div className="panel-body">
        <div className="panel-main">
        <div className="panel-scroll" ref={scroll}>
          <div className="panel-content">
            <div className="area-tabs">
              <WorkspaceTabs tabs={tabs} current={tab} onSelect={goTab} />
            </div>

            {safety && (
              <p className="safety area-safety" role="note"><AlertMark /> {safety}</p>
            )}

            {tab === 'investigate' && readings.length > 0 && (
              <section className="area-readings" aria-label="Current readings">
                <div className={`readings readings-${Math.min(readings.length, 3)}`}>
                  {readings.map((reading) => <ReadingCard key={reading.label} reading={reading} />)}
                </div>
                {moved && <p className="readings-note">Readings stay high until repaired.</p>}
                {summaryAllowed(result) && <SummaryCard result={result} sourceHref={(id) => `${base}/investigate/source/${id}`} />}
              </section>
            )}

            {error && <p className="error area-panel" role="alert">{error}</p>}

            <div className="tabpanel area-panel" role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabId(tab)}>
              {tab === 'investigate' && <InvestigateTab result={result} alert={alert} escalation={escalation} base={base} />}
              {tab === 'plan' && procedure && (
                <PlanTab procedure={procedure} saved={saved} evidenceIds={evidenceIds} language={language} onLanguage={setLanguage} stepId={stepId} base={base} />
              )}
              {tab === 'finding' && saved && (
                <FindingTab result={result} saved={saved} outcome={outcome} note={note} onOutcome={setOutcome} onNote={setNote} />
              )}
            </div>

            <div className="area-footer">
              <MachineSnapshot result={result} saved={saved} escalation={escalation} />
              <MachineHistory result={result} finding={saved?.finding} escalation={escalation} />
            </div>
          </div>
        </div>
        {sourceId && <SourceSheet result={result} recordId={sourceId} backHref={tab === 'investigate' ? base : `${base}/${tab}`} />}
        </div>
        {action}
      </div>
    </>
  );
}
