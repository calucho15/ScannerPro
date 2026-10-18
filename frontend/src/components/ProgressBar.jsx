import React from 'react';
import { Loader2 } from 'lucide-react';

export default function ProgressBar({
  progress = 0, // 0 a 100
  title = "Procesando...",
  statusText = "Por favor espera un momento",
  isOverlay = true
}) {
  const clampedProgress = Math.min(100, Math.max(0, Math.round(progress)));

  const content = (
    <div className="processing-progress-card">
      <div className="progress-card-header">
        <div className="flex items-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
          <h4 className="progress-card-title">{title}</h4>
        </div>
        <span className="progress-percentage-label">{clampedProgress}%</span>
      </div>

      <div className="progress-track">
        <div
          className="progress-fill"
          style={{ width: `${clampedProgress}%` }}
        />
      </div>

      <div className="progress-card-footer">
        <span className="progress-status-text">{statusText}</span>
      </div>
    </div>
  );

  if (!isOverlay) {
    return content;
  }

  return (
    <div className="processing-progress-overlay">
      {content}
    </div>
  );
}
