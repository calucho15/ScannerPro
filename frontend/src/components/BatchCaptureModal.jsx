import React, { useRef } from 'react';
import {
  Camera,
  Plus,
  Trash2,
  ArrowRight,
  ArrowLeft,
  Check,
  FileText,
  Image as ImageIcon
} from 'lucide-react';

export default function BatchCaptureModal({
  photos = [],
  onAddAnotherPhoto,
  onAddFromGallery,
  onRemovePhoto,
  onProceedToEdit,
  onCancel
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onAddFromGallery(files);
      e.target.value = '';
    }
  };

  return (
    <div className="batch-capture-screen">
      {/* Input oculto para añadir de galería */}
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
      />

      <div className="batch-capture-header">
        <button className="icon-btn-ghost flex-shrink-0" onClick={onCancel} title="Cancelar captura">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="batch-header-center">
          <span className="batch-title">Captura de Documentos</span>
        </div>
        <button
          className="btn-confirm-crop flex-shrink-0"
          onClick={onProceedToEdit}
          disabled={photos.length === 0}
        >
          <Check className="w-4 h-4 mr-1" />
          <span>Editar ({photos.length})</span>
        </button>
      </div>

      <div className="batch-capture-content">
        <div className="batch-info-banner">
          <div className="batch-counter-chip">
            <FileText className="w-4 h-4 mr-1.5 text-emerald-400" />
            <span>{photos.length} {photos.length === 1 ? 'página tomada' : 'páginas tomadas'}</span>
          </div>
          <h3 className="batch-banner-heading">Revisa o toma más páginas</h3>
          <p className="batch-banner-desc">
            Toma todas las fotos primero. Al pulsar "Continuar a Edición" podrás ajustar las esquinas y filtros de cada página en orden.
          </p>
        </div>

        {/* Cuadrícula de fotos tomadas */}
        <div className="batch-photos-grid">
          {photos.map((photoBlob, idx) => {
            const url = typeof photoBlob === 'string' ? photoBlob : URL.createObjectURL(photoBlob);
            return (
              <div key={idx} className="batch-photo-card">
                <div className="batch-photo-preview-wrap">
                  <img
                    src={url}
                    alt={`Página ${idx + 1}`}
                    className="batch-photo-thumb"
                    onLoad={() => {
                      if (typeof photoBlob !== 'string') {
                        setTimeout(() => {
                          try { URL.revokeObjectURL(url); } catch (e) {}
                        }, 20000);
                      }
                    }}
                  />
                  <div className="batch-photo-badge">
                    <span>Pág. {idx + 1}</span>
                  </div>
                  <button
                    className="batch-photo-delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemovePhoto(idx);
                    }}
                    title="Eliminar foto borrosa o errónea"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            );
          })}

          {/* Tarjeta rápida para tomar otra foto */}
          <button className="batch-add-card" onClick={onAddAnotherPhoto}>
            <div className="batch-add-icon-circle">
              <Camera className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="batch-add-label">+ Tomar otra foto</span>
            <span className="batch-add-sublabel">Añadir pág. {photos.length + 1}</span>
          </button>
        </div>
      </div>

      {/* Barra de acción inferior */}
      <div className="batch-bottom-toolbar">
        <button
          className="btn-secondary"
          onClick={() => fileInputRef.current?.click()}
          title="Importar más fotos de la galería"
        >
          <ImageIcon className="w-5 h-5 mr-1.5 text-cyan-400" />
          <span>Galería</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onAddAnotherPhoto}
          title="Tomar otra página con la cámara"
        >
          <Plus className="w-5 h-5 mr-1.5 text-emerald-400" />
          <span>Tomar otra</span>
        </button>

        <button
          className="btn-primary flex-1"
          onClick={onProceedToEdit}
          disabled={photos.length === 0}
        >
          <span>Continuar a Edición ({photos.length})</span>
          <ArrowRight className="w-5 h-5 ml-1.5" />
        </button>
      </div>
    </div>
  );
}
