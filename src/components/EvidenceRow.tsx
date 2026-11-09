import type { EvidenceItem } from '../domain/types';
import { NoEntryMark } from './Icons';

/**
 * One line plus its label, with detail one tap away.
 * Excluded and uncertain records also say why, because that is required.
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
      <span className="row-top">
        <span className="row-lead">
          {tone === 'excluded' && <NoEntryMark />}
          {record.takeaway}
        </span>
        <span className={`tag${tone === 'uncertain' ? ' tag-dashed' : ''}`}>{label}</span>
      </span>
      {tone !== 'included' && (
        <span className="row-reason">
          {reason}
          {keywordMatch && (
            <>
              {' '}Keyword match: <mark>{keywordMatch}</mark>. A keyword alone does not make this evidence.
            </>
          )}
          <span className="row-id"> {record.id}</span>
        </span>
      )}
    </a>
  );
}
