import React from 'react';
import { Scan, Cloud, CloudOff, Sparkles } from 'lucide-react';

export default function Header({ driveStatus, onOpenDriveModal, onHomeClick, onOpenChangelog }) {
  return (
    <header className="app-header">
      <div className="header-brand" onClick={onHomeClick} role="button" tabIndex={0}>
        <div className="logo-badge">
          <Scan className="w-6 h-6 text-emerald-400" />
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
              title="Toca para ver novedades de la versión v1.1.0"
            >
              <Sparkles className="w-3 h-3 text-emerald-400 mr-1" />
              <span>v1.1.0</span>
            </button>
          </div>
          <span className="header-subtitle">Libre de publicidad • Sin marcas de agua</span>
        </div>
      </div>

      <div className="header-actions">
        <button
          className={`drive-status-btn ${driveStatus?.authenticated ? 'connected' : 'disconnected'}`}
          onClick={onOpenDriveModal}
          title={driveStatus?.authenticated ? "Google Drive Conectado" : "Conectar Google Drive"}
        >
          {driveStatus?.authenticated ? (
            <>
              <Cloud className="w-4 h-4 text-emerald-400" />
              <span className="btn-text">Drive Activo</span>
            </>
          ) : (
            <>
              <CloudOff className="w-4 h-4 text-gray-400" />
              <span className="btn-text">Conectar Drive</span>
            </>
          )}
        </button>
      </div>
    </header>
  );
}
