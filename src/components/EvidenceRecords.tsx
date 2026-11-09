import { dataset } from '../data';
import { listPreview, usedPreview } from '../domain/causes';
import type { EvidenceItem, RetrievalResult } from '../domain/types';
import { recordsChecked } from '../domain/workspace';
import { EvidenceGroup } from './EvidenceGroup';
import { EvidenceRow } from './EvidenceRow';

export function EvidenceRecords({
  result,
  sourceHref,
  openUsed,
}: {
  result: RetrievalResult;
  sourceHref: (recordId: string) => string;
  openUsed?: boolean;
}) {
  const { included, uncertain, excluded } = result;

  function rows(list: EvidenceItem[], tone: 'included' | 'uncertain' | 'excluded') {
    return list.map((item) => (
      <EvidenceRow key={item.record.id} item={item} sourceHref={sourceHref(item.record.id)} tone={tone} />
    ));
  }

  return (
    <section className="records" aria-label="Records checked">
      <h2>{recordsChecked(dataset)} records checked</h2>
      <div className="groups">
        {included.length > 0 && (
          <EvidenceGroup title="Used as evidence" count={included.length} preview={usedPreview(included)} open={openUsed || undefined}>
            {rows(included, 'included')}
          </EvidenceGroup>
        )}
        {uncertain.length > 0 && (
          <EvidenceGroup title="Not sure it applies" count={uncertain.length} preview={listPreview(uncertain)}>
            {rows(uncertain, 'uncertain')}
          </EvidenceGroup>
        )}
        {excluded.length > 0 && (
          <EvidenceGroup title="Left out" count={excluded.length} preview={listPreview(excluded)}>
            {rows(excluded, 'excluded')}
          </EvidenceGroup>
        )}
      </div>
    </section>
  );
}
