import { useEffect, useRef } from 'react';
import { PrimaryAction } from '../components/PrimaryAction';
import { Screen } from '../components/Screen';
import type { RetrievalResult } from '../domain/types';

export function SourceScreen({
  result,
  recordId,
  stepId,
  backHref,
  backLabel,
}: {
  result: RetrievalResult;
  recordId: string;
  stepId?: string;
  backHref: string;
  backLabel: string;
}) {
  const target = useRef<HTMLLIElement>(null);
  useEffect(() => {
    target.current?.scrollIntoView?.({ block: 'center' });
  }, [stepId]);

  const action = <PrimaryAction label={backLabel} href={backHref} />;
  const item = [...result.included, ...result.uncertain, ...result.excluded, ...result.comparison].find(
    (candidate) => candidate.record.id === recordId,
  );

  if (!item) {
    return (
      <Screen action={action}>
        <p>This source is not part of the records for {result.asset.id}.</p>
      </Screen>
    );
  }

  const { record } = item;
  const assetText =
    record.assetId ?? `Not named. Could be a ${record.candidateType} on line ${record.candidateLine}.`;

  return (
    <Screen action={action}>
      <h1>{record.takeaway}</h1>
      <p className="row-meta">
        <span className="tag">{item.label}</span>
        <span className="row-id">{record.title}</span>
      </p>
      <dl className="source">
        <dt>ID</dt>
        <dd>{record.id}</dd>
        <dt>Asset</dt>
        <dd>{assetText}</dd>
        <dt>Language</dt>
        <dd>{record.language === 'de' ? 'German' : 'English'}</dd>
        {record.kind === 'sop' && (
          <>
            <dt>Revision</dt>
            <dd>{record.revision} ({record.status})</dd>
          </>
        )}
        <dt>Original excerpt</dt>
        <dd lang={record.language}><blockquote>{record.excerpt}</blockquote></dd>
        <dt>English explanation</dt>
        <dd>{record.englishExplanation}</dd>
        <dt>Relevance</dt>
        <dd>
          {item.reason}
          {item.keywordMatch && <> Keyword match: <mark>{item.keywordMatch}</mark>.</>}
        </dd>
        <dt>Limitation</dt>
        <dd>{record.limitation}</dd>
      </dl>
      {record.kind === 'sop' && (
        <section>
          <h2>Steps in this revision</h2>
          <ol className="source-steps">
            {record.steps.map((step) => (
              <li key={step.id} ref={step.id === stepId ? target : undefined} className={step.id === stepId ? 'is-target' : undefined}>
                <p>{step.english}</p>
                {step.expectedEnglish && <p className="expected">You should see: {step.expectedEnglish}</p>}
                <p className="german" lang={record.language}>{step.original}{step.expectedOriginal ? ` ${step.expectedOriginal}` : ''}</p>
              </li>
            ))}
          </ol>
        </section>
      )}
    </Screen>
  );
}
