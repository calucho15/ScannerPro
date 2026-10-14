import React, { useState } from 'react';
import {
  FileText,
  Search,
  Share2,
  Download,
  Trash2,
  Edit2,
  Check,
  ExternalLink,
  MessageCircle,
  Calendar,
  Layers
} from 'lucide-react';
import { shareFileNative, downloadFileLocal } from '../services/shareService';
import { generatePdf } from '../services/api';

export default function DocumentLibrary({
  documents,
  onOpenDoc,
  onDeleteDoc,
  onRenameDoc
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredDocs = documents.filter((doc) =>
    (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const startRename = (doc, e) => {
    e.stopPropagation();
    setEditingId(doc.id);
    setEditingTitle(doc.title);
  };

  const saveRename = (docId, e) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameDoc(docId, editingTitle.trim());
    }
    setEditingId(null);
  };

  const handleQuickShare = async (doc, e) => {
    e.stopPropagation();
    try {
      let blob = doc.pdfBlob;
      if (!blob && doc.pages && doc.pages.length > 0) {
        blob = await generatePdf(doc.pages, true, 88);
      }
      if (!blob && doc.thumbnailBlob) {
        blob = doc.thumbnailBlob;
      }
      if (!blob) {
        onOpenDoc(doc);
        return;
      }
      const isPdf = blob.type === 'application/pdf' || !blob.type;
      const fileName = `${doc.title || 'Documento'}.${isPdf ? 'pdf' : 'jpg'}`;
      await shareFileNative(blob, fileName, doc.title || 'Documento Escaneado');
    } catch (err) {
      console.warn("Error al compartir desde biblioteca:", err);
      onOpenDoc(doc);
    }
  };

  const handleDownload = async (doc, e) => {
    e.stopPropagation();
    try {
      let blob = doc.pdfBlob;
      if (!blob && doc.pages && doc.pages.length > 0) {
        blob = await generatePdf(doc.pages, true, 88);
      }
      if (!blob && doc.thumbnailBlob) {
        blob = doc.thumbnailBlob;
      }
      if (!blob) {
        onOpenDoc(doc);
        return;
      }
      const isPdf = blob.type === 'application/pdf' || !blob.type;
      const fileName = `${doc.title || 'Documento'}.${isPdf ? 'pdf' : 'jpg'}`;
      await downloadFileLocal(blob, fileName);
    } catch (err) {
      alert("Error al descargar: " + err.message);
    }
  };

  if (documents.length === 0) {
    return null; // En HomeScreen se mostrará el hero
  }

  return (
    <div className="document-library-section">
      <div className="library-header-row">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-emerald-400" />
          <h3 className="library-title">Mis Documentos Guardados</h3>
          <span className="library-count-badge">{documents.length}</span>
        </div>

        {documents.length > 3 && (
          <div className="search-input-box">
            <Search className="w-4 h-4 text-gray-400 mr-2" />
            <input
              type="text"
              placeholder="Buscar documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
          </div>
        )}
      </div>

      <div className="documents-cards-grid">
        {filteredDocs.map((doc) => {
          const thumbSrc = doc.thumbnailBlob ? URL.createObjectURL(doc.thumbnailBlob) : null;
          const formattedDate = new Date(doc.createdAt || Date.now()).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
          });

          return (
            <div
              key={doc.id}
              className="library-doc-card"
              onClick={() => onOpenDoc(doc)}
            >
              <div className="card-thumb-container">
                {thumbSrc ? (
                  <img src={thumbSrc} alt={doc.title} className="card-thumb-img" />
                ) : (
                  <div className="card-thumb-empty">
                    <FileText className="w-8 h-8 text-gray-500" />
                  </div>
                )}
                <span className="card-pages-pill">{doc.pageCount || 1} pág.</span>
              </div>

              <div className="card-doc-details">
                {editingId === doc.id ? (
                  <div className="rename-inline-row" onClick={(e) => e.stopPropagation()}>
                    <input
                      type="text"
                      className="rename-input-sm"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      autoFocus
                    />
                    <button
                      className="btn-save-sm"
                      onClick={(e) => saveRename(doc.id, e)}
                    >
                      <Check className="w-4 h-4 text-emerald-400" />
                    </button>
                  </div>
                ) : (
                  <div className="card-title-row">
                    <h4 className="card-doc-title" title={doc.title}>{doc.title}</h4>
                    <button
                      className="icon-btn-card"
                      onClick={(e) => startRename(doc, e)}
                      title="Renombrar"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-gray-400 hover:text-emerald-400" />
                    </button>
                  </div>
                )}

                <div className="card-meta-row">
                  <span className="card-date">
                    <Calendar className="w-3 h-3 inline mr-1 text-gray-500" />
                    {formattedDate}
                  </span>
                </div>

                <div className="card-actions-strip">
                  <button
                    className="card-action-btn"
                    onClick={(e) => handleQuickShare(doc, e)}
                    title="Compartir"
                  >
                    <Share2 className="w-4 h-4 text-cyan-400" />
                  </button>

                  <button
                    className="card-action-btn"
                    onClick={(e) => handleDownload(doc, e)}
                    title="Descargar PDF"
                  >
                    <Download className="w-4 h-4 text-emerald-400" />
                  </button>

                  <button
                    className="card-action-btn delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`¿Eliminar el documento "${doc.title}"?`)) {
                        onDeleteDoc(doc.id);
                      }
                    }}
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
