import { INSPECTION_STAGES } from '../domain/status';
import { CheckMark } from './Icons';

const DONE_THROUGH = INSPECTION_STAGES.indexOf('Inspected');

/** Where the machine stands. Later stages are shown, not actionable, in this prototype. */
export function StatusTrack() {
  return (
    <ol className="track" aria-label="Machine status">
      {INSPECTION_STAGES.map((stage, index) => {
        const state = index <= DONE_THROUGH ? 'is-done' : index === DONE_THROUGH + 1 ? 'is-next' : '';
        return (
          <li key={stage} className={state}>
            <span className="track-mark" aria-hidden="true">{index <= DONE_THROUGH ? <CheckMark /> : index + 1}</span>
            <span className="track-label">{stage}</span>
            {state === 'is-next' && <span className="track-next">Next</span>}
          </li>
        );
      })}
    </ol>
  );
}
