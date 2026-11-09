import type { CauseItem, EvidenceItem, MaintenanceRecord, Reading, RetrievalResult, SopStep } from './types';

/** Display helpers over an existing retrieval result. They never change it. */

export type ReadingStatus = 'above' | 'within';

export function readingStatus(reading: Pick<Reading, 'value' | 'limit'>): ReadingStatus {
  return reading.value > reading.limit ? 'above' : 'within';
}

export interface CauseComparisonItem {
  cause: CauseItem;
  record: MaintenanceRecord;
  step: SopStep;
  stepNumber: number;
}

export function causeComparison(result: RetrievalResult): CauseComparisonItem[] {
  const sop = result.applicableSop;
  if (!sop) return [];
  const items: CauseComparisonItem[] = [];
  for (const cause of result.possibleCauses) {
    const record = result.included.find((item) => item.record.id === cause.recordId)?.record;
    const stepIndex = sop.steps.findIndex((step) => step.id === record?.testedByStepId);
    if (record && stepIndex >= 0) {
      items.push({ cause, record, step: sop.steps[stepIndex], stepNumber: stepIndex + 1 });
    }
  }
  return items;
}

export function separatingSentence(items: CauseComparisonItem[]): string {
  const steps = items.map((item) => item.stepNumber).sort((a, b) => a - b);
  return `Neither is confirmed. Steps ${steps.join(' and ')} of the inspection separate them.`;
}

export interface ContextStepNote {
  stepId: string;
  stepNumber: number;
  checks: string;
  recordId: string;
  parentType: string;
  assetType: string;
}

/** Steps prompted by a record that retrieval used as assembly context, and not by any cause. */
export function contextStepNotes(result: RetrievalResult): ContextStepNote[] {
  const sop = result.applicableSop;
  if (!sop || !result.parent) return [];
  const parentType = result.parent.type;
  const testedByCauses = new Set(causeComparison(result).map((item) => item.step.id));
  const notes: ContextStepNote[] = [];
  sop.steps.forEach((step, index) => {
    const usedAsContext = result.included.some(
      (item) => item.record.id === step.contextRecordId && item.label === 'Assembly-level context',
    );
    if (step.checks && step.contextRecordId && usedAsContext && !testedByCauses.has(step.id)) {
      notes.push({
        stepId: step.id,
        stepNumber: index + 1,
        checks: step.checks,
        recordId: step.contextRecordId,
        parentType,
        assetType: result.asset.type,
      });
    }
  });
  return notes;
}

/** Excluded records that a keyword search would have surfaced. */
export function keywordExclusions(result: RetrievalResult): EvidenceItem[] {
  return result.excluded.filter((item) => item.keywordMatch);
}

export function leftOutSummary(result: RetrievalResult, assetTypeOf: (assetId: string) => string): string | null {
  const items = keywordExclusions(result);
  if (items.length === 0) return null;
  if (items.length > 1) return `${items.length} records left out that also mention ${items[0].keywordMatch}.`;
  const [item] = items;
  const type = item.record.assetId ? assetTypeOf(item.record.assetId) : 'equipment';
  return `1 record left out: ${type} report that also mentions ${item.keywordMatch}.`;
}
