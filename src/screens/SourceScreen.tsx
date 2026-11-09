import { PrimaryAction } from '../components/PrimaryAction';
import type { RetrievalResult } from '../domain/types';

export function SourceScreen({
  result,
  recordId,
  backHref,
  backLabel,
}: {
  result: RetrievalResult;
  recordId: string;
  backHref: string;
  backLabel: string;
}) {
  const item = [...result.included, ...result.uncertain, ...result.excluded, ...result.comparison].find(
    (candidate) => candidate.record.id === recordId,
  );

  if (!item) {
    return (
      <div className="panel">
        <p>This source is not part of the records for {result.asset.id}.</p>
        <PrimaryAction label={backLabel} href={backHref} />
      </div>
    );
  }

  const { record } = item;
  const assetText =
    record.assetId ?? `Not named. Could be a ${record.candidateType} on line ${record.candidateLine}.`;

  return (
    <div className="panel">
      <h1>{record.id}</h1>
      <p className="row-title">{record.title}</p>
      <span className="pill">{item.label}</span>
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
      <PrimaryAction label={backLabel} href={backHref} />
    </div>
  );
}
