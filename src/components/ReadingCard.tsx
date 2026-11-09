import { readingStatus } from '../domain/causes';
import type { Reading } from '../domain/types';
import { AlertMark } from './Icons';

function Sparkline({ reading }: { reading: Reading }) {
  const width = 88;
  const height = 24;
  const min = Math.min(...reading.history);
  const span = Math.max(...reading.history) - min || 1;
  const points = reading.history.map((value, index) => [
    (index / (reading.history.length - 1)) * (width - 6) + 3,
    height - 4 - ((value - min) / span) * (height - 8),
  ]);
  const [lastX, lastY] = points[points.length - 1];
  return (
    <svg
      className="sparkline"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-label={`${reading.label} over the last 48 hours, from ${reading.history[0]} to ${reading.value} ${reading.unit}`}
    >
      <polyline points={points.map((point) => point.join(',')).join(' ')} />
      <circle cx={lastX} cy={lastY} r="2.6" />
    </svg>
  );
}

export function ReadingCard({ reading }: { reading: Reading }) {
  const above = readingStatus(reading) === 'above';
  return (
    <div className={`reading${above ? ' is-above' : ''}`}>
      <p className="reading-label">{reading.label}</p>
      <p className="reading-value">
        {reading.value} <span className="reading-unit">{reading.unit}</span>
      </p>
      <Sparkline reading={reading} />
      <p className="reading-status">
        {above && <AlertMark />}
        {above ? 'Above' : 'Within'}, demo limit {reading.limit}
      </p>
    </div>
  );
}
