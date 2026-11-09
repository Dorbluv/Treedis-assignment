import type { EvidenceItem } from '../domain/types';

export function EvidenceCard({ item, sourceHref }: { item: EvidenceItem; sourceHref: string }) {
  const { record, label, reason, keywordMatch } = item;
  return (
    <article className="row">
      <div className="row-top">
        <a href={sourceHref} className="row-id">{record.id}</a>
        <span className="pill">{label}</span>
        {record.language === 'de' && <span className="row-lang">German</span>}
      </div>
      <p className="row-title">{record.title}</p>
      <p className="row-reason">
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
