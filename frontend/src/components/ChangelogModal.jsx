import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Zap, Image as ImageIcon, Camera, FileText, UserCheck, Layers, RefreshCw } from 'lucide-react';

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card changelog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="version-badge-pill">v1.3.0</span>
            <h3 className="modal-title">Novedades de la Versión</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Cerrar">
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="modal-body changelog-body">
          {/* Versión 1.3.0 */}
          <div className="changelog-version-block current">
            <div className="version-header-row">
              <span className="version-tag current">v1.3.0 (Actual)</span>
              <span className="version-date">Octubre 2026</span>
            </div>

            <ul className="changelog-features-list">
              <li>
                <div className="feat-icon-box bg-emerald-500/20 text-emerald-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Flujo por Lotes: Fotos Primero, Edición Después</strong>
                  <p>Toma todas las fotos de tu documento seguidas con contador visual. Una vez completadas, procede a recortar y aplicar filtros a cada página sin interrupciones.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-cyan-500/20 text-cyan-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Auto-Detección de Papel Ultra Precisa</strong>
                  <p>Nuevo motor con segmentación morfológica y envolvente convexa: detecta hojas blancas sobre fondo negro u oscuro con precisión milimétrica ignorando textos y sombras.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-blue-500/20 text-blue-400">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Encabezados Amplios y Botón Listo Siempre Visible</strong>
                  <p>Reorganización ergonómica: el botón "Listo" nunca queda oculto o cortado, y se añade barra de rotación dedicada ("Rotar Izq" / "Rotar Der") bajo el documento.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-purple-500/20 text-purple-400">
                  <Layers className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Importación Múltiple de Galería</strong>
                  <p>Selecciona varias fotos a la vez desde tu galería para importarlas como páginas de un solo documento.</p>
                </div>
              </li>
            </ul>
          </div>

          {/* Versión 1.2.0 */}
          <div className="changelog-version-block">
            <div className="version-header-row">
              <span className="version-tag">v1.2.0</span>
              <span className="version-date">Estudio Foto Carnet & Rediseño</span>
            </div>
            <ul className="changelog-features-list small">
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Estudio de Foto Carnet con remoción de fondo blanco puro (#FFFFFF) y plantilla 4x6".</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Barras de carga animadas en tiempo real entre procesos.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Lupa fija superior HUD con aumento ligero de 1.15x.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Formato de nombre estandarizado Escaneo_DD-MM-YYYY.</span>
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
