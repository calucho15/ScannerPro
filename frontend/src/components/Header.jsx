import React from 'react';
import { Scan, Cloud, CloudOff, ShieldCheck } from 'lucide-react';

export default function Header({ driveStatus, onOpenDriveModal, onHomeClick }) {
  return (
    <header className="app-header">
      <div className="header-brand" onClick={onHomeClick} role="button" tabIndex={0}>
        <div className="logo-badge">
          <Scan className="w-6 h-6 text-emerald-400" />
        </div>
        <div>
          <h1 className="header-title">ScannerPro</h1>
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
