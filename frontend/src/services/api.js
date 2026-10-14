/**
 * Servicio Híbrido: Conexión con Backend FastAPI + Respaldo Local Independiente
 * Si el teléfono está fuera de casa o sin conexión con la PC,
 * ejecuta TODO el procesamiento localmente en el móvil de forma instantánea.
 */

import {
  warpPerspectiveLocal,
  applyFilterLocal,
  generatePdfLocal,
  detectCornersLocal
} from './localProcessor';
import { Capacitor } from '@capacitor/core';

const API_BASE = '/api';

export async function checkHealth() {
  if (Capacitor.isNativePlatform()) {
    return { status: 'offline', standalone: true };
  }
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) throw new Error('Offline');
    return await res.json();
  } catch {
    return { status: 'offline', standalone: true };
  }
}

/**
 * Detecta esquinas (Backend o Local)
 */
export async function detectCorners(imageBlob) {
  if (Capacitor.isNativePlatform()) {
    return await detectCornersLocal(imageBlob);
  }

  try {
    const formData = new FormData();
    formData.append('file', imageBlob, 'capture.jpg');

    const res = await fetch(`${API_BASE}/process/detect-corners`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(3500)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('application/json')) {
      return await res.json();
    }
  } catch (e) {
    console.log("Usando detección local independiente:", e.message);
  }

  // Respaldo local en el dispositivo
  return await detectCornersLocal(imageBlob);
}

/**
 * Aplica transformación de perspectiva de 4 esquinas (Backend o Local)
 */
export async function warpPerspective(imageBlob, corners = null) {
  if (Capacitor.isNativePlatform()) {
    return await warpPerspectiveLocal(imageBlob, corners);
  }

  try {
    const formData = new FormData();
    formData.append('file', imageBlob, 'capture.jpg');
    if (corners) {
      formData.append('corners', JSON.stringify(corners));
    }

    const res = await fetch(`${API_BASE}/process/warp`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(4000)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('image/')) {
      return await res.blob();
    }
  } catch (e) {
    console.log("Usando transformación local en el teléfono:", e.message);
  }

  // Respaldo local en el dispositivo
  return await warpPerspectiveLocal(imageBlob, corners);
}

/**
 * Aplica filtro de ruido/realce (Backend o Local)
 */
export async function applyImageFilter(imageBlob, filterType = 'magic_color') {
  if (Capacitor.isNativePlatform()) {
    return await applyFilterLocal(imageBlob, filterType);
  }

  try {
    const formData = new FormData();
    formData.append('file', imageBlob, 'doc.jpg');
    formData.append('filter_type', filterType);

    const res = await fetch(`${API_BASE}/process/filter`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(4000)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && contentType.includes('image/')) {
      return await res.blob();
    }
  } catch (e) {
    console.log("Usando filtro local en el teléfono:", e.message);
  }

  // Respaldo local en el dispositivo
  return await applyFilterLocal(imageBlob, filterType);
}

/**
 * Genera PDF multipágina (Backend o Local)
 */
export async function generatePdf(imageBlobs, fitToA4 = true, quality = 88) {
  if (Capacitor.isNativePlatform()) {
    return await generatePdfLocal(imageBlobs, fitToA4);
  }

  try {
    const formData = new FormData();
    imageBlobs.forEach((blob, idx) => {
      formData.append('files', blob, `page_${idx + 1}.jpg`);
    });
    formData.append('fit_to_a4', fitToA4);
    formData.append('quality', quality);

    const res = await fetch(`${API_BASE}/process/create-pdf`, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(6000)
    });

    const contentType = res.headers.get('content-type') || '';
    if (res.ok && (contentType.includes('application/pdf') || contentType.includes('application/octet-stream'))) {
      return await res.blob();
    }
  } catch (e) {
    console.log("Generando PDF localmente en el móvil:", e.message);
  }

  // Respaldo local en el dispositivo
  return await generatePdfLocal(imageBlobs, fitToA4);
}

/**
 * Consulta el estado de autenticación de Google Drive
 */
export async function getDriveStatus() {
  try {
    const res = await fetch(`${API_BASE}/drive/status`, { signal: AbortSignal.timeout(2000) });
    if (!res.ok) return { configured: false, authenticated: false };
    return await res.json();
  } catch {
    return { configured: false, authenticated: false };
  }
}

/**
 * Obtiene la URL de inicio de sesión con Google
 */
export async function getDriveAuthUrl() {
  const res = await fetch(`${API_BASE}/drive/auth-url`);
  if (!res.ok) throw new Error('Error obteniendo enlace de autorización.');
  return await res.json();
}

/**
 * Desconecta la cuenta de Google
 */
export async function disconnectDrive() {
  const res = await fetch(`${API_BASE}/drive/disconnect`, { method: 'POST' });
  if (!res.ok) throw new Error('Error al desconectar Google Drive.');
  return await res.json();
}

/**
 * Sube un archivo a Google Drive
 */
export async function uploadToDrive(fileBlob, filename, folderName = 'Mi CamScanner') {
  const formData = new FormData();
  formData.append('file', fileBlob, filename);
  formData.append('filename', filename);
  formData.append('folder_name', folderName);

  const res = await fetch(`${API_BASE}/drive/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Error subiendo archivo a Google Drive.');
  }
  return await res.json();
}
