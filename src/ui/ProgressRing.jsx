export default function ProgressRing({ percent = 0 }) {
  const value = Math.max(0, Math.min(100, Math.round(Number(percent) || 0)));
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="progress-ring" role="img" aria-label={`Assessment score ${value}%`}>
      <svg viewBox="0 0 100 100" width="120" height="120">
        <circle cx="50" cy="50" r={radius} className="progress-ring-track" />
        <circle
          cx="50"
          cy="50"
          r={radius}
          className="progress-ring-value"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <strong>{value}%</strong>
    </div>
  );
}
