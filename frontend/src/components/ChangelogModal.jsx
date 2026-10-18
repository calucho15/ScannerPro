import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Zap, Image as ImageIcon, Camera, FileText, UserCheck, Layers, RefreshCw } from 'lucide-react';

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card changelog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="version-badge-pill">v1.2.0</span>
            <h3 className="modal-title">Novedades de la Versión</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Cerrar">
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="modal-body changelog-body">
          {/* Versión 1.2.0 */}
          <div className="changelog-version-block current">
            <div className="version-header-row">
              <span className="version-tag current">v1.2.0 (Actual)</span>
              <span className="version-date">Octubre 2026</span>
            </div>

            <ul className="changelog-features-list">
              <li>
                <div className="feat-icon-box bg-purple-500/20 text-purple-400">
                  <UserCheck className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Nueva Herramienta: Estudio Foto Carnet</strong>
                  <p>Módulo independiente para fotos a personas con remoción de fondo a blanco puro (#FFFFFF), selector de tolerancia, muestreo táctil y generación de plantilla 4x6" con 6 fotos listas para imprimir.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-emerald-500/20 text-emerald-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Rediseño Integral sin AI Clichés</strong>
                  <p>Interfaz limpia y profesional centrada en herramientas utilitarias, sin textos de marketing ni frases de comparación.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-cyan-500/20 text-cyan-400">
                  <RefreshCw className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Barra de Carga entre Procesos</strong>
                  <p>Indicador visual animado con porcentaje numérico para conocer el progreso en tiempo real durante cada etapa.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-amber-500/20 text-amber-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Lupa con Zoom Ligero (1.45x)</strong>
                  <p>Ajuste de aumento ergonómico para una puntería perfecta y sin desorientación en los bordes del papel.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-blue-500/20 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Formato Oficial de Archivo</strong>
                  <p>Nombres generados automáticamente en formato estándar: Escaneo_Dia-Mes-Año (ej. Escaneo_18-10-2026).</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Versión 1.1.0 */}
          <div className="changelog-version-block">
            <div className="version-header-row">
              <span className="version-tag">v1.1.0</span>
              <span className="version-date">Mejoras de Visión</span>
            </div>
            <ul className="changelog-features-list small">
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Modo Documento Blanco Puro con firmas y sellos preservados.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Selector de calidad PDF (Ligero WhatsApp vs Máxima Nitidez).</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Cuadrícula 3x3 de perspectiva y rotación rápida de 90°.</span>
              </li>
            </ul>
          </div>

          {/* Versión 1.0.0 */}
          <div className="changelog-version-block">
            <div className="version-header-row">
              <span className="version-tag">v1.0.0</span>
              <span className="version-date">Lanzamiento Base</span>
            </div>
            <ul className="changelog-features-list small">
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Aplicación independiente para Android (APK) 100% offline y sin publicidad.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Transformación de perspectiva y compartición nativa de archivos a WhatsApp.</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
