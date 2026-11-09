import { readingStatus } from './causes';
import type { Asset, MaintenanceRecord, RetrievalResult } from './types';

/** A compact summary of one machine, built only from its data. */
export interface MachineSnapshot {
  reading: { text: string; above: boolean } | null;
  recordCount: number;
  latestRecord: MaintenanceRecord | null;
  procedure: string | null;
  connected: string;
}

const HISTORY_KINDS = ['incident', 'assembly'];

/** Dated records about this machine itself, newest first. The history list and the snapshot count share this. */
export function machineHistory(result: RetrievalResult): MaintenanceRecord[] {
  return result.included
    .map((item) => item.record)
    .filter((record) => HISTORY_KINDS.includes(record.kind) && record.assetId === result.asset.id && record.occurredOn)
    .sort((a, b) => (b.occurredOn ?? '').localeCompare(a.occurredOn ?? ''));
}

export function machineSnapshot(result: RetrievalResult, assets: Asset[]): MachineSnapshot {
  const { asset, parent, siblings, included, applicableSop } = result;

  const readings = included.find((item) => item.record.kind === 'sensor' && item.record.assetId === asset.id)?.record.readings ?? [];
  const reading = readings.find((item) => readingStatus(item) === 'above') ?? readings[0];
  const above = reading ? readingStatus(reading) === 'above' : false;

  const history = machineHistory(result);

  const children = assets.filter((candidate) => candidate.parentId === asset.id).map((child) => child.id);
  let connected = 'Standalone machine';
  if (parent) {
    const others = siblings.map((sibling) => sibling.id).join(', ');
    connected = others ? `Part of ${parent.id}, with ${others}` : `Part of ${parent.id}`;
  } else if (children.length > 0) {
    connected = `Includes ${children.join(', ')}`;
  }

  let readingSummary: MachineSnapshot['reading'] = null;
  if (reading) {
    readingSummary = {
      text: `${reading.value} ${reading.unit}, ${above ? 'above' : 'within'} demo limit ${reading.limit}`,
      above,
    };
  } else if (asset.liveValue) {
    readingSummary = { text: asset.liveValue, above: false };
  }

  return {
    reading: readingSummary,
    recordCount: history.length,
    latestRecord: history[0] ?? null,
    procedure: applicableSop ? `${applicableSop.sopNumber} rev ${applicableSop.revision} available` : null,
    connected,
  };
}
