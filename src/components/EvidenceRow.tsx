import type { EvidenceItem } from '../domain/types';
import { NoEntryMark } from './Icons';

/**
 * One compact record, with its detail one tap away.
 * Included records show takeaway and label only. Excluded and uncertain ones also say why.
 */
export function EvidenceRow({
  item,
  sourceHref,
  tone = 'included',
}: {
  item: EvidenceItem;
  sourceHref: string;
  tone?: 'included' | 'uncertain' | 'excluded';
}) {
  const { record, label, reason, keywordMatch } = item;
  return (
    <a className={`row row-${tone}`} href={sourceHref}>
      <span className="row-lead">
        {tone === 'excluded' && <NoEntryMark />}
        {record.takeaway}
      </span>
      <span className="row-meta">
        <span className={`tag${tone === 'uncertain' ? ' tag-dashed' : ''}`}>{label}</span>
        <span className="row-id">{record.id}{record.language === 'de' ? ', German' : ''}</span>
      </span>
      {tone !== 'included' && (
        <span className="row-reason">
          {reason}
          {keywordMatch && (
            <>
              {' '}Keyword match: <mark>{keywordMatch}</mark>. A keyword alone does not make this evidence.
            </>
          )}
        </span>
      )}
    </a>
  );
}
