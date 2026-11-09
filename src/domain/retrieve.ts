import type {
  Alert,
  Asset,
  CauseItem,
  Dataset,
  MaintenanceRecord,
  RetrievalResult,
  SopRecord,
} from './types';

function overlaps(a: string[], b: string[]): boolean {
  return a.some((value) => b.includes(value));
}

function directLabel(record: MaintenanceRecord): string {
  if (record.kind === 'sensor') return 'Current reading';
  if (record.kind === 'sop') return 'Applicable procedure';
  return 'Direct asset history';
}

function supersedingRevision(record: SopRecord, records: MaintenanceRecord[]): string | null {
  const current = records.find(
    (other): other is SopRecord =>
      other.kind === 'sop' &&
      other.sopNumber === record.sopNumber &&
      other.assetId === record.assetId &&
      other.status === 'current',
  );
  return current ? current.revision : null;
}

/** Display only: runs after classification and never decides eligibility. */
function findKeyword(record: MaintenanceRecord, alert: Alert | null): string | undefined {
  if (!alert) return undefined;
  const text = `${record.title} ${record.excerpt}`.toLowerCase();
  return alert.keywords.find((keyword) => text.includes(keyword.toLowerCase()));
}

/**
 * Deterministic retrieval from structured equipment metadata.
 * The first matching rule wins for each record.
 */
export function retrieve(assetId: string, alert: Alert | null, data: Dataset): RetrievalResult {
  const asset = data.assets.find((candidate) => candidate.id === assetId);
  if (!asset) throw new Error(`Unknown asset: ${assetId}`);

  const parent: Asset | null = asset.parentId
    ? data.assets.find((candidate) => candidate.id === asset.parentId) ?? null
    : null;
  const siblings = asset.parentId
    ? data.assets.filter(
        (candidate) => candidate.parentId === asset.parentId && candidate.id !== asset.id,
      )
    : [];

  const alertConditions = alert?.conditions ?? [];
  const result: RetrievalResult = {
    asset,
    parent,
    siblings,
    included: [],
    excluded: [],
    uncertain: [],
    comparison: [],
    applicableSop: null,
    possibleCauses: [],
  };
  const causes: CauseItem[] = [];

  for (const record of data.records) {
    // Rule 1: a superseded SOP is shown only for its own asset.
    if (record.kind === 'sop' && record.status === 'superseded') {
      if (record.assetId === asset.id) {
        const revision = supersedingRevision(record, data.records);
        const by = revision ? `Superseded by rev ${revision}` : 'Superseded';
        result.excluded.push({
          record,
          label: by,
          reason: `${by}. Not used for the inspection plan.`,
        });
      }
      continue;
    }

    // Rule 2: unknown applicability is flagged only for plausible assets.
    if (record.assetId === null) {
      if (record.candidateLine === asset.line && record.candidateType === asset.type) {
        result.uncertain.push({
          record,
          label: 'Applicability unknown',
          reason: `Mentions a ${record.candidateType} on line ${record.candidateLine} without naming one. It may or may not be about ${asset.id}.`,
        });
      }
      continue;
    }

    // Rule 3: exact asset.
    if (record.assetId === asset.id) {
      const matchesAlert = overlaps(record.conditions, alertConditions);
      let reason = `Recorded against ${asset.id}, the selected asset.`;
      if (record.kind === 'incident' && record.possibleCause && !matchesAlert) {
        reason += ' Its condition differs from this alert, so it is not used as a possible cause.';
      }
      result.included.push({ record, label: directLabel(record), reason });

      if (record.kind === 'sop' && record.status === 'current') {
        result.applicableSop = record;
      }
      if (record.kind === 'incident' && record.possibleCause && matchesAlert) {
        causes.push({ ...record.possibleCause, recordId: record.id });
      }
      continue;
    }

    // Rule 4: parent assembly, when relevant to the alert.
    if (asset.parentId !== null && record.assetId === asset.parentId) {
      if (overlaps(record.conditions, alertConditions)) {
        result.included.push({
          record,
          label: 'Assembly-level context',
          reason: `Recorded against ${asset.parentId}, the conveyor this motor is part of, and relates to the same condition as the alert.`,
        });
      }
      continue;
    }

    // Rule 5: sibling component.
    if (siblings.some((sibling) => sibling.id === record.assetId)) {
      if (record.linkedAssetIds.includes(asset.id)) {
        result.included.push({
          record,
          label: 'Linked component record',
          reason: `Recorded against ${record.assetId}, and the record explicitly links to ${asset.id}.`,
        });
      } else {
        result.excluded.push({
          record,
          label: 'Excluded: different component',
          reason: `Recorded against ${record.assetId}, a different component on the same conveyor. The record does not link to ${asset.id}.`,
          keywordMatch: findKeyword(record, alert),
        });
      }
      continue;
    }

    // Rule 6: same equipment type elsewhere.
    const recordAsset = data.assets.find((candidate) => candidate.id === record.assetId);
    if (recordAsset && recordAsset.type === asset.type) {
      result.comparison.push({
        record,
        label: 'Comparison only',
        reason: `Recorded against ${record.assetId}, the same equipment type elsewhere. This is not ${asset.id}'s history.`,
      });
    }
    // Rule 7: anything else is dropped.
  }

  result.possibleCauses = causes;
  return result;
}
