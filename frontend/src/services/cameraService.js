/**
 * Servicio de Cámara Universal (Capacitor Nativo + HTML5 Capture Fallback)
 * Utiliza CameraResultType.Uri nativo (más rápido y seguro en Android WebView)
 * con auto-orientación EXIF y resolución optimizada para documentos.
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Convierte DataURL base64 a Blob de forma síncrona en memoria
 */
export function dataURLtoBlob(dataurl) {
  try {
    const parts = dataurl.split(',');
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  } catch (e) {
    console.error("Error en dataURLtoBlob:", e);
    return null;
  }
}

/**
 * Convierte el resultado de Capacitor Camera a un Blob estándar
 */
async function photoResultToBlob(photo) {
  if (!photo) return null;

  // 1. Prioridad: webPath (cero sobrecarga de memoria en Android WebView)
  if (photo.webPath) {
    try {
      const res = await fetch(photo.webPath);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn("fetch webPath falló, intentando alternativa:", e);
    }
  }

  // 2. Si tiene path de archivo local, convertir a URL web de Capacitor
  if (photo.path) {
    try {
      const fileSrc = Capacitor.convertFileSrc(photo.path);
      const res = await fetch(fileSrc);
      if (res.ok) {
        return await res.blob();
      }
    } catch (e) {
      console.warn("fetch convertFileSrc falló:", e);
    }
  }

  // 3. Respaldo DataUrl
  if (photo.dataUrl) {
    return dataURLtoBlob(photo.dataUrl);
  }

  return null;
}

/**
 * Captura una foto desde la cámara nativa
 */
export async function capturePhotoNative() {
  try {
    const photo = await Camera.getPhoto({
      quality: 88,
      allowEditing: false,
      correctOrientation: true,
      width: 2048,
      resultType: CameraResultType.Uri,
      source: CameraSource.Camera,
      promptLabelHeader: 'Escaneo de Documento',
      promptLabelCancel: 'Cancelar',
      promptLabelPhoto: 'De la Galería',
      promptLabelPicture: 'Tomar Foto'
    });

    const blob = await photoResultToBlob(photo);
    if (blob) {
      console.log("Foto capturada con éxito, tamaño:", blob.size, "tipo:", blob.type);
      return blob;
    }
  } catch (err) {
    console.warn("Camera.getPhoto (nativo) falló o fue cancelado:", err);
  }
  return null;
}

/**
 * Selecciona una foto desde la galería nativa
 */
export async function pickPhotoNative() {
  try {
    const photo = await Camera.getPhoto({
      quality: 88,
      allowEditing: false,
      correctOrientation: true,
      width: 2048,
      resultType: CameraResultType.Uri,
      source: CameraSource.Photos,
    });

    const blob = await photoResultToBlob(photo);
    if (blob) {
      console.log("Imagen de galería seleccionada, tamaño:", blob.size, "tipo:", blob.type);
      return blob;
    }
  } catch (err) {
    console.warn("pickPhotoNative falló o fue cancelado:", err);
  }
  return null;
}
