import React, { useState } from 'react';
import { X, Cloud, Key, CheckCircle, AlertCircle, LogOut, ExternalLink, Loader2 } from 'lucide-react';
import { getDriveAuthUrl, disconnectDrive } from '../services/api';

export default function GDriveModal({ isOpen, onClose, driveStatus, onStatusRefresh }) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!isOpen) return null;

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await getDriveAuthUrl();
      if (data.auth_url) {
        // Redirigir a Google para autorización
        window.location.href = data.auth_url;
      }
    } catch (err) {
      setErrorMsg(err.message || "Error al obtener enlace de inicio de sesión con Google.");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    try {
      await disconnectDrive();
      onStatusRefresh();
    } catch (err) {
      alert("Error al desconectar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <Cloud className="w-6 h-6 text-emerald-400" />
            <h3 className="modal-title">Conexión con Google Drive</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Cerrar">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="modal-body">
          {driveStatus?.authenticated ? (
            <div className="gdrive-status-box connected">
              <CheckCircle className="w-8 h-8 text-emerald-400 mb-2" />
              <h4>¡Tu cuenta de Google está conectada!</h4>
              <p>
                Todos tus escaneos se guardarán automáticamente en una carpeta dedicada llamada{' '}
                <strong>"Mi CamScanner"</strong> dentro de tu Google Drive personal.
              </p>
              <button
                className="btn-danger-outline mt-4"
                onClick={handleDisconnect}
                disabled={loading}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Desconectar cuenta
              </button>
            </div>
          ) : (
            <div className="gdrive-setup-flow">
              {!driveStatus?.configured ? (
                <div className="alert-box warning">
                  <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
                  <div>
                    <strong>Paso previo necesario:</strong>
                    <p className="text-sm mt-1">
                      Para conectar con tu Google Drive sin costo, se necesita colocar el archivo{' '}
                      <code>client_secrets.json</code> en la carpeta <code>backend/</code>.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="setup-steps-list">
                <div className="step-item">
                  <span className="step-num">1</span>
                  <div>
                    <strong>Crea un proyecto en Google Cloud</strong>
                    <p>
                      Entra a{' '}
                      <a
                        href="https://console.cloud.google.com"
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-400 hover:underline"
                      >
                        Google Cloud Console <ExternalLink className="w-3 h-3 inline" />
                      </a>{' '}
                      y habilita la <strong>Google Drive API</strong>.
                    </p>
                  </div>
                </div>

                <div className="step-item">
                  <span className="step-num">2</span>
                  <div>
                    <strong>Crea tus Credenciales OAuth 2.0</strong>
                    <p>
                      En <em>Credenciales &gt; Crear credenciales &gt; ID de cliente de OAuth (Aplicación web)</em>.
                      Agrega en URI de redirección autorizados:{' '}
                      <code>http://localhost:8000/api/drive/callback</code>.
                    </p>
                  </div>
                </div>

                <div className="step-item">
                  <span className="step-num">3</span>
                  <div>
                    <strong>Descarga el JSON</strong>
                    <p>
                      Renómbralo a <code>client_secrets.json</code> y guárdalo dentro de la carpeta{' '}
                      <code>backend/</code> del proyecto.
                    </p>
                  </div>
                </div>
              </div>

              {errorMsg && (
                <div className="alert-box error mt-3">
                  <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                className="btn-primary w-full mt-4"
                onClick={handleConnect}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                  <Key className="w-5 h-5 mr-2" />
                )}
                Conectar mi cuenta de Google Drive
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
