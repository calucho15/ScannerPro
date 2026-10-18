import React, { useRef } from 'react';
import {
  Camera,
  Image as ImageIcon,
  FileText,
  UserCheck,
  Zap,
  ArrowRight,
  Layers,
  Sparkles
} from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { capturePhotoNative, pickPhotoNative } from '../services/cameraService';
import DocumentLibrary from './DocumentLibrary';

export default function HomeScreen({
  onStartCamera,
  onImageSelect,
  onOpenPortraitStudio,
  currentDocPages,
  onViewCurrentDoc,
  onLoadDemoDocument,
  savedDocs = [],
  onOpenDoc,
  onDeleteDoc,
  onRenameDoc
}) {
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  // Manejar captura con cámara para documentos
  const handleCameraClick = () => {
    if (onStartCamera) {
      onStartCamera();
      return;
    }
    cameraInputRef.current?.click();
  };

  // Manejar selección de galería para documentos
  const handleGalleryClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const blob = await pickPhotoNative();
        if (blob) {
          onImageSelect([blob]);
          return;
        }
      } catch (e) {
        console.warn("Fallo Capacitor Gallery, recurriendo a selector de sistema:", e);
      }
    }
    galleryInputRef.current?.click();
  };

  const handleCameraChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImageSelect(files);
      e.target.value = '';
    }
  };

  const handleGalleryChange = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onImageSelect(files);
      e.target.value = '';
    }
  };

  return (
    <div className="home-screen">
      {/* Inputs ocultos universales */}
      <input
        type="file"
        ref={cameraInputRef}
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={handleCameraChange}
      />
      <input
        type="file"
        ref={galleryInputRef}
        accept="image/*"
        multiple
        style={{ display: 'none' }}
        onChange={handleGalleryChange}
      />

      {/* Banner de documento en progreso si existe */}
      {currentDocPages.length > 0 && (
        <div className="active-doc-banner" onClick={onViewCurrentDoc}>
          <div className="flex items-center gap-3">
            <div className="active-doc-icon">
              <FileText className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h4 className="font-semibold text-white">Documento en edición</h4>
              <p className="text-xs text-gray-400">{currentDocPages.length} página(s) escaneadas</p>
            </div>
          </div>
          <button className="btn-resume-doc">
            Continuar <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Módulo de Herramientas Principales */}
      <div className="tools-selection-section">
        <div className="section-title-row">
          <h2 className="home-section-title">Herramientas</h2>
          <span className="home-section-tag">Directo en tu móvil</span>
        </div>

        <div className="tools-cards-container">
          {/* Tarjeta 1: Escanear Documento */}
          <div className="tool-main-card">
            <div className="tool-card-body">
              <div className="tool-badge-icon doc-tool">
                <FileText className="w-6 h-6 text-emerald-400" />
              </div>
              <div className="tool-texts">
                <h3 className="tool-title">Escanear Documento</h3>
                <p className="tool-desc">
                  Recorte de bordes automático, eliminación de sombras y exportación a PDF multipágina.
                </p>
              </div>
            </div>

            <div className="tool-card-actions">
              <button className="btn-tool-action primary" onClick={handleCameraClick}>
                <Camera className="w-4 h-4 mr-2" />
                Cámara
              </button>
              <button className="btn-tool-action secondary" onClick={handleGalleryClick}>
                <ImageIcon className="w-4 h-4 mr-2 text-cyan-400" />
                Galería
              </button>
            </div>
          </div>

          {/* Tarjeta 2: Foto Carnet & Retrato Fondo Blanco */}
          <div className="tool-main-card portrait-tool-card" onClick={onOpenPortraitStudio}>
            <div className="tool-card-body">
              <div className="tool-badge-icon portrait-tool">
                <UserCheck className="w-6 h-6 text-purple-400" />
              </div>
              <div className="tool-texts">
                <div className="flex items-center gap-2">
                  <h3 className="tool-title">Foto Carnet & Retrato</h3>
                  <span className="badge-new-tool">Nuevo</span>
                </div>
                <p className="tool-desc">
                  Toma foto a una persona, quita el fondo a blanco puro (#FFFFFF) y genera plantillas listas para imprimir.
                </p>
              </div>
            </div>

            <div className="tool-card-actions">
              <button className="btn-tool-action purple-action w-full" onClick={onOpenPortraitStudio}>
                <UserCheck className="w-4 h-4 mr-2" />
                Abrir Estudio de Foto Carnet
              </button>
            </div>
          </div>
        </div>

        {/* Acceso de prueba con documento demo */}
        <div className="demo-doc-container">
          <button className="btn-demo-test" onClick={onLoadDemoDocument}>
            <Zap className="w-4 h-4 mr-2 text-amber-400" />
            Probar escáner con documento de prueba
          </button>
        </div>
      </div>

      {/* Sección de Documentos Guardados */}
      {savedDocs.length > 0 && (
        <DocumentLibrary
          documents={savedDocs}
          onOpenDoc={onOpenDoc}
          onDeleteDoc={onDeleteDoc}
          onRenameDoc={onRenameDoc}
        />
      )}
    </div>
  );
}
