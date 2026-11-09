import type { EvidenceItem } from '../domain/types';

export function EvidenceCard({ item, sourceHref }: { item: EvidenceItem; sourceHref: string }) {
  const { record, label, reason, keywordMatch } = item;
  return (
    <article className="card">
      <div className="card-top">
        <span className="pill">{label}</span>
        <span className="card-lang">{record.language === 'de' ? 'German' : 'English'}</span>
      </div>
      <h3>
        <a href={sourceHref}>{record.id}</a>
      </h3>
      <p className="card-title">{record.title}</p>
      <p className="card-reason">
        <strong>Why: </strong>
        {reason}
        {keywordMatch && (
          <span className="keyword">
            {' '}Keyword match: <mark>{keywordMatch}</mark>. A keyword alone does not make this evidence.
          </span>
        )}
      </p>
    </article>
  );
}
