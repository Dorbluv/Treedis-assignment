import { alerts, records } from '../data';
import { activityEvents } from '../domain/workspace';
import { formatDateTime } from '../screens/format';
import type { EscalationMap, PlanMap } from '../storage/plans';
import { AlertMark } from './Icons';
import { IsoFloor } from './IsoFloor';

export function FloorColumn({
  selectedId,
  plans,
  escalations,
  animate,
  showReset,
  onReset,
}: {
  selectedId: string | null;
  plans: PlanMap;
  escalations: EscalationMap;
  animate: boolean;
  showReset: boolean;
  onReset: () => void;
}) {
  const events = activityEvents(alerts, plans, escalations, records);
  return (
    <section className="floor-col" aria-label="Plant floor">
      <div className="floor-head">
        <h2>Plant floor</h2>
        <ul className="legend" aria-label="Legend">
          <li><span className="mark-normal" /> No alert</li>
          <li><AlertMark /> Alert</li>
          <li><span className="mark-selected" /> Selected</li>
          <li><span className="mark-inspected" /> Inspected</li>
          <li><span className="mark-escalated" /> Escalated</li>
        </ul>
      </div>
      <div className="floor-stage">
        <IsoFloor selectedId={selectedId} plans={plans} escalations={escalations} animate={animate} />
      </div>
      <div className="activity">
        <ol className="activity-list" aria-label="Activity">
          {events.map((event) => (
            <li key={`${event.at}-${event.text}`}>
              <span className="activity-time">{formatDateTime(event.at)}</span> {event.text}
            </li>
          ))}
        </ol>
        {showReset && <button type="button" className="reset" onClick={onReset}>Reset demo</button>}
      </div>
    </section>
  );
}
