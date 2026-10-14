import React, { useRef } from 'react';
import { Camera, Image as ImageIcon, Sparkles, ShieldCheck, Cloud, FileText, ArrowRight, Zap } from 'lucide-react';
import { Capacitor } from '@capacitor/core';
import { capturePhotoNative, pickPhotoNative } from '../services/cameraService';
import DocumentLibrary from './DocumentLibrary';

export default function HomeScreen({
  onImageSelect,
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

  // Manejar captura con cámara
  const handleCameraClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const blob = await capturePhotoNative();
        if (blob) {
          onImageSelect(blob);
          return;
        }
      } catch (e) {
        console.warn("Fallo Capacitor Camera, recurriendo a selector de sistema:", e);
      }
      // Si la API nativa de Capacitor falla o es cancelada, abrir el selector del sistema
      cameraInputRef.current?.click();
    } else {
      // En navegador móvil o PC, abrir el selector directo con cámara trasera
      cameraInputRef.current?.click();
    }
  };

  // Manejar selección de galería
  const handleGalleryClick = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        const blob = await pickPhotoNative();
        if (blob) {
          onImageSelect(blob);
          return;
        }
      } catch (e) {
        console.warn("Fallo Capacitor Gallery, recurriendo a selector de sistema:", e);
      }
      galleryInputRef.current?.click();
    } else {
      galleryInputRef.current?.click();
    }
  };

  const handleCameraChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      e.target.value = ''; // Resetear para permitir tomar otra foto enseguida
    }
  };

  const handleGalleryChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onImageSelect(file);
      e.target.value = '';
    }
  };

  return (
    <div className="home-screen">
      {/* Inputs ocultos universales para navegador web/móvil */}
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
              <h4 className="font-semibold text-white">Tienes un documento en edición</h4>
              <p className="text-xs text-gray-400">{currentDocPages.length} página(s) escaneadas</p>
            </div>
          </div>
          <button className="btn-resume-doc">
            Continuar <ArrowRight className="w-4 h-4 ml-1" />
          </button>
        </div>
      )}

      {/* Hero de Acciones Principales */}
      <div className="hero-scanner-section">
        <div className="hero-text-content">
          <span className="badge-pill">Clon Libre y Seguro</span>
          <h2 className="hero-title">Escaneo Inteligente de Documentos</h2>
          <p className="hero-description">
            Digitaliza con detección automática de esquinas, eliminación de ruido de fondo,
            corrección de perspectiva y exportación directa a PDF y Google Drive.
          </p>
        </div>

        <div className="action-cards-grid">
          <button className="action-card camera-card" onClick={handleCameraClick}>
            <div className="card-icon-circle">
              <Camera className="w-8 h-8 text-emerald-400" />
            </div>
            <div className="card-texts">
              <h3>Escanear con Cámara</h3>
              <p>Captura en tiempo real con guía de bordes</p>
            </div>
          </button>

          <button className="action-card gallery-card" onClick={handleGalleryClick}>
            <div className="card-icon-circle">
              <ImageIcon className="w-8 h-8 text-cyan-400" />
            </div>
            <div className="card-texts">
              <h3>Importar de Galería</h3>
              <p>Selecciona fotos ya tomadas en tu móvil o PC</p>
            </div>
          </button>
        </div>

        {/* Botón de Demostración */}
        <div className="demo-doc-box">
          <button className="btn-demo-test" onClick={onLoadDemoDocument}>
            <Zap className="w-4 h-4 mr-2 text-amber-400" />
            ¿Sin cámara a mano? Probar con Documento de Demostración
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

      {/* Tarjetas de Ventajas / Características */}
      <div className="features-section">
        <h3 className="section-title">¿Por qué este clon es superior?</h3>
        <div className="features-grid">
          <div className="feature-item">
            <div className="feature-icon bg-emerald-500/10 text-emerald-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h4>Cero Anuncios y Sin Marcas de Agua</h4>
            <p>Exporta tus PDFs 100% limpios sin el molesto "Scanned by CamScanner".</p>
          </div>

          <div className="feature-item">
            <div className="feature-icon bg-cyan-500/10 text-cyan-400">
              <Sparkles className="w-6 h-6" />
            </div>
            <h4>Filtros de Visión OpenCV</h4>
            <p>
              Elimina sombras, reduce el grano de cámara y convierte a Blanco y Negro nítido con umbral adaptativo.
            </p>
          </div>

          <div className="feature-item">
            <div className="feature-icon bg-indigo-500/10 text-indigo-400">
              <Cloud className="w-6 h-6" />
            </div>
            <h4>Google Drive Personal</h4>
            <p>
              Sube tus documentos directamente a tu propia cuenta de Google sin servidores intermediarios.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
