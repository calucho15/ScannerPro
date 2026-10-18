import React from 'react';
import { X, Sparkles, CheckCircle2, ShieldCheck, Zap, Image as ImageIcon, Camera, FileText } from 'lucide-react';

export default function ChangelogModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-card changelog-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="flex items-center gap-2">
            <span className="version-badge-pill">v1.1.0</span>
            <h3 className="modal-title">Novedades de la Versión</h3>
          </div>
          <button className="icon-btn-ghost" onClick={onClose} title="Cerrar">
            <X className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="modal-body changelog-body">
          {/* Versión 1.1.0 */}
          <div className="changelog-version-block current">
            <div className="version-header-row">
              <span className="version-tag current">v1.1.0 (Actual)</span>
              <span className="version-date">Octubre 2026</span>
            </div>

            <ul className="changelog-features-list">
              <li>
                <div className="feat-icon-box bg-purple-500/20 text-purple-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Modo Quitar Fondo (Fondo Blanco para Fotos)</strong>
                  <p>Nuevo modo inteligente para fotografías, retratos, fotos carnet y objetos. Elimina el fondo y lo reemplaza por blanco puro (#FFFFFF) con selector de tolerancia.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-emerald-500/20 text-emerald-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Modo Documento Blanco Puro</strong>
                  <p>Blanquea 100% el papel y elimina sombras e iluminación despareja conservando firmas a bolígrafo azul/rojo, sellos y logos a todo color.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-cyan-500/20 text-cyan-400">
                  <Zap className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Lupa de Precisión en Recorte</strong>
                  <p>Al arrastrar cualquier esquina, aparece una lupa flotante con zoom 2.5x y cruz de mira para encuadrar con precisión milimétrica sin que el pulgar tape la vista.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-amber-500/20 text-amber-400">
                  <Camera className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Cuadrícula de Alineación & Rotación 90°</strong>
                  <p>Cuadrícula perspectiva de 3x3 (Regla de Tercios) con botón para ocultar/mostrar guías y rotación de imágenes con 1 solo toque.</p>
                </div>
              </li>

              <li>
                <div className="feat-icon-box bg-blue-500/20 text-blue-400">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="feat-content">
                  <strong>Selector de Calidad de PDF (WhatsApp vs HD)</strong>
                  <p>Elige entre PDF Ligero (~250 KB) para enviar volando por WhatsApp con pocos datos, o Máxima Calidad para impresión y archivo.</p>
                </div>
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
                <span>Aplicación independiente para Android (APK) sin publicidad ni marcas de agua.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Recorte interactivo y corrección de perspectiva.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Filtros Magic Color y B&W Limpio con OpenCV local.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Compartir archivos PDF e imágenes adjuntas reales por WhatsApp.</span>
              </li>
              <li>
                <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                <span>Biblioteca local IndexedDB y respaldo opcional en Google Drive.</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-primary w-full" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
