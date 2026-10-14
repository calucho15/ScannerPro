/**
 * Servicio de Compartición Nativo para Android (Capacitor Filesystem + Share)
 * Garantiza que WhatsApp, Telegram, Gmail, etc. reciban el archivo real adjunto (PDF o Imagen)
 * y no solamente un mensaje de texto.
 */

import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { Capacitor } from '@capacitor/core';

/**
 * Convierte un Blob en base64 de forma asíncrona
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Comparte un archivo (PDF o Imagen) a aplicaciones externas (WhatsApp, etc.)
 */
export async function shareFileNative(blob, filename, title = 'Documento Escaneado') {
  if (!blob) {
    alert("No hay archivo disponible para compartir.");
    return false;
  }

  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
      
      const writeResult = await Filesystem.writeFile({
        path: safeFilename,
        data: base64,
        directory: Directory.Cache
      });

      await Share.share({
        title: title,
        text: `Documento: ${title}`,
        url: writeResult.uri,
        dialogTitle: 'Compartir con...'
      });
      return true;
    } catch (err) {
      console.warn("Fallo en Share nativo con Filesystem:", err);
    }
  }

  // Fallback para navegador web móvil/desktop
  const mimeType = filename.endsWith('.pdf') ? 'application/pdf' : 'image/jpeg';
  const file = new File([blob], filename, { type: mimeType });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({
        title: title,
        files: [file]
      });
      return true;
    } catch (e) {
      if (e.name !== 'AbortError') console.warn("navigator.share error:", e);
    }
  }

  // Fallback tradicional: descarga directa del archivo
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}

/**
 * Descarga o guarda un archivo en el dispositivo
 */
export async function downloadFileLocal(blob, filename) {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64 = await blobToBase64(blob);
      const safeFilename = filename.replace(/[/\\?%*:|"<>]/g, '_');
      
      const writeResult = await Filesystem.writeFile({
        path: safeFilename,
        data: base64,
        directory: Directory.Documents
      });

      alert(`Archivo guardado con éxito en Documentos: ${safeFilename}`);
      return true;
    } catch (err) {
      console.warn("Error guardando en Documents nativo, usando Share:", err);
      return await shareFileNative(blob, filename, filename);
    }
  }

  // Fallback web
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
  return true;
}
