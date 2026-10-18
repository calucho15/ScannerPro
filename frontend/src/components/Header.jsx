import React from 'react';
import { Scan, Sparkles } from 'lucide-react';

export default function Header({ onHomeClick, onOpenChangelog }) {
  return (
    <header className="app-header">
      <div className="header-brand" onClick={onHomeClick} role="button" tabIndex={0}>
        <div className="logo-badge">
          <Scan className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <div className="header-title-row">
            <h1 className="header-title">ScannerPro</h1>
            <button
              type="button"
              className="version-pill-header"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenChangelog) onOpenChangelog();
              }}
              title="Toca para ver novedades de la versión v1.2.0"
            >
              <Sparkles className="w-3 h-3 text-emerald-400 mr-1" />
              <span>v1.2.0</span>
            </button>
          </div>
          <span className="header-subtitle">Escáner móvil y fotos carnet</span>
        </div>
      </div>
    </header>
  );
}
