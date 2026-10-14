/**
 * Servicio de Almacenamiento Local Persistente (IndexedDB)
 * Permite guardar, recuperar, renombrar y eliminar documentos escaneados en el dispositivo.
 */

const DB_NAME = 'ScannerProDB';
const DB_VERSION = 1;
const STORE_NAME = 'scanned_documents';

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Guarda un nuevo documento escaneado.
 */
export async function saveDocument({ id, title, pages, pdfBlob, thumbnailBlob }) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const docRecord = {
      id: id || `doc_${Date.now()}`,
      title: title || `Documento_${new Date().toISOString().slice(0, 10)}`,
      pageCount: pages.length,
      pages, // Array de Blobs
      pdfBlob, // Blob del PDF compilado
      thumbnailBlob: thumbnailBlob || pages[0],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    const request = store.put(docRecord);

    request.onsuccess = () => resolve(docRecord);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Obtiene todos los documentos escaneados ordenados del más reciente al más antiguo.
 */
export async function getAllDocuments() {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const docs = request.result || [];
      // Ordenar descendente por fecha de actualización
      docs.sort((a, b) => (b.updatedAt || b.createdAt) - (a.updatedAt || a.createdAt));
      resolve(docs);
    };
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Obtiene un documento por su ID.
 */
export async function getDocumentById(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Renombra un documento existente.
 */
export async function renameDocument(id, newTitle) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const doc = getReq.result;
      if (!doc) {
        reject(new Error('Documento no encontrado.'));
        return;
      }
      doc.title = newTitle.trim();
      doc.updatedAt = Date.now();
      const putReq = store.put(doc);
      putReq.onsuccess = () => resolve(doc);
      putReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Actualiza campos de un documento existente (páginas, título, pdfBlob, etc.)
 */
export async function updateDocument(id, updates) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const getReq = store.get(id);

    getReq.onsuccess = () => {
      const doc = getReq.result;
      if (!doc) {
        reject(new Error('Documento no encontrado.'));
        return;
      }
      const updated = {
        ...doc,
        ...updates,
        updatedAt: Date.now()
      };
      if (updates.pages) {
        updated.pageCount = updates.pages.length;
        if (updates.pages.length > 0) {
          updated.thumbnailBlob = updates.pages[0];
        }
      }
      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = (e) => reject(e.target.error);
    };
    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Elimina un documento por su ID.
 */
export async function deleteDocument(id) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (e) => reject(e.target.error);
  });
}


