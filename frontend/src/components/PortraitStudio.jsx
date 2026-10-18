import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  RotateCw,
  RotateCcw,
  Sliders,
  Check,
  Share2,
  Download,
  MessageCircle,
  Crosshair,
  Info,
  Sparkles,
  Printer,
  UserCheck,
  Crop,
  Wand2,
  RefreshCw
} from 'lucide-react';
import {
  removePhotoBackground,
  rotateImage,
  createIdPhotoSheet,
  applyBeautyFilter,
  cropImage
} from '../services/api';
import { shareFileNative, downloadFileLocal } from '../services/shareService';
import { capturePhotoNative, pickPhotoNative } from '../services/cameraService';
import { Capacitor } from '@capacitor/core';
import ProgressBar from './ProgressBar';

const BEAUTY_LEVELS = [
  { id: 'none', label: 'Sin filtro' },
  { id: 'natural', label: '✨ Natural' },
  { id: 'studio', label: '💎 Estudio' },
  { id: 'pro', label: '🌟 Pro' }
];

const ASPECT_RATIOS = [
  { id: '3:4', label: '3:4 Carnet', ratio: 3 / 4 },
  { id: '1:1', label: '1:1 Pasaporte', ratio: 1 },
  { id: 'free', label: 'Libre', ratio: null }
];

