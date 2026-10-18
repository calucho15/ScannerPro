import React, { useState, useEffect, useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  ArrowLeft,
  RotateCw,
  Sliders,
  Check,
  Share2,
  Download,
  MessageCircle,
  Crosshair,
  Info,
  Grid,
  Sparkles,
  Layers,
  Printer,
  UserCheck
} from 'lucide-react';
import { removePhotoBackground, rotateImage, createIdPhotoSheet } from '../services/api';
import { shareFileNative, downloadFileLocal } from '../services/shareService';
import { capturePhotoNative, pickPhotoNative } from '../services/cameraService';
import { Capacitor } from '@capacitor/core';
import ProgressBar from './ProgressBar';

export default function PortraitStudio({ onBack }) {
  const [sourceBlob, setSourceBlob] = useState(null);
  const [processedBlob, setProcessedBlob] = useState(null);
  const [sheetBlob, setSheetBlob] = useState(null);
  const [previewMode, setPreviewMode] = useState('single'); // 'single' | 'sheet'

  const [tolerance, setTolerance] = useState(40);
  const [seedPoint, setSeedPoint] = useState(null);
  const [aspectRatio, setAspectRatio] = useState('3:4'); // '3:4' | '1:1' | 'free'

  const [isProcessing, setIsProcessing] = useState(false);
  const [processProgress, setProcessProgress] = useState(0);
  const [processStatus, setProcessStatus] = useState('');

  const [displayUrl, setDisplayUrl] = useState(null);
  const fileInputRef = useRef(null);

  // Iniciar toma de foto
  const handleTakeNewPhoto = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const photo = await capturePhotoNative();
        if (photo) {
          handleInitPhoto(photo);
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
          handleInitPhoto(photo);
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
      handleInitPhoto(file);
      e.target.value = '';
    }
  };

  const handleInitPhoto = (blob) => {
    setSourceBlob(blob);
    setSeedPoint(null);
    setSheetBlob(null);
    setPreviewMode('single');
    processWhiteBackground(blob, { tolerance: 40, seedPoint: null });
  };

  const processWhiteBackground = async (inputBlob, options = { tolerance, seedPoint }) => {
    if (!inputBlob) return;
    setIsProcessing(true);
    setProcessProgress(20);
    setProcessStatus('Analizando silueta de la persona...');

    const timer = setInterval(() => {
      setProcessProgress((prev) => (prev < 80 ? prev + 20 : prev));
    }, 150);

    try {
      const result = await removePhotoBackground(inputBlob, options);
      clearInterval(timer);
      setProcessProgress(100);
      setProcessStatus('Fondo blanco puro aplicado');
      setProcessedBlob(result);
      setSheetBlob(null); // Invalidar plantilla previa
      updateDisplayUrl(result);
    } catch (err) {
      clearInterval(timer);
      console.error("Error al quitar fondo:", err);
      alert("Error procesando fotografía: " + err.message);
    } finally {
      setTimeout(() => setIsProcessing(false), 200);
    }
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

  const handleToleranceChange = (newVal) => {
    setTolerance(newVal);
    processWhiteBackground(sourceBlob, { tolerance: newVal, seedPoint });
  };

  const handleImageClick = (e) => {
    if (!sourceBlob || isProcessing || previewMode === 'sheet') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const rx = (e.clientX - rect.left) / rect.width;
    const ry = (e.clientY - rect.top) / rect.height;
    const newSeed = { x: rx, y: ry };
    setSeedPoint(newSeed);
    processWhiteBackground(sourceBlob, { tolerance, seedPoint: newSeed });
  };

  const handleResetSeed = () => {
    setSeedPoint(null);
    processWhiteBackground(sourceBlob, { tolerance, seedPoint: null });
  };

  const handleRotate90 = async () => {
    if (!sourceBlob || isProcessing) return;
    setIsProcessing(true);
    setProcessProgress(40);
    setProcessStatus('Rotando fotografía...');
    try {
      const rotated = await rotateImage(sourceBlob, 90);
      setSourceBlob(rotated);
      await processWhiteBackground(rotated, { tolerance, seedPoint });
    } catch (e) {
      alert("Error rotando fotografía: " + e.message);
    } finally {
      setIsProcessing(false);
    }
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
      setProcessProgress(50);
      setProcessStatus('Armando plantilla imprimible 4x6" (6 fotos carnet)...');
      try {
        const sheet = await createIdPhotoSheet(processedBlob || sourceBlob, 6);
        setSheetBlob(sheet);
        updateDisplayUrl(sheet);
        setProcessProgress(100);
      } catch (err) {
        alert("Error creando plantilla: " + err.message);
      } finally {
        setIsProcessing(false);
      }
    } else {
      updateDisplayUrl(processedBlob);
    }
  };

  const handleShare = async () => {
    const activeBlob = previewMode === 'sheet' ? sheetBlob : processedBlob;
    if (!activeBlob) return;
    const isSheet = previewMode === 'sheet';
    const fileName = isSheet ? 'Plantilla_Fotos_Carnet_4x6.jpg' : 'Foto_Carnet_Fondo_Blanco.jpg';
    await shareFileNative(activeBlob, fileName, isSheet ? 'Plantilla 6 Fotos Carnet' : 'Foto Carnet Fondo Blanco');
  };

  const handleDownload = async () => {
    const activeBlob = previewMode === 'sheet' ? sheetBlob : processedBlob;
    if (!activeBlob) return;
    const isSheet = previewMode === 'sheet';
    const fileName = isSheet ? 'Plantilla_Fotos_Carnet_4x6.jpg' : 'Foto_Carnet_Fondo_Blanco.jpg';
    await downloadFileLocal(activeBlob, fileName);
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
        <button className="icon-btn-ghost" onClick={onBack} title="Volver al menú">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="studio-header-titles">
          <h2 className="studio-title">Estudio Foto Carnet</h2>
          <span className="studio-subtitle">Fondo blanco profesional para personas y retratos</span>
        </div>
        {sourceBlob && (
          <button className="icon-btn-ghost" onClick={handleRotate90} title="Rotar 90°">
            <RotateCw className="w-5 h-5 text-cyan-400" />
          </button>
        )}
      </div>

      {/* Contenido Principal */}
      {!sourceBlob ? (
        <div className="studio-empty-state">
          <div className="studio-empty-icon-box">
            <UserCheck className="w-12 h-12 text-emerald-400" />
          </div>
          <h3 className="studio-empty-title">Foto Carnet y Pasaporte</h3>
          <p className="studio-empty-desc">
            Toma o selecciona una foto de una persona. El sistema aislará automáticamente el fondo y lo sustituirá por blanco puro (#FFFFFF), listo para imprimir o enviar.
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
      ) : (
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
                onClick={handleImageClick}
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
                title="Procesando Fotografía"
                statusText={processStatus}
                isOverlay={true}
              />
            )}
          </div>

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
            <button className="btn-secondary" onClick={handleTakeNewPhoto}>
              <Camera className="w-4 h-4 mr-1.5" />
              Otra Foto
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
