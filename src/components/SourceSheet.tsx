import { useEffect, useRef } from 'react';
import type { RetrievalResult } from '../domain/types';
import { recordLine } from '../screens/format';
import { PrimaryAction } from './PrimaryAction';

/** A source record: slides over the panel, and fills the screen on phone. */
export function SourceSheet({
  result,
  recordId,
  backHref,
}: {
  result: RetrievalResult;
  recordId: string;
  backHref: string;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') window.location.hash = backHref;
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [backHref]);

  const item = [...result.included, ...result.uncertain, ...result.excluded, ...result.comparison].find(
    (candidate) => candidate.record.id === recordId,
  );
  const record = item?.record;
  const assetText = record ? record.assetId ?? `Not named. Could be a ${record.candidateType} on line ${record.candidateLine}.` : '';

  return (
    <div className="sheet" role="dialog" aria-label="Source record">
      <div className="sheet-scroll">
        <div className="sheet-head">
          <a className="sheet-close" href={backHref}>Close</a>
        </div>
        {item && record ? (
          <>
            <h2 ref={heading} tabIndex={-1}>{recordLine(record)}</h2>
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
          </>
        ) : (
          <h2 ref={heading} tabIndex={-1}>This source is not part of the records for {result.asset.id}.</h2>
        )}
      </div>
      <div className="sheet-action">
        <PrimaryAction label="Back" href={backHref} />
      </div>
    </div>
  );
}
