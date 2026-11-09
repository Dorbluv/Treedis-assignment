export type AssetType = 'conveyor' | 'motor' | 'gearbox' | 'filler';

export interface Asset {
  id: string;
  name: string;
  type: AssetType;
  parentId: string | null;
  line: string;
  /** Display only: a synthetic value for the plant floor when no sensor record exists. */
  liveValue?: string;
}

export interface Alert {
  id: string;
  assetId: string;
  title: string;
  conditions: string[];
  keywords: string[];
  sensorRecordId: string;
  /** Synthetic: when the alert started and how long ago, for the queue and activity strip. */
  raisedAt: string;
  age: string;
}

export type RecordKind = 'sensor' | 'incident' | 'assembly' | 'note' | 'sop';
export type Language = 'en' | 'de';

export interface PossibleCause {
  key: string;
  label: string;
}

/** Display only. The status is computed from value and limit, never stored. */
export interface Reading {
  label: string;
  unit: string;
  value: number;
  limit: number;
  history: number[];
}

interface RecordBase {
  id: string;
  kind: RecordKind;
  title: string;
  linkedAssetIds: string[];
  conditions: string[];
  language: Language;
  excerpt: string;
  englishExplanation: string;
  limitation: string;
  possibleCause?: PossibleCause;
  /** Display only: what this record tells the technician. */
  takeaway: string;
  // Display only, never read by retrieval.
  occurredOn?: string;
  fix?: string;
  downtimeHours?: number;
  testedByStepId?: string;
  noteSuggestions?: string[];
  readings?: Reading[];
}

/** The record names one asset. */
interface KnownApplicability {
  assetId: string;
}

/** The record does not name an asset, so it can only be flagged for plausible ones. */
interface UnknownApplicability {
  assetId: null;
  candidateLine: string;
  candidateType: AssetType;
}

export type PlainRecord = RecordBase & (KnownApplicability | UnknownApplicability) & {
  kind: 'sensor' | 'incident' | 'assembly' | 'note';
};

export interface SopStep {
  id: string;
  original: string;
  english: string;
  title?: string;
  titleGerman?: string;
  goodEnglish?: string;
  goodGerman?: string;
  ifNotEnglish?: string;
  ifNotGerman?: string;
  /** Display only: the short check named on a cause card. */
  checkPhrase?: string;
  /** Display only: what this step checks when a record, not a cause, prompts it. */
  checks?: string;
  contextRecordId?: string;
}

export type SopRecord = RecordBase & KnownApplicability & {
  kind: 'sop';
  sopNumber: string;
  revision: string;
  status: 'current' | 'superseded';
  steps: SopStep[];
};

export type MaintenanceRecord = PlainRecord | SopRecord;

export interface Dataset {
  assets: Asset[];
  records: MaintenanceRecord[];
}

export interface EvidenceItem {
  record: MaintenanceRecord;
  label: string;
  /** Why the record was included or excluded. Shown as "relevance". */
  reason: string;
  /** Display only. Computed after classification, so it cannot affect eligibility. */
  keywordMatch?: string;
}

export interface CauseItem extends PossibleCause {
  recordId: string;
}

export interface RetrievalResult {
  asset: Asset;
  parent: Asset | null;
  siblings: Asset[];
  included: EvidenceItem[];
  excluded: EvidenceItem[];
  uncertain: EvidenceItem[];
  comparison: EvidenceItem[];
  applicableSop: SopRecord | null;
  possibleCauses: CauseItem[];
}

export interface Finding {
  outcome: string;
  note?: string;
  savedAt: string;
}

export interface Escalation {
  assetId: string;
  escalatedAt: string;
}

export interface SavedPlan {
  assetId: string;
  sopRecordId: string;
  stepIds: string[];
  evidenceIds: string[];
  savedAt: string;
  finding?: Finding;
}
