import React, { useState, useEffect } from 'react';
import {
  CheckCircle,
  Share2,
  Download,
  Cloud,
  Edit2,
  Home,
  Plus,
  Loader2,
  ExternalLink,
  MessageCircle,
  Check,
  Eye,
  Image as ImageIcon,
  FileText
} from 'lucide-react';
import { uploadToDrive, generatePdf } from '../services/api';
import { renameDocument } from '../services/storage';
import { shareFileNative, downloadFileLocal } from '../services/shareService';

export default function ShareCompleteScreen({
  docRecord, // Objeto del documento guardado en IndexedDB
  onGoHome,
  onScanAnother,
  driveStatus,
  onOpenDriveModal,
  onDocUpdated,
  onViewFullDoc
}) {
  const [docTitle, setDocTitle] = useState(docRecord?.title || 'Documento_Escaneado');
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [newTitle, setNewTitle] = useState(docRecord?.title || '');
  const [thumbnailUrl, setThumbnailUrl] = useState(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isUploadingDrive, setIsUploadingDrive] = useState(false);
  const [driveResult, setDriveResult] = useState(null);

  useEffect(() => {
    if (docRecord?.thumbnailBlob) {
      try {
        const url = URL.createObjectURL(docRecord.thumbnailBlob);
        setThumbnailUrl(url);
        return () => {
          setTimeout(() => {
            try { URL.revokeObjectURL(url); } catch (e) {}
          }, 10000);
        };
      } catch (err) {
        console.warn("Error creando thumbnail URL:", err);
      }
    }
  }, [docRecord]);

  const handleSaveTitle = async () => {
    if (!newTitle.trim()) return;
    try {
      await renameDocument(docRecord.id, newTitle.trim());
      setDocTitle(newTitle.trim());
      setIsEditingTitle(false);
      if (onDocUpdated) onDocUpdated();
    } catch (e) {
      alert("Error al renombrar: " + e.message);
    }
  };

  const getPdfBlob = async () => {
    if (docRecord?.pdfBlob) {
      return docRecord.pdfBlob;
    }
    if (docRecord?.pages && docRecord.pages.length > 0) {
      return await generatePdf(docRecord.pages, true, 88);
    }
    throw new Error("No hay páginas para generar el PDF");
  };

  const getFirstPageImageBlob = () => {
    return docRecord?.thumbnailBlob || docRecord?.pages?.[0];
  };

  // 1. Compartir PDF directamente (WhatsApp y aplicaciones con archivo real adjunto)
  const handleSharePdf = async () => {
    setIsSharing(true);
    try {
      const pdfBlob = await getPdfBlob();
      const fileName = `${docTitle.trim() || 'Documento_Escaneado'}.pdf`;
      await shareFileNative(pdfBlob, fileName, docTitle);
    } catch (err) {
      alert("Error al compartir PDF: " + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  // 2. Compartir Imagen directamente (JPEG adjunto a WhatsApp / redes)
  const handleShareImage = async () => {
    const imgBlob = getFirstPageImageBlob();
    if (!imgBlob) {
      alert("No hay imagen disponible para compartir.");
      return;
    }
    setIsSharing(true);
    try {
      const fileName = `${docTitle.trim() || 'Escaneo'}.jpg`;
      await shareFileNative(imgBlob, fileName, docTitle);
    } catch (err) {
      alert("Error al compartir imagen: " + err.message);
    } finally {
      setIsSharing(false);
    }
  };

  // 3. Guardar PDF en el almacenamiento local del teléfono
  const handleDownloadPdf = async () => {
    try {
      const pdfBlob = await getPdfBlob();
      const fileName = `${docTitle.trim() || 'Documento_Escaneado'}.pdf`;
      await downloadFileLocal(pdfBlob, fileName);
    } catch (err) {
      alert("Error al guardar PDF: " + err.message);
    }
  };

  // 4. Guardar Imagen en el almacenamiento local del teléfono
  const handleDownloadImage = async () => {
    const imgBlob = getFirstPageImageBlob();
    if (!imgBlob) {
      alert("No hay imagen disponible.");
      return;
    }
    try {
      const fileName = `${docTitle.trim() || 'Escaneo'}.jpg`;
      await downloadFileLocal(imgBlob, fileName);
    } catch (err) {
      alert("Error al guardar imagen: " + err.message);
    }
  };

  // 5. Subir a Google Drive
  const handleUploadDrive = async () => {
    if (!driveStatus?.authenticated) {
      onOpenDriveModal();
      return;
    }
    setIsUploadingDrive(true);
    setDriveResult(null);
    try {
      const pdfBlob = await getPdfBlob();
      const fileName = `${docTitle.trim() || 'Documento_Escaneado'}.pdf`;
      const res = await uploadToDrive(pdfBlob, fileName, 'Mi CamScanner');
      setDriveResult(res);
    } catch (err) {
      alert("Error subiendo a Google Drive: " + err.message);
    } finally {
      setIsUploadingDrive(false);
    }
  };

  return (
    <div className="share-complete-screen">
      {/* Encabezado de éxito */}
      <div className="complete-hero-header">
        <div className="success-icon-badge">
          <CheckCircle className="w-10 h-10 text-emerald-400" />
        </div>
        <h2 className="complete-title">¡Documento Listo!</h2>
        <p className="complete-subtitle">Tu documento ha sido procesado y guardado con éxito.</p>
      </div>

      {/* Tarjeta del Documento interactiva (Click para ver y re-editar) */}
      <div
        className="finished-doc-card clickable"
        onClick={() => onViewFullDoc && onViewFullDoc(docRecord)}
        title="Toca para ver o re-editar el documento"
      >
        <div className="doc-card-thumb-box">
          {thumbnailUrl ? (
            <img src={thumbnailUrl} alt="Portada" className="finished-doc-thumb" />
          ) : (
            <div className="thumb-placeholder" />
          )}
          <span className="doc-pages-tag">{docRecord?.pageCount || 1} pág(s)</span>
        </div>

        <div className="finished-doc-info">
          {isEditingTitle ? (
            <div className="rename-inline-box" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                className="rename-input"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                autoFocus
              />
              <button className="btn-save-rename" onClick={handleSaveTitle} title="Guardar nombre">
                <Check className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          ) : (
            <div className="doc-title-row">
              <h3 className="finished-title" title={docTitle}>{docTitle}</h3>
              <button
                className="btn-edit-title"
                onClick={(e) => {
                  e.stopPropagation();
                  setNewTitle(docTitle);
                  setIsEditingTitle(true);
                }}
                title="Renombrar documento"
              >
                <Edit2 className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          )}

          <span className="doc-date-text">
            {new Date(docRecord?.createdAt || Date.now()).toLocaleDateString('es-ES', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })}
          </span>

          <div className="card-tap-hint">
            <Eye className="w-3.5 h-3.5 text-emerald-400 mr-1" />
            <span>Toca para ver / re-editar</span>
          </div>
        </div>
      </div>

      {/* Botón directo de Ver y Re-editar Documento Completo */}
      {onViewFullDoc && (
        <button
          className="btn-view-full-doc"
          onClick={() => onViewFullDoc(docRecord)}
        >
          <Eye className="w-5 h-5 mr-2 text-emerald-400" />
          <span>Ver y Re-editar Documento Completo</span>
        </button>
      )}

      {/* Mensaje de subida a Drive */}
      {driveResult && (
        <div className="drive-success-card">
          <CheckCircle className="w-5 h-5 text-emerald-400 mr-2 flex-shrink-0" />
          <div className="drive-success-text">
            <span>¡Subido exitosamente a Google Drive!</span>
            {driveResult.web_view_link && (
              <a
                href={driveResult.web_view_link}
                target="_blank"
                rel="noreferrer"
                className="drive-link"
              >
                Ver en Drive <ExternalLink className="w-3.5 h-3.5 ml-1 inline" />
              </a>
            )}
          </div>
        </div>
      )}

      {/* Botones de Compartir Principales */}
      <div className="share-actions-group">
        <button
          className="btn-share-whatsapp"
          onClick={handleSharePdf}
          disabled={isSharing}
        >
          {isSharing ? (
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
          ) : (
            <MessageCircle className="w-5 h-5 mr-2" />
          )}
          <span>Compartir PDF (WhatsApp / Apps)</span>
        </button>

        <button
          className="btn-share-other"
          onClick={handleShareImage}
          disabled={isSharing}
        >
          <ImageIcon className="w-5 h-5 mr-2 text-cyan-400" />
          <span>Compartir como Imagen JPG</span>
        </button>

        <div className="secondary-share-grid">
          <button className="btn-secondary-action" onClick={handleDownloadPdf}>
            <FileText className="w-4 h-4 mr-2 text-emerald-400" />
            Guardar PDF
          </button>

          <button className="btn-secondary-action" onClick={handleDownloadImage}>
            <Download className="w-4 h-4 mr-2 text-cyan-400" />
            Guardar JPG
          </button>
        </div>

        <button
          className={`btn-secondary-action w-full mt-1 ${driveStatus?.authenticated ? 'connected' : ''}`}
          onClick={handleUploadDrive}
          disabled={isUploadingDrive}
        >
          {isUploadingDrive ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2 text-emerald-400" />
          ) : (
            <Cloud className="w-4 h-4 mr-2 text-emerald-400" />
          )}
          {driveStatus?.authenticated ? 'Subir respaldo a Google Drive' : 'Conectar con Google Drive'}
        </button>
      </div>

      {/* Navegación Inferior */}
      <div className="complete-bottom-nav">
        <button className="btn-nav-outline" onClick={onGoHome}>
          <Home className="w-4 h-4 mr-2" />
          Mis Documentos
        </button>

        <button className="btn-nav-primary" onClick={onScanAnother}>
          <Plus className="w-4 h-4 mr-2" />
          Escanear Otro
        </button>
      </div>
    </div>
  );
}
