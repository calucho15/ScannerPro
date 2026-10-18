import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import HomeScreen from './components/HomeScreen';
import CameraView from './components/CameraView';
import InteractiveCrop from './components/InteractiveCrop';
import FilterScreen from './components/FilterScreen';
import DocumentViewer from './components/DocumentViewer';
import ShareCompleteScreen from './components/ShareCompleteScreen';
import PortraitStudio from './components/PortraitStudio';
import ChangelogModal from './components/ChangelogModal';
import { warpPerspective } from './services/api';
import { generateDemoDocumentBlob } from './services/demoDoc';
import {
  getAllDocuments,
  saveDocument,
  updateDocument,
  getDocumentById,
  deleteDocument,
  renameDocument
} from './services/storage';
import { capturePhotoNative, pickPhotoNative } from './services/cameraService';
import { Capacitor } from '@capacitor/core';
import './App.css';

const VIEW_STATES = {
  HOME: 'HOME',
  CAMERA: 'CAMERA',
  CROP: 'CROP',
  FILTER: 'FILTER',
  DOCUMENT: 'DOCUMENT',
  SHARE_COMPLETE: 'SHARE_COMPLETE',
  PORTRAIT_STUDIO: 'PORTRAIT_STUDIO',
};

export default function App() {
  const [currentView, setCurrentView] = useState(VIEW_STATES.HOME);
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Biblioteca de documentos guardados en IndexedDB
  const [savedDocs, setSavedDocs] = useState([]);

  // Estados del flujo de escaneo activo
  const [capturedBlob, setCapturedBlob] = useState(null);
  const [warpedBlob, setWarpedBlob] = useState(null);
  
  // Documento actual multipágina
  const [docPages, setDocPages] = useState([]);
  const [docTitle, setDocTitle] = useState(() => createNewDocTitle([]));

  // Rastreo de re-edición
  const [editingDocId, setEditingDocId] = useState(null);
  const [editingPageIndex, setEditingPageIndex] = useState(null);

  // Último documento completado para la pantalla de compartir
  const [lastFinishedDoc, setLastFinishedDoc] = useState(null);

  /**
   * Genera el nombre del archivo en formato: Escaneo_Dia-Mes-Año (Ej. Escaneo_18-10-2026)
   */
  function createNewDocTitle(docs = savedDocs) {
    const d = new Date();
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    const base = `Escaneo_${day}-${month}-${year}`;

    const existingCount = docs.filter(
      (doc) => doc.title === base || (doc.title && doc.title.startsWith(`${base} `))
    ).length;

    if (existingCount > 0) {
      return `${base} (${existingCount + 1})`;
    }
    return base;
  }

  useEffect(() => {
    loadSavedDocuments();
  }, []);

  const loadSavedDocuments = async () => {
    try {
      const docs = await getAllDocuments();
      setSavedDocs(docs);
    } catch (e) {
      console.warn("Error cargando documentos de IndexedDB:", e);
    }
  };

  // 1. Iniciar captura con cámara (Nativa de Android / Móvil)
  const handleStartCamera = async () => {
    if (Capacitor.isNativePlatform()) {
      const photoBlob = await capturePhotoNative();
      if (photoBlob) {
        handleImageReady(photoBlob);
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageReady(file);
      };
      input.click();
    }
  };

  // 2. Imagen seleccionada (desde cámara o archivo de galería)
  const handleImageReady = (blob) => {
    setCapturedBlob(blob);
    setCurrentView(VIEW_STATES.CROP);
  };

  // 3. Cargar documento de prueba demo
  const handleLoadDemo = async () => {
    setEditingDocId(null);
    setEditingPageIndex(null);
    setDocPages([]);
    setDocTitle(createNewDocTitle());
    const demoBlob = await generateDemoDocumentBlob();
    handleImageReady(demoBlob);
  };

  // 4. Aplicar recorte y transformación de perspectiva
  const handleApplyCrop = async (corners) => {
    try {
      const rectified = await warpPerspective(capturedBlob, corners);
      setWarpedBlob(rectified);
      setCurrentView(VIEW_STATES.FILTER);
    } catch (err) {
      alert("Error al enderezar el documento: " + err.message);
    }
  };

  // 5. Guardar página finalizada (creación o re-edición de página existente)
  const handleSavePage = async (finalPageBlob) => {
    let updated;
    if (editingPageIndex !== null) {
      updated = [...docPages];
      updated[editingPageIndex] = finalPageBlob;
      setEditingPageIndex(null);
    } else {
      updated = [...docPages, finalPageBlob];
    }
    setDocPages(updated);

    if (editingDocId) {
      try {
        await updateDocument(editingDocId, { pages: updated });
        await loadSavedDocuments();
      } catch (e) {
        console.warn("Error actualizando documento en storage:", e);
      }
    }
    setCurrentView(VIEW_STATES.DOCUMENT);
  };

  // 6. Añadir otra página al documento
  const handleAddAnotherPage = async (finalPageBlob) => {
    let updated;
    if (editingPageIndex !== null) {
      updated = [...docPages];
      updated[editingPageIndex] = finalPageBlob;
      setEditingPageIndex(null);
    } else {
      updated = [...docPages, finalPageBlob];
    }
    setDocPages(updated);

    if (editingDocId) {
      try {
        await updateDocument(editingDocId, { pages: updated });
        await loadSavedDocuments();
      } catch (e) {
        console.warn("Error actualizando documento en storage:", e);
      }
    }

    if (Capacitor.isNativePlatform()) {
      const photoBlob = await capturePhotoNative();
      if (photoBlob) {
        handleImageReady(photoBlob);
        return;
      }
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (file) handleImageReady(file);
      };
      input.click();
      return;
    }
    setCurrentView(VIEW_STATES.DOCUMENT);
  };

  // 7. Eliminar una página del documento
  const handleDeletePage = async (pageIndex) => {
    const updated = docPages.filter((_, idx) => idx !== pageIndex);
    setDocPages(updated);
    if (editingDocId) {
      try {
        await updateDocument(editingDocId, { pages: updated });
        await loadSavedDocuments();
      } catch (e) {
        console.warn("Error eliminando página en storage:", e);
      }
    }
  };

  // 7.1 Actualizar una página rotada o procesada
  const handleUpdatePage = async (pageIndex, newPageBlob) => {
    const updated = [...docPages];
    updated[pageIndex] = newPageBlob;
    setDocPages(updated);
    if (editingDocId) {
      try {
        await updateDocument(editingDocId, { pages: updated });
        await loadSavedDocuments();
      } catch (e) {
        console.warn("Error actualizando página en storage:", e);
      }
    }
  };

  // 8. Re-editar recorte de una página
  const handleEditPageCrop = (pageIdx, pageBlob) => {
    setEditingPageIndex(pageIdx);
    setCapturedBlob(pageBlob);
    setCurrentView(VIEW_STATES.CROP);
  };

  // 9. Re-editar filtro de una página
  const handleEditPageFilter = (pageIdx, pageBlob) => {
    setEditingPageIndex(pageIdx);
    setWarpedBlob(pageBlob);
    setCurrentView(VIEW_STATES.FILTER);
  };

  // 10. Cambiar título del documento
  const handleDocTitleChange = async (newTitle) => {
    setDocTitle(newTitle);
    if (editingDocId && newTitle.trim()) {
      try {
        await renameDocument(editingDocId, newTitle.trim());
      } catch (e) {
        console.warn("Error al auto-guardar título:", e);
      }
    }
  };

  // 11. Finalizar documento, guardar/actualizar en IndexedDB y abrir pantalla de compartir
  const handleFinishAndSave = async ({ title, pages, pdfBlob, thumbnailBlob }) => {
    try {
      let saved;
      if (editingDocId) {
        saved = await updateDocument(editingDocId, {
          title,
          pages,
          pdfBlob,
          thumbnailBlob
        });
      } else {
        saved = await saveDocument({
          title,
          pages,
          pdfBlob,
          thumbnailBlob
        });
      }

      await loadSavedDocuments();
      setLastFinishedDoc(saved);
      setCurrentView(VIEW_STATES.SHARE_COMPLETE);
    } catch (err) {
      alert("Error al guardar el documento: " + err.message);
    }
  };

  // 12. Abrir visor desde la biblioteca de inicio
  const handleOpenDocViewer = async (docRecord) => {
    try {
      const fullDoc = await getDocumentById(docRecord.id);
      if (fullDoc && fullDoc.pages && fullDoc.pages.length > 0) {
        setEditingDocId(fullDoc.id);
        setEditingPageIndex(null);
        setDocPages(fullDoc.pages);
        setDocTitle(fullDoc.title || createNewDocTitle());
        setCurrentView(VIEW_STATES.DOCUMENT);
      } else {
        alert("El documento no contiene páginas válidas.");
      }
    } catch (e) {
      alert("Error al abrir el documento: " + e.message);
    }
  };

  // 13. Eliminar documento guardado
  const handleDeleteSavedDoc = async (docId) => {
    try {
      await deleteDocument(docId);
      await loadSavedDocuments();
      if (editingDocId === docId) {
        setEditingDocId(null);
        setDocPages([]);
        setCurrentView(VIEW_STATES.HOME);
      }
    } catch (e) {
      alert("Error eliminando documento: " + e.message);
    }
  };

  // 14. Renombrar documento guardado desde la biblioteca
  const handleRenameSavedDoc = async (docId, newTitle) => {
    try {
      await renameDocument(docId, newTitle);
      await loadSavedDocuments();
      if (editingDocId === docId) {
        setDocTitle(newTitle);
      }
    } catch (e) {
      alert("Error renombrando documento: " + e.message);
    }
  };

  return (
    <div className="app-layout">
      <Header
        onOpenChangelog={() => setIsChangelogOpen(true)}
        onHomeClick={() => {
          setEditingDocId(null);
          setEditingPageIndex(null);
          setCurrentView(VIEW_STATES.HOME);
        }}
      />

      <main className="app-main-content">
        {currentView === VIEW_STATES.HOME && (
          <HomeScreen
            onStartCamera={() => {
              setEditingDocId(null);
              setEditingPageIndex(null);
              setDocPages([]);
              setDocTitle(createNewDocTitle());
              handleStartCamera();
            }}
            onImageSelect={(blob) => {
              setEditingDocId(null);
              setEditingPageIndex(null);
              setDocPages([]);
              setDocTitle(createNewDocTitle());
              handleImageReady(blob);
            }}
            onOpenPortraitStudio={() => setCurrentView(VIEW_STATES.PORTRAIT_STUDIO)}
            currentDocPages={docPages}
            onViewCurrentDoc={() => setCurrentView(VIEW_STATES.DOCUMENT)}
            onLoadDemoDocument={handleLoadDemo}
            savedDocs={savedDocs}
            onOpenDoc={handleOpenDocViewer}
            onDeleteDoc={handleDeleteSavedDoc}
            onRenameDoc={handleRenameSavedDoc}
          />
        )}

        {currentView === VIEW_STATES.PORTRAIT_STUDIO && (
          <PortraitStudio onBack={() => setCurrentView(VIEW_STATES.HOME)} />
        )}

        {currentView === VIEW_STATES.CAMERA && (
          <CameraView
            onCapture={handleImageReady}
            onClose={() => setCurrentView(docPages.length > 0 ? VIEW_STATES.DOCUMENT : VIEW_STATES.HOME)}
          />
        )}

        {currentView === VIEW_STATES.CROP && capturedBlob && (
          <InteractiveCrop
            imageBlob={capturedBlob}
            onApplyCrop={handleApplyCrop}
            onBack={() => {
              if (editingPageIndex !== null || docPages.length > 0) {
                setCurrentView(VIEW_STATES.DOCUMENT);
              } else {
                setCurrentView(VIEW_STATES.HOME);
              }
            }}
          />
        )}

        {currentView === VIEW_STATES.FILTER && warpedBlob && (
          <FilterScreen
            warpedBlob={warpedBlob}
            onSavePage={handleSavePage}
            onAddAnotherPage={handleAddAnotherPage}
            onBackToCrop={() => setCurrentView(VIEW_STATES.CROP)}
          />
        )}

        {currentView === VIEW_STATES.DOCUMENT && (
          <DocumentViewer
            pages={docPages}
            docTitle={docTitle}
            onTitleChange={handleDocTitleChange}
            onAddPage={() => {
              setEditingPageIndex(null);
              handleStartCamera();
            }}
            onDeletePage={handleDeletePage}
            onUpdatePage={handleUpdatePage}
            onEditPageCrop={handleEditPageCrop}
            onEditPageFilter={handleEditPageFilter}
            onBackToHome={() => {
              setEditingDocId(null);
              setEditingPageIndex(null);
              setCurrentView(VIEW_STATES.HOME);
            }}
            onFinishAndSave={handleFinishAndSave}
          />
        )}

        {currentView === VIEW_STATES.SHARE_COMPLETE && lastFinishedDoc && (
          <ShareCompleteScreen
            docRecord={lastFinishedDoc}
            onGoHome={() => {
              setEditingDocId(null);
              setEditingPageIndex(null);
              setCurrentView(VIEW_STATES.HOME);
            }}
            onScanAnother={() => {
              setEditingDocId(null);
              setEditingPageIndex(null);
              setDocPages([]);
              setDocTitle(createNewDocTitle());
              handleStartCamera();
            }}
            onDocUpdated={loadSavedDocuments}
            onViewFullDoc={handleOpenDocViewer}
          />
        )}
      </main>

      <ChangelogModal
        isOpen={isChangelogOpen}
        onClose={() => setIsChangelogOpen(false)}
      />
    </div>
  );
}
