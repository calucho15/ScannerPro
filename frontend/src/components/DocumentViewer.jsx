import React, { useState, useEffect } from 'react';
import {
  FileText,
  Download,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Loader2,
  ArrowLeft,
  Check,
  MessageCircle,
  Crop,
  Image as ImageIcon,
  Maximize2,
  X,
  Sparkles,
  RotateCw,
  RotateCcw,
  Zap,
  Printer
} from 'lucide-react';
import { generatePdf, rotateImage } from '../services/api';
import { shareFileNative, downloadFileLocal } from '../services/shareService';
import ProgressBar from './ProgressBar';

export default function DocumentViewer({
  pages = [], // Array de blobs de imágenes procesadas
  docTitle,
  onTitleChange,
  onAddPage,
  onDeletePage,
  onUpdatePage,
  onEditPageCrop,
  onEditPageFilter,
  onBackToHome,
  onFinishAndSave
}) {
  const [currentPageIdx, setCurrentPageIdx] = useState(0);
  const [pageUrls, setPageUrls] = useState([]);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pdfStatusText, setPdfStatusText] = useState('');
  const [isRotatingPage, setIsRotatingPage] = useState(false);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [showSaveMenu, setShowSaveMenu] = useState(false);
  const [pdfQualityPreset, setPdfQualityPreset] = useState('standard'); // 'lightweight' | 'standard' | 'hd'

  useEffect(() => {
    // Generar URLs para previsualizar cada página
    const urls = pages.map((blob) => {
      try {
        return URL.createObjectURL(blob);
      } catch (e) {
        return null;
      }
    });
    setPageUrls(urls);

    return () => {
      setTimeout(() => {
        urls.forEach((u) => {
          if (u) {
            try { URL.revokeObjectURL(u); } catch (e) {}
          }
        });
      }, 10000);
    };
  }, [pages]);

  const getCompiledPdfBlob = async (preset = pdfQualityPreset) => {
    setPdfProgress(20);
    setPdfStatusText('Iniciando páginas del documento...');
    const timer = setInterval(() => {
      setPdfProgress((p) => (p < 85 ? p + 15 : p));
    }, 180);

    try {
      const blob = await generatePdf(pages, true, preset);
      clearInterval(timer);
      setPdfProgress(100);
      setPdfStatusText('PDF compilado con éxito');
      return blob;
    } catch (e) {
      clearInterval(timer);
      throw e;
    }
  };

  // Rotar página actual (-90° izquierda o +90° derecha)
  const handleRotateCurrentPage = async (degrees = 90) => {
    if (isRotatingPage || !pages[currentPageIdx]) return;
    setIsRotatingPage(true);
    try {
      const rotated = await rotateImage(pages[currentPageIdx], degrees);
      if (onUpdatePage) {
        onUpdatePage(currentPageIdx, rotated);
      }
    } catch (err) {
      alert("Error al rotar página: " + err.message);
    } finally {
      setIsRotatingPage(false);
    }
  };

  // Compartir PDF directamente a WhatsApp, Telegram, etc.
  const handleSharePdf = async () => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await getCompiledPdfBlob(pdfQualityPreset);
      const fileName = `${docTitle.trim() || 'Documento_Escaneado'}.pdf`;
      await shareFileNative(pdfBlob, fileName, docTitle);
    } catch (err) {
      alert("Error al compartir PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Compartir página actual como imagen JPEG
  const handleShareCurrentPageImage = async () => {
    if (pages.length === 0) return;
    try {
      const currentBlob = pages[currentPageIdx];
      const fileName = `${docTitle.trim() || 'Escaneo'}_pag_${currentPageIdx + 1}.jpg`;
      await shareFileNative(currentBlob, fileName, `${docTitle} - Pág ${currentPageIdx + 1}`);
    } catch (err) {
      alert("Error al compartir imagen: " + err.message);
    }
  };

  // Guardar PDF en el almacenamiento local del teléfono
  const handleDownloadPdf = async () => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    setShowSaveMenu(false);
    try {
      const pdfBlob = await getCompiledPdfBlob(pdfQualityPreset);
      const fileName = `${docTitle.trim() || 'Documento_Escaneado'}.pdf`;
      await downloadFileLocal(pdfBlob, fileName);
    } catch (err) {
      alert("Error al guardar PDF: " + err.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Guardar imagen JPEG actual en el teléfono
  const handleDownloadImage = async () => {
    if (pages.length === 0) return;
    setShowSaveMenu(false);
    try {
      const currentBlob = pages[currentPageIdx];
      const fileName = `${docTitle.trim() || 'Escaneo'}_pag_${currentPageIdx + 1}.jpg`;
      await downloadFileLocal(currentBlob, fileName);
    } catch (err) {
      alert("Error al guardar imagen: " + err.message);
    }
  };

  const handleFinish = async () => {
    if (pages.length === 0) return;
    setIsGeneratingPdf(true);
    try {
      const pdfBlob = await getCompiledPdfBlob(pdfQualityPreset);
      onFinishAndSave({
        title: docTitle.trim() || 'Documento_Escaneado',
        pages,
        pdfBlob,
        thumbnailBlob: pages[0]
      });
    } catch (e) {
      alert("Error al compilar documento: " + e.message);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  if (pages.length === 0) {
    return (
      <div className="empty-doc-state">
        <p>No hay páginas en este documento.</p>
        <button className="btn-primary" onClick={onAddPage}>
          <Plus className="w-5 h-5 mr-2" />
          Añadir Página
        </button>
      </div>
    );
  }

  return (
    <div className="doc-viewer-screen">
      {/* Encabezado con título editable */}
      <div className="doc-viewer-header">
        <button className="icon-btn-ghost" onClick={onBackToHome} title="Inicio">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <div className="doc-title-input-wrapper">
          <input
            type="text"
            className="doc-title-input"
            value={docTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="Título del documento..."
          />
        </div>
        <button
          className="btn-finish-doc"
          onClick={handleFinish}
          disabled={isGeneratingPdf}
          title="Guardar y Compartir"
        >
          {isGeneratingPdf ? (
            <Loader2 className="w-4 h-4 animate-spin mr-1" />
          ) : (
            <Check className="w-4 h-4 mr-1 text-black font-bold" />
          )}
          <span>Listo</span>
        </button>
      </div>

      {/* Selector de Calidad de PDF */}
      <div className="pdf-quality-bar">
        <span className="pdf-quality-label">Calidad PDF:</span>
        <div className="pdf-quality-pills">
          <button
            className={`quality-pill ${pdfQualityPreset === 'lightweight' ? 'active' : ''}`}
            onClick={() => setPdfQualityPreset('lightweight')}
            title="Optimizado para WhatsApp y datos móviles (~250 KB)"
          >
            <Zap className="w-3 h-3 mr-1 text-amber-400" />
            <span>Ligero WhatsApp</span>
          </button>
          <button
            className={`quality-pill ${pdfQualityPreset === 'standard' ? 'active' : ''}`}
            onClick={() => setPdfQualityPreset('standard')}
            title="Equilibrio ideal nitidez/peso (~800 KB)"
          >
            <span>Estándar HD</span>
          </button>
          <button
            className={`quality-pill ${pdfQualityPreset === 'hd' ? 'active' : ''}`}
            onClick={() => setPdfQualityPreset('hd')}
            title="Máxima nitidez para impresión formal"
          >
            <Printer className="w-3 h-3 mr-1 text-cyan-400" />
            <span>Máxima Nitidez</span>
          </button>
        </div>
      </div>

      {/* Visor central de la página actual */}
      <div className="doc-page-main-container">
        {pageUrls[currentPageIdx] && (
          <div className="doc-page-card" onClick={() => setIsFullScreen(true)}>
            <img
              src={pageUrls[currentPageIdx]}
              alt={`Página ${currentPageIdx + 1}`}
              className="doc-page-image"
            />
            <div className="page-counter-badge">
              Página {currentPageIdx + 1} de {pages.length}
            </div>
            <button className="btn-zoom-overlay" title="Ver en pantalla completa">
              <Maximize2 className="w-4 h-4 text-white" />
            </button>
          </div>
        )}

        {/* Flechas de navegación entre páginas */}
        {pages.length > 1 && (
          <>
            <button
              className="page-nav-btn prev"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPageIdx((prev) => Math.max(0, prev - 1));
              }}
              disabled={currentPageIdx === 0}
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
            <button
              className="page-nav-btn next"
              onClick={(e) => {
                e.stopPropagation();
                setCurrentPageIdx((prev) => Math.min(pages.length - 1, prev + 1));
              }}
              disabled={currentPageIdx === pages.length - 1}
            >
              <ChevronRight className="w-6 h-6" />
            </button>
          </>
        )}
      </div>

      {/* Barra de Edición de Página: Re-recortar, Cambiar Filtros o Rotar */}
      <div className="page-edit-toolbar">
        <button
          className="btn-edit-page-action"
          onClick={() => onEditPageCrop(currentPageIdx, pages[currentPageIdx])}
        >
          <Crop className="w-4 h-4 mr-1.5 text-emerald-400" />
          <span>Re-ajustar</span>
        </button>

        <button
          className="btn-edit-page-action"
          onClick={() => onEditPageFilter(currentPageIdx, pages[currentPageIdx])}
        >
          <Sparkles className="w-4 h-4 mr-1.5 text-cyan-400" />
          <span>Filtro</span>
        </button>

        <button
          className="btn-edit-page-action"
          onClick={() => handleRotateCurrentPage(-90)}
          disabled={isRotatingPage}
          title="Rotar hacia la izquierda (-90°)"
        >
          {isRotatingPage ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin text-amber-400" />
          ) : (
            <RotateCcw className="w-4 h-4 mr-1 text-amber-400" />
          )}
          <span>Rotar Izq</span>
        </button>

        <button
          className="btn-edit-page-action"
          onClick={() => handleRotateCurrentPage(90)}
          disabled={isRotatingPage}
          title="Rotar hacia la derecha (+90°)"
        >
          {isRotatingPage ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin text-amber-400" />
          ) : (
            <RotateCw className="w-4 h-4 mr-1 text-amber-400" />
          )}
          <span>Rotar Der</span>
        </button>

        {pages.length > 1 && (
          <button
            className="btn-edit-page-delete"
            onClick={() => {
              if (window.confirm(`¿Eliminar página ${currentPageIdx + 1}?`)) {
                onDeletePage(currentPageIdx);
                if (currentPageIdx >= pages.length - 1) {
                  setCurrentPageIdx(Math.max(0, pages.length - 2));
                }
              }
            }}
          >
            <Trash2 className="w-4 h-4 text-red-400" />
          </button>
        )}
      </div>

      {/* Miniaturas de todas las páginas */}
      <div className="thumbnails-strip">
        <button className="thumb-add-btn" onClick={onAddPage} title="Añadir otra página">
          <Plus className="w-5 h-5 text-emerald-400" />
          <span>Añadir</span>
        </button>

        {pageUrls.map((url, idx) => (
          <div
            key={idx}
            className={`thumbnail-item ${idx === currentPageIdx ? 'selected' : ''}`}
            onClick={() => setCurrentPageIdx(idx)}
          >
            <img src={url} alt={`Miniatura ${idx + 1}`} />
            <span className="thumb-index">{idx + 1}</span>
          </div>
        ))}
      </div>

      {/* Barra de Acciones de Compartición y Guardado Nativo */}
      <div className="doc-action-bar">
        {/* Compartir PDF directamente */}
        <button
          className="action-pill-btn whatsapp-btn"
          onClick={handleSharePdf}
          disabled={isGeneratingPdf}
          title="Compartir PDF adjunto por WhatsApp y aplicaciones"
        >
          <MessageCircle className="w-5 h-5 mr-1 text-emerald-400" />
          <span>Compartir PDF</span>
        </button>

        {/* Compartir Imagen JPG directamente */}
        <button
          className="action-pill-btn image-share-btn"
          onClick={handleShareCurrentPageImage}
          title="Compartir página actual como imagen JPG"
        >
          <ImageIcon className="w-5 h-5 mr-1 text-cyan-400" />
          <span>Compartir Imagen</span>
        </button>

        {/* Menú Guardar en Teléfono */}
        <div className="relative-save-box">
          <button
            className="action-pill-btn download-btn"
            onClick={() => setShowSaveMenu(!showSaveMenu)}
          >
            <Download className="w-5 h-5 mr-1" />
            <span>Guardar</span>
          </button>

          {showSaveMenu && (
            <div className="save-options-dropdown">
              <button onClick={handleDownloadPdf}>
                <FileText className="w-4 h-4 mr-2 text-emerald-400" />
                Guardar como PDF ({pdfQualityPreset.toUpperCase()})
              </button>
              <button onClick={handleDownloadImage}>
                <ImageIcon className="w-4 h-4 mr-2 text-cyan-400" />
                Guardar Página como JPG
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Barra de Progreso al generar PDF */}
      {isGeneratingPdf && (
        <ProgressBar
          progress={pdfProgress}
          title="Compilando Documento PDF"
          statusText={pdfStatusText}
          isOverlay={true}
        />
      )}

      {/* Modal de Pantalla Completa para Inspección de Página */}
      {isFullScreen && pageUrls[currentPageIdx] && (
        <div className="fullscreen-doc-modal" onClick={() => setIsFullScreen(false)}>
          <div className="fullscreen-modal-header">
            <span>{docTitle} • Página {currentPageIdx + 1} de {pages.length}</span>
            <button className="icon-btn-close" onClick={() => setIsFullScreen(false)}>
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
          <div className="fullscreen-modal-body">
            <img
              src={pageUrls[currentPageIdx]}
              alt={`Página ${currentPageIdx + 1} completa`}
              className="fullscreen-image"
            />
          </div>
        </div>
      )}
    </div>
  );
}
