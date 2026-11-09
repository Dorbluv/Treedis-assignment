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

/** Causes no procedure step can test, such as on a machine with no applicable SOP. */
export function causesWithoutStep(result: RetrievalResult): { cause: CauseItem; record: MaintenanceRecord }[] {
  const linked = new Set(causeComparison(result).map((item) => item.cause.recordId));
  return result.possibleCauses.flatMap((cause) => {
    const record = result.included.find((item) => item.record.id === cause.recordId)?.record;
    return record && !linked.has(cause.recordId) ? [{ cause, record }] : [];
  });
}

/** Records the technician can actually look at. Left-out records alone are not a review. */
export function hasReviewableEvidence(result: RetrievalResult): boolean {
  return result.included.length + result.uncertain.length > 0;
}

export function separatingSentence(items: CauseComparisonItem[]): string {
  const steps = items.map((item) => item.stepNumber).sort((a, b) => a - b);
  return `Neither is confirmed. Steps ${steps.join(' and ')} tell them apart.`;
}

export interface ContextStepNote {
  stepId: string;
  stepNumber: number;
  checks: string;
  recordId: string;
  assetType: string;
}

/** Steps prompted by a record that retrieval used as assembly context, and not by any cause. */
export function contextStepNotes(result: RetrievalResult): ContextStepNote[] {
  const sop = result.applicableSop;
  if (!sop || !result.parent) return [];
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
        assetType: result.asset.type,
      });
    }
  });
  return notes;
}

function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}

function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "Gearbox report that mentions vibration, older procedure" */
export function listPreview(items: EvidenceItem[]): string {
  return items.map((item, index) => (index === 0 ? item.record.takeaway : lowerFirst(item.record.takeaway))).join(', ');
}

/** "Readings, 2 past incidents, conveyor record, procedure" */
export function usedPreview(items: EvidenceItem[]): string {
  const count = (kind: string) => items.filter((item) => item.record.kind === kind).length;
  const incidents = count('incident');
  const parts = [
    count('sensor') > 0 ? 'readings' : '',
    incidents > 0 ? `${incidents} past incident${incidents > 1 ? 's' : ''}` : '',
    count('assembly') > 0 ? 'conveyor record' : '',
    count('sop') > 0 ? 'procedure' : '',
  ].filter(Boolean);
  return capitalize(parts.join(', '));
}