export default function PortraitStudio({ onBack }) {
  // Estados del flujo: 'select' -> 'crop' -> 'studio'
  const [currentStep, setCurrentStep] = useState('select'); // 'select' | 'crop' | 'studio'

  const [rawPhotoBlob, setRawPhotoBlob] = useState(null);
  const [croppedPhotoBlob, setCroppedPhotoBlob] = useState(null);
  const [whiteBgBlob, setWhiteBgBlob] = useState(null);
  const [finalBeautyBlob, setFinalBeautyBlob] = useState(null);
  const [sheetBlob, setSheetBlob] = useState(null);

  const [previewMode, setPreviewMode] = useState('single'); // 'single' | 'sheet'
  const [selectedRatio, setSelectedRatio] = useState('3:4');
  const [beautyLevel, setBeautyLevel] = useState('natural');
  const [tolerance, setTolerance] = useState(40);
  const [seedPoint, setSeedPoint] = useState(null);

  // Estados de carga y progreso
  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState('');

  // URLs de previsualización
  const [displayUrl, setDisplayUrl] = useState(null);
  const fileInputRef = useRef(null);
  const cropImageRef = useRef(null);

  // Coordenadas de encuadre en modo recorte (0 a 1 normalizadas)
  const [cropBox, setCropBox] = useState({ x: 0.1, y: 0.05, width: 0.8, height: 0.9 });

  const handleTakeNewPhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await capturePhotoNative();
        if (photo) {
          initPhotoWorkflow(photo);
          return;
        }
      } catch (e) {
        console.warn("Fallo cámara nativa, usando selector:", e);
      }
    }
    fileInputRef.current?.click();
  };

  const handlePickFromGallery = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await pickPhotoNative();
        if (photo) {
          initPhotoWorkflow(photo);
          return;
        }
      } catch (e) {
        console.warn("Fallo galería nativa, usando selector:", e);
      }
    }
    fileInputRef.current?.click();
  };

  const handleFileInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      initPhotoWorkflow(file);
      e.target.value = '';
    }
  };

  const initPhotoWorkflow = (blob) => {
    setRawPhotoBlob(blob);
    setSeedPoint(null);
    setSheetBlob(null);
    setBeautyLevel('natural');
    setPreviewMode('single');

    // Inicializar caja de encuadre carnet centrada
    setCropBox({ x: 0.12, y: 0.05, width: 0.76, height: 0.9 });
    updateDisplayUrl(blob);
    setCurrentStep('crop');
  };

  // Rotar en el paso de recorte
  const handleRotateInCrop = async (degrees) => {
    if (!rawPhotoBlob || isProcessing) return;
    setIsProcessing(true);
    setProcessProgress(40);
    setProcessStatus('Rotando fotografía...');
    try {
      const rotated = await rotateImage(rawPhotoBlob, degrees);
      setRawPhotoBlob(rotated);
      updateDisplayUrl(rotated);
    } catch (e) {
      alert("Error rotando fotografía: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Rotar en el paso de estudio final
  const handleRotateInStudio = async (degrees) => {
    if (!croppedPhotoBlob || isProcessing) return;
    setIsProcessing(true);
    setProcessProgress(30);
    setProcessStatus('Rotando fotografía...');
    try {
      const rotated = await rotateImage(croppedPhotoBlob, degrees);
      setCroppedPhotoBlob(rotated);
      await generateStudioResult(rotated, {
        tolerance,
        seedPoint,
        beauty: beautyLevel
      });
    } catch (e) {
      alert("Error rotando fotografía: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Confirmar encuadre carnet y pasar a fondo blanco y belleza
  const handleApplyCrop = async () => {
    if (!rawPhotoBlob) return;
    setIsProcessing(true);
    setProcessProgress(20);
    setProcessStatus('Recortando proporción de foto carnet...');

    try {
      // Recortar imagen a la caja seleccionada
      const cropped = await cropImage(rawPhotoBlob, cropBox);
      setCroppedPhotoBlob(cropped);
      setCurrentStep('studio');

      // Procesar fondo blanco y belleza
      await generateStudioResult(cropped, {
        tolerance: 40,
        seedPoint: null,
        beauty: beautyLevel
      });
    } catch (err) {
      alert("Error al encuadrar foto: " + err.message);
      setIsProcessing(false);
    }
  };

  // Genera fondo blanco puro y filtro de belleza
  const generateStudioResult = async (baseBlob, options) => {
    setIsProcessing(true);
    setProcessProgress(35);
    setProcessStatus('Paso 1 de 2: Removiendo fondo a blanco puro...');

    const timer = setInterval(() => {
      setProcessProgress((prev) => (prev < 80 ? prev + 15 : prev));
    }, 120);

    try {
      // 1. Quitar fondo
      const whiteBg = await removePhotoBackground(baseBlob, {
        tolerance: options.tolerance,
        seedPoint: options.seedPoint
      });
      setWhiteBgBlob(whiteBg);

      // 2. Aplicar filtro de belleza si está seleccionado
      setProcessProgress(80);
      setProcessStatus('Paso 2 de 2: Aplicando filtro de belleza natural...');
      const beautified = await applyBeautyFilter(whiteBg, options.beauty);

      clearInterval(timer);
      setProcessProgress(100);
      setProcessStatus('Retrato procesado con éxito');
      setFinalBeautyBlob(beautified);
      setSheetBlob(null); // Invalidar plantilla previa
      updateDisplayUrl(beautified);
    } catch (err) {
      clearInterval(timer);
      console.error("Error procesando estudio:", err);
      alert("Error al procesar retrato: " + err.message);
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
    }
  };

  const handleBeautyChange = async (newLevel) => {
    setBeautyLevel(newLevel);
    if (!whiteBgBlob) return;
    setIsProcessing(true);
    setProcessProgress(50);
    setProcessStatus(`Aplicando acabado ${newLevel}...`);
    try {
      const beautified = await applyBeautyFilter(whiteBgBlob, newLevel);
      setFinalBeautyBlob(beautified);
      setSheetBlob(null);
      updateDisplayUrl(beautified);
      setProcessProgress(100);
    } catch (e) {
      console.warn("Error aplicando filtro belleza:", e);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleToleranceChange = (newVal) => {
    setTolerance(newVal);
    generateStudioResult(croppedPhotoBlob, {
      tolerance: newVal,
      seedPoint,
      beauty: beautyLevel
    });
  };

  const handleImageClickSample = (e) => {
    if (!croppedPhotoBlob || isProcessing || previewMode === 'sheet') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    const newSeed = { x: rx, y: ry };
    setSeedPoint(newSeed);
    generateStudioResult(croppedPhotoBlob, {
      tolerance,
      seedPoint: newSeed,
      beauty: beautyLevel
    });
  };

  const handleResetSeed = () => {
    setSeedPoint(null);
    generateStudioResult(croppedPhotoBlob, {
      tolerance,
      seedPoint: null,
      beauty: beautyLevel
    });
  };

  // Alternar entre foto individual y plantilla para imprimir 4x6"
  const handleToggleSheetMode = async (mode) => {
    setPreviewMode(mode);
    if (mode === 'sheet') {
      if (sheetBlob) {
        updateDisplayUrl(sheetBlob);
        return;
      }
      setIsProcessing(true);
      setProcessProgress(40);
      setProcessStatus('Generando plantilla para imprimir 4x6" (6 fotos carnet)...');
      try {
        const sheet = await createIdPhotoSheet(finalBeautyBlob || croppedPhotoBlob, 6);
        setSheetBlob(sheet);
        updateDisplayUrl(sheet);
        setProcessProgress(100);
      } catch (err) {
        alert("Error creando plantilla: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      updateDisplayUrl(finalBeautyBlob);
    }
  };

  const handleShare = async () => {
    const activeBlob = previewMode === 'sheet' ? sheetBlob : finalBeautyBlob;
    if (!activeBlob) return;
    const isSheet = previewMode === 'sheet';
    const fileName = isSheet ? 'Plantilla_6_Fotos_Carnet_4x6.jpg' : 'Foto_Carnet_Fondo_Blanco.jpg';
    await shareFileNative(activeBlob, fileName, isSheet ? 'Plantilla 6 Fotos Carnet' : 'Foto Carnet Fondo Blanco');
  };

  const handleDownload = async () => {
    const activeBlob = previewMode === 'sheet' ? sheetBlob : finalBeautyBlob;
    if (!activeBlob) return;
    const isSheet = previewMode === 'sheet';
    const fileName = isSheet ? 'Plantilla_6_Fotos_Carnet_4x6.jpg' : 'Foto_Carnet_Fondo_Blanco.jpg';
    await downloadFileLocal(activeBlob, fileName);
  };

  const updateDisplayUrl = (blob) => {
    if (!blob) return;
    const oldUrl = displayUrl;
    if (oldUrl) {
      setTimeout(() => {
        try { URL.revokeObjectURL(oldUrl); } catch (e) {}
      }, 5000);
    }
    const url = URL.createObjectURL(blob);
    setDisplayUrl(url);
  };

  return (
    <div className="portrait-studio-screen">
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileInputChange}
      />

      {/* Header */}
      <div className="studio-header">
        <button
          className="icon-btn-ghost"
          onClick={() => {
            if (currentStep === 'studio') {
              setCurrentStep('crop');
              updateDisplayUrl(rawPhotoBlob);
            } else if (currentStep === 'crop') {
              setCurrentStep('select');
              setRawPhotoBlob(null);
            } else {
              onBack();
            }
          }}
          title="Atrás"
          disabled={isProcessing}
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="studio-header-titles">
          <h2 className="studio-title">
            {currentStep === 'crop' ? 'Encuadre de Foto Carnet' : 'Estudio Foto Carnet'}
          </h2>
          <span className="studio-subtitle">
            {currentStep === 'crop'
              ? 'Alinea el rostro y los hombros de la persona'
              : 'Fondo blanco puro y filtro de belleza'}
          </span>
        </div>

        {/* Botones de Rotación a Izquierda y Derecha */}
        {rawPhotoBlob && (
          <div className="flex items-center gap-1">
            <button
              className="icon-btn-ghost"
              onClick={() => (currentStep === 'crop' ? handleRotateInCrop(-90) : handleRotateInStudio(-90))}
              disabled={isProcessing}
              title="Rotar a la izquierda (-90°)"
            >
              <RotateCcw className="w-5 h-5 text-cyan-400" />
            </button>
            <button
              className="icon-btn-ghost"
              onClick={() => (currentStep === 'crop' ? handleRotateInCrop(90) : handleRotateInStudio(90))}
              disabled={isProcessing}
              title="Rotar a la derecha (+90°)"
            >
              <RotateCw className="w-5 h-5 text-cyan-400" />
            </button>
          </div>
        )}
      </div>

      {/* 1. Paso Inicial: Selección / Captura */}
      {currentStep === 'select' && (
        <div className="studio-empty-state">
          <div className="studio-empty-icon-box">
            <UserCheck className="w-12 h-12 text-emerald-400" />
          </div>
          <h3 className="studio-empty-title">Foto Carnet & Pasaporte</h3>
          <p className="studio-empty-desc">
            Toma o selecciona una foto de una persona. Podrás recortar el encuadre carnet, aplicar fondo blanco puro y un filtro de belleza natural.
          </p>

          <div className="studio-launch-buttons">
            <button className="btn-primary w-full py-3.5 mb-3" onClick={handleTakeNewPhoto}>
              <Camera className="w-5 h-5 mr-2" />
              Tomar Foto a Persona
            </button>
            <button className="btn-secondary w-full py-3.5" onClick={handlePickFromGallery}>
              <ImageIcon className="w-5 h-5 mr-2 text-cyan-400" />
              Elegir de Galería
            </button>
          </div>
        </div>
      )}

      {/* 2. Paso de Encuadre y Recorte Carnet */}
      {currentStep === 'crop' && displayUrl && (
        <div className="studio-editor-viewport">
          <div className="studio-crop-stage">
            <div className="studio-crop-box-wrapper">
              <img
                ref={cropImageRef}
                src={displayUrl}
                alt="Encuadre de foto carnet"
                className="studio-crop-source"
              />

              {/* Guía visual de silueta ovalada para rostro */}
              <div className="portrait-face-guide-overlay">
                <div className="face-oval-guide" />
                <span className="face-guide-hint">Centra el rostro en la guía</span>
              </div>
            </div>
          </div>

          <div className="studio-crop-controls">
            <div className="ratio-selector-row">
              {ASPECT_RATIOS.map((r) => (
                <button
                  key={r.id}
                  className={`ratio-pill-btn ${selectedRatio === r.id ? 'active' : ''}`}
                  onClick={() => setSelectedRatio(r.id)}
                >
                  {r.label}
                </button>
              ))}
            </div>

            <button className="btn-primary w-full py-3" onClick={handleApplyCrop} disabled={isProcessing}>
              <Check className="w-5 h-5 mr-2" />
              Continuar a Fondo Blanco & Belleza
            </button>
          </div>
        </div>
      )}

      {/* 3. Paso de Acabado: Fondo Blanco & Filtro de Belleza */}
      {currentStep === 'studio' && (
        <div className="studio-editor-viewport">
          {/* Pestañas de Vista: Individual vs Hoja Imprimible */}
          <div className="studio-view-tabs">
            <button
              className={`studio-tab-btn ${previewMode === 'single' ? 'active' : ''}`}
              onClick={() => handleToggleSheetMode('single')}
            >
              <UserCheck className="w-4 h-4 mr-1.5" />
              Foto Individual
            </button>
            <button
              className={`studio-tab-btn ${previewMode === 'sheet' ? 'active' : ''}`}
              onClick={() => handleToggleSheetMode('sheet')}
            >
              <Printer className="w-4 h-4 mr-1.5" />
              Plantilla 6 Fotos (4x6")
            </button>
          </div>

          {/* Lienzo de previsualización */}
          <div className="studio-image-stage">
            {displayUrl && (
              <div
                className={`studio-preview-box ${previewMode === 'single' ? 'interactive-sample' : ''}`}
                onClick={handleImageClickSample}
                title={previewMode === 'single' ? 'Toca cualquier punto del fondo para muestrear su color' : ''}
              >
                <img
                  src={displayUrl}
                  alt="Previsualización de foto carnet"
                  className={`studio-rendered-img ${previewMode === 'single' ? 'photo-carnet-ratio' : 'sheet-ratio'}`}
                />

                {previewMode === 'single' && seedPoint && (
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
              <ProgressBar
                progress={processProgress}
                title="Procesando Retrato"
                statusText={processStatus}
                isOverlay={true}
              />
            )}
          </div>

          {/* Selector de Filtro de Belleza */}
          {previewMode === 'single' && (
            <div className="beauty-filter-bar">
              <div className="beauty-label-row">
                <Wand2 className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-xs font-semibold text-white">Filtro de Belleza / Piel:</span>
              </div>
              <div className="beauty-buttons-strip">
                {BEAUTY_LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    className={`beauty-pill-btn ${beautyLevel === lvl.id ? 'active' : ''}`}
                    onClick={() => handleBeautyChange(lvl.id)}
                    disabled={isProcessing}
                  >
                    {lvl.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Ajustes de fondo blanco para foto individual */}
          {previewMode === 'single' && (
            <div className="white-bg-controls-panel studio-panel">
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
                <span className="text-[10px] text-gray-400">Suave</span>
                <input
                  type="range"
                  min="15"
                  max="80"
                  value={tolerance}
                  onChange={(e) => handleToleranceChange(Number(e.target.value))}
                  className="tolerance-slider"
                />
                <span className="text-[10px] text-gray-400">Fuerte</span>
              </div>
              <div className="white-bg-tip">
                <Info className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span>Toca en la foto el color de pared/fondo para afinar el recorte.</span>
              </div>
            </div>
          )}

          {/* Barra de Acciones de Compartir / Guardar */}
          <div className="studio-bottom-actions">
            <button className="btn-secondary" onClick={() => setCurrentStep('crop')}>
              <Crop className="w-4 h-4 mr-1.5" />
              Re-encuadrar
            </button>
            <button className="btn-secondary" onClick={handleDownload} disabled={isProcessing}>
              <Download className="w-4 h-4 mr-1.5 text-cyan-400" />
              Guardar JPG
            </button>
            <button className="btn-primary" onClick={handleShare} disabled={isProcessing}>
              <MessageCircle className="w-4 h-4 mr-1.5" />
              Compartir
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
