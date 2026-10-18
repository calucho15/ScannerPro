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
  UserCheck,
  FileCheck,
  Sliders,
  RotateCw,
  Crosshair,
  Info
} from 'lucide-react';
import { applyImageFilter, rotateImage } from '../services/api';

const FILTER_OPTIONS = [
  { id: 'magic_color', name: 'Magic Color', icon: Sparkles, desc: 'Realce y sin sombras' },
  { id: 'photo_white_bg', name: 'Foto Fondo Blanco', icon: UserCheck, desc: 'Quita fondo en fotos y retratos' },
  { id: 'doc_white_bg', name: 'Doc Blanco Puro', icon: FileCheck, desc: 'Papel blanco puro con firmas' },
  { id: 'clean_bw', name: 'B&W Limpio', icon: Contrast, desc: 'Texto nítido sin ruido' },
  { id: 'grayscale', name: 'Grises CLAHE', icon: Palette, desc: 'Tonalidades suaves' },
  { id: 'denoise', name: 'Denoise HD', icon: ShieldAlert, desc: 'Reducción profunda' },
  { id: 'original', name: 'Original', icon: ImageIcon, desc: 'Sin modificaciones' },
];

export default function FilterScreen({ warpedBlob, onSavePage, onAddAnotherPage, onBackToCrop }) {
  const [baseBlob, setBaseBlob] = useState(warpedBlob);
  const [selectedFilter, setSelectedFilter] = useState('magic_color');
  const [tolerance, setTolerance] = useState(40);
  const [seedPoint, setSeedPoint] = useState(null);
  const [currentDisplayUrl, setCurrentDisplayUrl] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResultBlob, setCurrentResultBlob] = useState(null);

  // Cache para transiciones instantáneas entre filtros estándar
  const filterCacheRef = useRef({});

  useEffect(() => {
    setBaseBlob(warpedBlob);
    filterCacheRef.current = {};
    processFilter('magic_color', warpedBlob, { tolerance: 40, seedPoint: null });
  }, [warpedBlob]);

  const processFilter = async (filterId, sourceBlob = baseBlob, options = { tolerance, seedPoint }) => {
    setSelectedFilter(filterId);

    if (filterId === 'original') {
      setCurrentResultBlob(sourceBlob);
      updateDisplayUrl(sourceBlob);
      return;
    }

    // Verificar caché si no es modo interactivo con parámetros variables
    const cacheKey = filterId === 'photo_white_bg'
      ? `${filterId}_t${options.tolerance}_s${options.seedPoint ? `${Math.round(options.seedPoint.x * 100)}_${Math.round(options.seedPoint.y * 100)}` : 'auto'}`
      : filterId;

    if (filterCacheRef.current[cacheKey]) {
      const cached = filterCacheRef.current[cacheKey];
      setCurrentResultBlob(cached);
      updateDisplayUrl(cached);
      return;
    }

    setIsProcessing(true);
    try {
      const filteredBlob = await applyImageFilter(sourceBlob, filterId, options);
      filterCacheRef.current[cacheKey] = filteredBlob;
      setCurrentResultBlob(filteredBlob);
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

  const handleFilterSelect = (filterId) => {
    processFilter(filterId, baseBlob, { tolerance, seedPoint });
  };

  const handleToleranceChange = (newVal) => {
    setTolerance(newVal);
    processFilter('photo_white_bg', baseBlob, { tolerance: newVal, seedPoint });
  };

  const handleImageClick = (e) => {
    if (selectedFilter !== 'photo_white_bg' || isProcessing) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const ratioX = (e.clientX - rect.left) / rect.width;
    const ratioY = (e.clientY - rect.top) / rect.height;

    const newSeed = { x: ratioX, y: ratioY };
    setSeedPoint(newSeed);
    processFilter('photo_white_bg', baseBlob, { tolerance, seedPoint: newSeed });
  };

  const handleResetSeed = () => {
    setSeedPoint(null);
    processFilter('photo_white_bg', baseBlob, { tolerance, seedPoint: null });
  };

  const handleRotate90 = async () => {
    if (isProcessing) return;
    setIsProcessing(true);
    try {
      const rotated = await rotateImage(baseBlob, 90);
      setBaseBlob(rotated);
      filterCacheRef.current = {};
      await processFilter(selectedFilter, rotated, { tolerance, seedPoint });
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
        <span className="filter-title">Selecciona el acabado</span>
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
          <div
            className={`filtered-preview-container ${selectedFilter === 'photo_white_bg' ? 'interactive-sample' : ''}`}
            onClick={handleImageClick}
            title={selectedFilter === 'photo_white_bg' ? 'Toca cualquier punto del fondo para muestrear su color' : ''}
          >
            <img
              src={currentDisplayUrl}
              alt="Vista previa con filtro"
              className="filtered-doc-preview"
            />
            {selectedFilter === 'photo_white_bg' && seedPoint && (
              <div
                className="sample-pin-marker"
                style={{
                  left: `${seedPoint.x * 100}%`,
                  top: `${seedPoint.y * 100}%`
                }}
              >
                <Crosshair className="w-5 h-5 text-emerald-400" />
              </div>
            )}
          </div>
        )}

        {isProcessing && (
          <div className="filter-spinner-overlay">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>
              {selectedFilter === 'photo_white_bg'
                ? 'Eliminando fondo y aplicando blanco puro...'
                : 'Eliminando ruido y mejorando...'}
            </span>
          </div>
        )}
      </div>

      {/* Panel de Ajustes Específicos para Fondo Blanco de Fotos */}
      {selectedFilter === 'photo_white_bg' && (
        <div className="white-bg-controls-panel">
          <div className="white-bg-controls-header">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-semibold text-white">Tolerancia de Fondo: {tolerance}</span>
            </div>
            {seedPoint && (
              <button className="btn-reset-seed" onClick={handleResetSeed}>
                Restablecer punto
              </button>
            )}
          </div>
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] text-gray-400">Suave (15)</span>
            <input
              type="range"
              min="15"
              max="80"
              value={tolerance}
              onChange={(e) => handleToleranceChange(Number(e.target.value))}
              className="tolerance-slider"
            />
            <span className="text-[10px] text-gray-400">Fuerte (80)</span>
          </div>
          <div className="white-bg-tip">
            <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
            <span>Toca cualquier punto del fondo en la foto para elegir el color exacto a eliminar.</span>
          </div>
        </div>
      )}

      {/* Barra de selección de filtros estilo CamScanner */}
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
