import React, { useState, useEffect } from 'react';
import { ArrowLeft, Check, Plus, Loader2, Sparkles, Contrast, Palette, ShieldAlert, Image as ImageIcon } from 'lucide-react';
import { applyImageFilter } from '../services/api';

const FILTER_OPTIONS = [
  { id: 'magic_color', name: 'Magic Color', icon: Sparkles, desc: 'Realce y sin sombras' },
  { id: 'clean_bw', name: 'B&W Limpio', icon: Contrast, desc: 'Texto nítido sin ruido' },
  { id: 'grayscale', name: 'Grises CLAHE', icon: Palette, desc: 'Tonalidades suaves' },
  { id: 'denoise', name: 'Denoise HD', icon: ShieldAlert, desc: 'Reducción profunda' },
  { id: 'original', name: 'Original', icon: ImageIcon, desc: 'Sin modificaciones' },
];

export default function FilterScreen({ warpedBlob, onSavePage, onAddAnotherPage, onBackToCrop }) {
  const [selectedFilter, setSelectedFilter] = useState('magic_color');
  const [filterCache, setFilterCache] = useState({}); // { [filterId]: blob }
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Inicializar con el filtro Magic Color por defecto
    loadFilter('magic_color');
  }, [warpedBlob]);

  const loadFilter = async (filterId) => {
    setSelectedFilter(filterId);

    // Si ya lo procesamos previamente, usar la versión en memoria
    if (filterCache[filterId]) {
      updateDisplayUrl(filterCache[filterId]);
      return;
    }

    if (filterId === 'original') {
      setFilterCache((prev) => ({ ...prev, original: warpedBlob }));
      updateDisplayUrl(warpedBlob);
      return;
    }

    setIsProcessing(true);
    try {
      const filteredBlob = await applyImageFilter(warpedBlob, filterId);
      setFilterCache((prev) => ({ ...prev, [filterId]: filteredBlob }));
      updateDisplayUrl(filteredBlob);
    } catch (err) {
      console.error("Error aplicando filtro:", err);
      alert("Error al aplicar filtro: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateDisplayUrl = (blob) => {
    if (!blob) return;
    const oldUrl = currentDisplayUrl;
    if (oldUrl) {
      setTimeout(() => {
        try { URL.revokeObjectURL(oldUrl); } catch (e) {}
      }, 5000);
    }
    const url = URL.createObjectURL(blob);
    setCurrentDisplayUrl(url);
  };

  const getCurrentBlob = () => {
    return filterCache[selectedFilter] || warpedBlob;
  };

  const handleFinish = () => {
    onSavePage(getCurrentBlob());
  };

  const handleAddMore = () => {
    onAddAnotherPage(getCurrentBlob());
  };

  return (
    <div className="filter-screen">
      <div className="filter-header">
        <button className="icon-btn-ghost" onClick={onBackToCrop} title="Atrás a recortar">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="filter-title">Selecciona el acabado</span>
        <button className="btn-confirm-crop" onClick={handleFinish} disabled={isProcessing}>
          <Check className="w-5 h-5 mr-1" />
          <span>Listo</span>
        </button>
      </div>

      <div className="filter-preview-viewport">
        {currentDisplayUrl && (
          <img
            src={currentDisplayUrl}
            alt="Vista previa con filtro"
            className="filtered-doc-preview"
          />
        )}

        {isProcessing && (
          <div className="filter-spinner-overlay">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>Eliminando ruido y mejorando...</span>
          </div>
        )}
      </div>

      {/* Barra de selección de filtros estilo CamScanner */}
      <div className="filter-selector-bar">
        {FILTER_OPTIONS.map((f) => {
          const Icon = f.icon;
          const isActive = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              className={`filter-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => loadFilter(f.id)}
              disabled={isProcessing}
            >
              <div className="filter-icon-box">
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-400' : 'text-gray-400'}`} />
              </div>
              <span className="filter-pill-name">{f.name}</span>
            </button>
          );
        })}
      </div>

      <div className="filter-bottom-actions">
        <button className="btn-secondary" onClick={handleAddMore} disabled={isProcessing}>
          <Plus className="w-5 h-5 mr-2 text-emerald-400" />
          Añadir otra página
        </button>
        <button className="btn-primary" onClick={handleFinish} disabled={isProcessing}>
          <Check className="w-5 h-5 mr-2" />
          Guardar Documento
        </button>
      </div>
    </div>
  );
}
