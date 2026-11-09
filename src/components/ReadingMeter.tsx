import { readingStatus } from '../domain/causes';
import type { Reading } from '../domain/types';
import { AlertMark } from './Icons';

function Sparkline({ reading }: { reading: Reading }) {
  const width = 64;
  const height = 22;
  const min = Math.min(...reading.history);
  const span = Math.max(...reading.history) - min || 1;
  const points = reading.history.map((value, index) => [
    (index / (reading.history.length - 1)) * (width - 4) + 2,
    height - 3 - ((value - min) / span) * (height - 6),
  ]);
  const [lastX, lastY] = points[points.length - 1];
  const first = reading.history[0];
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${reading.label} over the last 48 hours, from ${first} to ${reading.value} ${reading.unit}`}
    >
      <polyline points={points.map((point) => point.join(',')).join(' ')} />
      <circle cx={lastX} cy={lastY} r="2.4" />
    </svg>
  );
}

export function ReadingMeter({ reading }: { reading: Reading }) {
  const above = readingStatus(reading) === 'above';
  const scale = Math.max(reading.limit, reading.value) * 1.2;
  const limitAt = (reading.limit / scale) * 100;
  const valueAt = (reading.value / scale) * 100;
  return (
    <div className={`meter${above ? ' is-above' : ''}`}>
      <p className="meter-label">{reading.label}</p>
      <p className="meter-value">
        {reading.value} <span className="meter-unit">{reading.unit}</span>
      </p>
      <div className="meter-bar" aria-hidden="true">
        <span className="meter-fill" style={{ width: `${Math.min(valueAt, limitAt)}%` }} />
        {above && <span className="meter-over" style={{ left: `${limitAt}%`, width: `${valueAt - limitAt}%` }} />}
        <span className="meter-limit" style={{ left: `${limitAt}%` }} />
      </div>
      <p className="meter-status">
        {above && <AlertMark />}
        {above ? 'Above' : 'Within'} limit {reading.limit}
      </p>
      <Sparkline reading={reading} />
    </div>
  );
}
