import React from 'react';

interface ProgressBarProps {
  current: number;
  target: number;
  className?: string;
}

const ProgressBar: React.FC<ProgressBarProps> = ({ current, target, className = '' }) => {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0;
  const color = pct >= 100 ? '#22c55e' : pct >= 60 ? '#f59e0b' : '#3b82f6';

  return (
    <div className={`progress-wrapper ${className}`}>
      <div className="progress-bar-track">
        <div
          className="progress-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={target}
        />
      </div>
      <div className="progress-labels">
        <span>
          {current.toLocaleString()} / {target.toLocaleString()} units
        </span>
        <span className="progress-pct" style={{ color }}>
          {pct}%
        </span>
      </div>
    </div>
  );
};

export default ProgressBar;
