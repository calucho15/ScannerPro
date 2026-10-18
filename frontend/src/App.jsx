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
import BatchCaptureModal from './components/BatchCaptureModal';
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
  BATCH_CAPTURE: 'BATCH_CAPTURE',
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

  // Flujo de captura por lotes (tomar fotos primero, editar después)
  const [batchPhotos, setBatchPhotos] = useState([]);
  const [batchEditQueue, setBatchEditQueue] = useState([]);
  const [currentBatchIndex, setCurrentBatchIndex] = useState(0);
  const [processedBatchPages, setProcessedBatchPages] = useState([]);

  // Estados de la página individual en edición activa
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

  // 1. Iniciar captura con cámara (Nativa de Android / Móvil o Web)
  const handleStartCamera = async (isAdding = false) => {
    if (!isAdding) {
      setEditingDocId(null);
      setEditingPageIndex(null);
      setDocPages([]);
      setDocTitle(createNewDocTitle());
      setBatchPhotos([]);
    }

    if (Capacitor.isNativePlatform()) {
      const photoBlob = await capturePhotoNative();
      if (photoBlob) {
        setBatchPhotos((prev) => isAdding ? [...prev, photoBlob] : [photoBlob]);
        setCurrentView(VIEW_STATES.BATCH_CAPTURE);
      }
    } else {
      setCurrentView(VIEW_STATES.CAMERA);
    }
  };

  // 2. Imágenes seleccionadas (desde selector de galería o cámara)
  const handleImagesSelected = (blobs, isAdding = false) => {
    if (!isAdding) {
      setEditingDocId(null);
      setEditingPageIndex(null);
      setDocPages([]);
      setDocTitle(createNewDocTitle());
      setBatchPhotos([]);
    }
    const arr = Array.isArray(blobs) ? blobs : [blobs];
    setBatchPhotos((prev) => isAdding ? [...prev, ...arr] : arr);
    setCurrentView(VIEW_STATES.BATCH_CAPTURE);
  };

  // 3. Iniciar secuencia de edición a partir del lote de fotos capturadas
  const handleProceedToEditBatch = () => {
    if (batchPhotos.length === 0) return;
    setBatchEditQueue(batchPhotos);
    setCurrentBatchIndex(0);
    setProcessedBatchPages([]);
    setCapturedBlob(batchPhotos[0]);
    setCurrentView(VIEW_STATES.CROP);
  };

  // 4. Cargar documento de prueba demo
  const handleLoadDemo = async () => {
    setEditingDocId(null);
    setEditingPageIndex(null);
    setDocPages([]);
    setDocTitle(createNewDocTitle());
    const demoBlob = await generateDemoDocumentBlob();
    setBatchPhotos([demoBlob]);
    setBatchEditQueue([demoBlob]);
    setCurrentBatchIndex(0);
    setProcessedBatchPages([]);
    setCapturedBlob(demoBlob);
    setCurrentView(VIEW_STATES.CROP);
  };

  // 5. Aplicar recorte y transformación de perspectiva
  const handleApplyCrop = async (corners) => {
    try {
      const rectified = await warpPerspective(capturedBlob, corners);
      setWarpedBlob(rectified);
      setCurrentView(VIEW_STATES.FILTER);
    } catch (err) {
      alert("Error al enderezar el documento: " + err.message);
    }
  };

  // 6. Guardar página finalizada (edición por lotes o re-edición individual)
  const handleSavePage = async (finalPageBlob) => {
    // Si estamos en re-edición de una sola página existente
    if (editingPageIndex !== null) {
      const updated = [...docPages];
      updated[editingPageIndex] = finalPageBlob;
      setDocPages(updated);
      setEditingPageIndex(null);

      if (editingDocId) {
        try {
          await updateDocument(editingDocId, { pages: updated });
          await loadSavedDocuments();
        } catch (e) {
          console.warn("Error actualizando documento en storage:", e);
        }
      }
      setCurrentView(VIEW_STATES.DOCUMENT);
      return;
    }

    const updatedProcessed = [...processedBatchPages, finalPageBlob];
    setProcessedBatchPages(updatedProcessed);

    // ¿Hay más páginas pendientes en el lote de fotos?
    if (currentBatchIndex < batchEditQueue.length - 1) {
      const nextIdx = currentBatchIndex + 1;
      setCurrentBatchIndex(nextIdx);
      setCapturedBlob(batchEditQueue[nextIdx]);
      setCurrentView(VIEW_STATES.CROP);
    } else {
      // ¡Todas las páginas del lote han sido editadas y corregidas!
      const finalDocPages = [...docPages, ...updatedProcessed];
      setDocPages(finalDocPages);
      setBatchPhotos([]);
      setBatchEditQueue([]);
      setProcessedBatchPages([]);

      if (editingDocId) {
        try {
          await updateDocument(editingDocId, { pages: finalDocPages });
          await loadSavedDocuments();
        } catch (e) {
          console.warn("Error actualizando documento en storage:", e);
        }
      }
      setCurrentView(VIEW_STATES.DOCUMENT);
    }
  };

  // 7. Añadir otra página al documento
  const handleAddAnotherPage = async (finalPageBlob) => {
    const updatedProcessed = [...processedBatchPages, finalPageBlob];
    setProcessedBatchPages(updatedProcessed);

    if (Capacitor.isNativePlatform()) {
      const photoBlob = await capturePhotoNative();
      if (photoBlob) {
        setBatchEditQueue((prev) => [...prev, photoBlob]);
        const nextIdx = currentBatchIndex + 1;
        setCurrentBatchIndex(nextIdx);
        setCapturedBlob(photoBlob);
        setCurrentView(VIEW_STATES.CROP);
        return;
      }
    } else {
      setCurrentView(VIEW_STATES.CAMERA);
      return;
    }

    const finalDocPages = [...docPages, ...updatedProcessed];
    setDocPages(finalDocPages);
    setCurrentView(VIEW_STATES.DOCUMENT);
  };

  // 7.1 Eliminar una página del documento
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

  // 7.2 Actualizar una página rotada o procesada
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

  // 8. Re-editar recorte de una página existente
  const handleEditPageCrop = (pageIdx, pageBlob) => {
    setEditingPageIndex(pageIdx);
    setBatchEditQueue([pageBlob]);
    setCurrentBatchIndex(0);
    setProcessedBatchPages([]);
    setCapturedBlob(pageBlob);
    setCurrentView(VIEW_STATES.CROP);
  };

  // 9. Re-editar filtro de una página existente
  const handleEditPageFilter = (pageIdx, pageBlob) => {
    setEditingPageIndex(pageIdx);
    setBatchEditQueue([pageBlob]);
    setCurrentBatchIndex(0);
    setProcessedBatchPages([]);
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
            onStartCamera={() => handleStartCamera(false)}
            onImageSelect={(blobs) => handleImagesSelected(blobs, false)}
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
            onCapture={(blobs) => handleImagesSelected(blobs, true)}
            onClose={() => {
              if (batchPhotos.length > 0) {
                setCurrentView(VIEW_STATES.BATCH_CAPTURE);
              } else if (docPages.length > 0) {
                setCurrentView(VIEW_STATES.DOCUMENT);
              } else {
                setCurrentView(VIEW_STATES.HOME);
              }
            }}
          />
        )}

        {currentView === VIEW_STATES.BATCH_CAPTURE && (
          <BatchCaptureModal
            photos={batchPhotos}
            onAddAnotherPhoto={async () => {
              if (Capacitor.isNativePlatform()) {
                const photoBlob = await capturePhotoNative();
                if (photoBlob) {
                  setBatchPhotos((prev) => [...prev, photoBlob]);
                }
              } else {
                setCurrentView(VIEW_STATES.CAMERA);
              }
            }}
            onAddFromGallery={(newFiles) => {
              setBatchPhotos((prev) => [...prev, ...newFiles]);
            }}
            onRemovePhoto={(idx) => {
              const updated = batchPhotos.filter((_, i) => i !== idx);
              setBatchPhotos(updated);
              if (updated.length === 0) {
                setCurrentView(docPages.length > 0 ? VIEW_STATES.DOCUMENT : VIEW_STATES.HOME);
              }
            }}
            onProceedToEdit={handleProceedToEditBatch}
            onCancel={() => {
              setBatchPhotos([]);
              setCurrentView(docPages.length > 0 ? VIEW_STATES.DOCUMENT : VIEW_STATES.HOME);
            }}
          />
        )}

        {currentView === VIEW_STATES.CROP && capturedBlob && (
          <InteractiveCrop
            imageBlob={capturedBlob}
            pageIndex={currentBatchIndex}
            totalPages={batchEditQueue.length || 1}
            onApplyCrop={handleApplyCrop}
            onBack={() => {
              if (editingPageIndex !== null) {
                setEditingPageIndex(null);
                setCurrentView(VIEW_STATES.DOCUMENT);
              } else if (batchPhotos.length > 0) {
                setCurrentView(VIEW_STATES.BATCH_CAPTURE);
              } else if (docPages.length > 0) {
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
            pageIndex={currentBatchIndex}
            totalPages={batchEditQueue.length || 1}
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
              handleStartCamera(true);
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
