import type { RetrievalResult } from '../domain/types';
import { EvidenceRecords } from './EvidenceRecords';
import { MachineHistory } from './MachineHistory';
import { MachineSnapshot } from './MachineSnapshot';
import { PrimaryAction } from './PrimaryAction';
import { SourceSheet } from './SourceSheet';

/** A machine with no active alert: its snapshot and its own records. */
export function MachinePanel({ result, sourceId }: { result: RetrievalResult; sourceId: string | null }) {
  const { asset, parent } = result;
  const base = `#/asset/${asset.id}`;
  return (
    <>
      <header className="panel-head">
        <div className="head-row">
          <div className="head-text">
            <p className="location">Line {asset.line}{parent ? `, ${parent.type} ${parent.id}` : ''}</p>
            <h1 tabIndex={-1}>{asset.name}</h1>
            <p className="status-line status-line-always">No active alert</p>
          </div>
          <PrimaryAction label="Back to plant floor" href="#/" />
        </div>
      </header>
      <div className="panel-body">
        <div className="panel-scroll">
          <div className="panel-content">
            <MachineSnapshot result={result} saved={null} />
            <EvidenceRecords result={result} sourceHref={(id) => `${base}/investigate/source/${id}`} openUsed />
            <MachineHistory result={result} />
          </div>
        </div>
        {sourceId && <SourceSheet result={result} recordId={sourceId} backHref={base} />}
      </div>
    </>
  );
}
