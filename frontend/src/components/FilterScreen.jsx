import React, { useState, useEffect, useRef } from 'react';
import {
  ArrowLeft,
  Check,
  Plus,
  Loader2,
  Sparkles,
  Contrast,
  Palette,
  ShieldAlert,
  Image as ImageIcon,
  FileCheck,
  RotateCw
} from 'lucide-react';
import { applyImageFilter, rotateImage } from '../services/api';
import ProgressBar from './ProgressBar';

const FILTER_OPTIONS = [
  { id: 'magic_color', name: 'Magic Color', icon: Sparkles, desc: 'Realce y sin sombras' },
  { id: 'doc_white_bg', name: 'Doc Blanco Puro', icon: FileCheck, desc: 'Papel blanco puro con firmas vivas' },
  { id: 'clean_bw', name: 'B&W Limpio', icon: Contrast, desc: 'Texto nítido sin ruido' },
  { id: 'grayscale', name: 'Grises CLAHE', icon: Palette, desc: 'Tonalidades suaves' },
  { id: 'denoise', name: 'Denoise HD', icon: ShieldAlert, desc: 'Reducción profunda' },
  { id: 'original', name: 'Original', icon: ImageIcon, desc: 'Sin modificaciones' },
];

export default function FilterScreen({ warpedBlob, onSavePage, onAddAnotherPage, onBackToCrop }) {
  const [baseBlob, setBaseBlob] = useState(warpedBlob);
  const [selectedFilter, setSelectedFilter] = useState('magic_color');
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState('');
  const [currentResultBlob, setCurrentResultBlob] = useState(null);

  // Cache para transiciones instantáneas entre filtros
  const filterCacheRef = useRef({});

  useEffect(() => {
    setBaseBlob(warpedBlob);
    filterCacheRef.current = {};
    processFilter('magic_color', warpedBlob);
  }, [warpedBlob]);

  const processFilter = async (filterId, sourceBlob = baseBlob) => {
    setSelectedFilter(filterId);

    if (filterId === 'original') {
      setCurrentResultBlob(sourceBlob);
      updateDisplayUrl(sourceBlob);
      return;
    }

    if (filterCacheRef.current[filterId]) {
      const cached = filterCacheRef.current[filterId];
      setCurrentResultBlob(cached);
      updateDisplayUrl(cached);
      return;
    }

    setIsProcessing(true);
    setProcessProgress(25);
    setProcessStatus('Analizando matriz de píxeles...');

    const timer = setInterval(() => {
      setProcessProgress((prev) => (prev < 80 ? prev + 20 : prev));
    }, 120);

    try {
      const filteredBlob = await applyImageFilter(sourceBlob, filterId);
      clearInterval(timer);
      setProcessProgress(100);
      setProcessStatus('Filtro aplicado');
      filterCacheRef.current[filterId] = filteredBlob;
      setCurrentResultBlob(filteredBlob);
      updateDisplayUrl(filteredBlob);
    } catch (err) {
      clearInterval(timer);
      console.error("Error aplicando filtro:", err);
      alert("Error al aplicar filtro: " + err.message);
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
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

  const handleFilterSelect = (filterId) => {
    processFilter(filterId, baseBlob);
  };

  const handleRotate90 = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    setProcessProgress(40);
    setProcessStatus('Rotando imagen 90°...');
    try {
      const rotated = await rotateImage(baseBlob, 90);
      setBaseBlob(rotated);
      filterCacheRef.current = {};
      setProcessProgress(80);
      await processFilter(selectedFilter, rotated);
    } catch (e) {
      alert("Error al rotar imagen: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const getCurrentBlob = () => {
    return currentResultBlob || baseBlob;
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
        <span className="filter-title">Acabado del documento</span>
        <div className="flex items-center gap-2">
          <button
            className="icon-btn-ghost"
            onClick={handleRotate90}
            disabled={isProcessing}
            title="Rotar 90°"
          >
            <RotateCw className="w-5 h-5 text-cyan-400" />
          </button>
          <button className="btn-confirm-crop" onClick={handleFinish} disabled={isProcessing}>
            <Check className="w-5 h-5 mr-1" />
            <span>Listo</span>
          </button>
        </div>
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
          <ProgressBar
            progress={processProgress}
            title="Optimizando documento"
            statusText={processStatus}
            isOverlay={true}
          />
        )}
      </div>

      {/* Barra de selección de filtros de documentos */}
      <div className="filter-selector-bar">
        {FILTER_OPTIONS.map((f) => {
          const Icon = f.icon;
          const isActive = selectedFilter === f.id;
          return (
            <button
              key={f.id}
              className={`filter-pill-btn ${isActive ? 'active' : ''}`}
              onClick={() => handleFilterSelect(f.id)}
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
