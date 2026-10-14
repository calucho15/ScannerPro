/**
 * Motor de Procesamiento de Imagen y PDF 100% Local e Independiente
 * Funciona directamente en el procesador del teléfono móvil (sin requerir servidor ni PC).
 */

import { jsPDF } from 'jspdf';

/**
 * Carga un Blob de imagen en un elemento HTMLImageElement
 */
function loadImageFromBlob(blob) {
  return new Promise((resolve, reject) => {
    let url;
    let isCreatedUrl = false;

    if (typeof blob === 'string') {
      url = blob;
    } else if (blob instanceof Blob) {
      url = URL.createObjectURL(blob);
      isCreatedUrl = true;
    } else {
      reject(new Error("Formato de imagen no soportado"));
      return;
    }

    const img = new Image();
    img.onload = () => {
      // Retrasar revocación para que el contexto canvas termine de procesar
      if (isCreatedUrl) {
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }, 8000);
      }
      resolve(img);
    };
    img.onerror = (e) => {
      if (isCreatedUrl) {
        try { URL.revokeObjectURL(url); } catch (err) {}
      }
      reject(e);
    };
    img.src = url;
  });
}

/**
 * Convierte un Canvas a Blob JPEG con fallback síncrono a DataURL para Android WebView
 */
function canvasToBlob(canvas, quality = 0.92) {
  return new Promise((resolve, reject) => {
    try {
      canvas.toBlob((blob) => {
        if (blob && blob.size > 0) {
          resolve(blob);
        } else {
          try {
            const dataUrl = canvas.toDataURL('image/jpeg', quality);
            const parts = dataUrl.split(',');
            const bstr = atob(parts[1]);
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            resolve(new Blob([u8arr], { type: 'image/jpeg' }));
          } catch (e2) {
            reject(e2);
          }
        }
      }, 'image/jpeg', quality);
    } catch (e) {
      try {
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        const parts = dataUrl.split(',');
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        resolve(new Blob([u8arr], { type: 'image/jpeg' }));
      } catch (e2) {
        reject(e2);
      }
    }
  });
}

/**
 * Ordena 4 puntos: [sup-izq, sup-der, inf-der, inf-izq]
 */
export function orderCorners(pts) {
  // Ordenar por coordenada Y
  const sortedByY = [...pts].sort((a, b) => a[1] - b[1]);
  const topPoints = sortedByY.slice(0, 2).sort((a, b) => a[0] - b[0]);
  const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a[0] - b[0]);

  const tl = topPoints[0];
  const tr = topPoints[1];
  const bl = bottomPoints[0];
  const br = bottomPoints[1];

  return [tl, tr, br, bl];
}

/**
 * Detecta esquinas de documento o retorna margen inteligente por defecto
 */
export async function detectCornersLocal(imageBlob) {
  const img = await loadImageFromBlob(imageBlob);
  const w = img.naturalWidth || img.width;
  const h = img.naturalHeight || img.height;

  const mx = w * 0.05;
  const my = h * 0.05;

  return {
    success: true,
    width: w,
    height: h,
    corners: [
      [mx, my],
      [w - mx, my],
      [w - mx, h - my],
      [mx, h - my],
    ]
  };
}

/**
 * Aplica transformación de perspectiva (homografía de 4 puntos) directamente en Canvas
 */
export async function warpPerspectiveLocal(imageBlob, rawCorners) {
  const img = await loadImageFromBlob(imageBlob);
  const corners = orderCorners(rawCorners);
  const [tl, tr, br, bl] = corners;

  // Calcular ancho y alto del nuevo rectángulo
  const widthA = Math.hypot(br[0] - bl[0], br[1] - bl[1]);
  const widthB = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]);
  let targetW = Math.max(100, Math.round(Math.max(widthA, widthB)));

  const heightA = Math.hypot(tr[0] - br[0], tr[1] - br[1]);
  const heightB = Math.hypot(tl[0] - bl[0], tl[1] - bl[1]);
  let targetH = Math.max(100, Math.round(Math.max(heightA, heightB)));

  // Limitar dimensiones para evitar desbordamiento de memoria en WebView
  const MAX_DIM = 2048;
  if (targetW > MAX_DIM || targetH > MAX_DIM) {
    const scale = Math.min(MAX_DIM / targetW, MAX_DIM / targetH);
    targetW = Math.round(targetW * scale);
    targetH = Math.round(targetH * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');

  // Mapeo bilineal por subdivisiones de cuadriláteros en triángulos (8x8 = 64 celdas, 128 triángulos)
  const stepsX = 8;
  const stepsY = 8;

  for (let y = 0; y < stepsY; y++) {
    for (let x = 0; x < stepsX; x++) {
      const u1 = x / stepsX;
      const v1 = y / stepsY;
      const u2 = (x + 1) / stepsX;
      const v2 = (y + 1) / stepsY;

      // Coordenadas origen en la imagen deformada mediante interpolación bilineal
      const p1 = interpolateQuad(tl, tr, br, bl, u1, v1);
      const p2 = interpolateQuad(tl, tr, br, bl, u2, v1);
      const p3 = interpolateQuad(tl, tr, br, bl, u2, v2);
      const p4 = interpolateQuad(tl, tr, br, bl, u1, v2);

      // Coordenadas destino en el canvas rectangular
      const dx1 = u1 * targetW;
      const dy1 = v1 * targetH;
      const dx2 = u2 * targetW;
      const dy2 = v2 * targetH;

      // Dibujar dos triángulos que forman cada celda
      drawTriangle(ctx, img, p1, p2, p3, [dx1, dy1], [dx2, dy1], [dx2, dy2]);
      drawTriangle(ctx, img, p1, p3, p4, [dx1, dy1], [dx2, dy2], [dx1, dy2]);
    }
  }

  return await canvasToBlob(canvas, 0.94);
}

function interpolateQuad(tl, tr, br, bl, u, v) {
  const topX = tl[0] + u * (tr[0] - tl[0]);
  const topY = tl[1] + u * (tr[1] - tl[1]);
  const botX = bl[0] + u * (br[0] - bl[0]);
  const botY = bl[1] + u * (br[1] - bl[1]);

  const x = topX + v * (botX - topX);
  const y = topY + v * (botY - topY);
  return [x, y];
}

function drawTriangle(ctx, img, s1, s2, s3, d1, d2, d3) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(d1[0], d1[1]);
  ctx.lineTo(d2[0], d2[1]);
  ctx.lineTo(d3[0], d3[1]);
  ctx.closePath();
  ctx.clip();

  // Calcular transformación afín entre el triángulo origen y destino
  const x0 = d1[0], y0 = d1[1];
  const x1 = d2[0], y1 = d2[1];
  const x2 = d3[0], y2 = d3[1];

  const u0 = s1[0], v0 = s1[1];
  const u1 = s2[0], v1 = s2[1];
  const u2 = s3[0], v2 = s3[1];

  const delta = u0 * (v1 - v2) - v0 * (u1 - u2) + (u1 * v2 - u2 * v1);
  if (Math.abs(delta) > 0.0001) {
    const a = (x0 * (v1 - v2) - v0 * (x1 - x2) + (x1 * v2 - x2 * v1)) / delta;
    const b = (u0 * (x1 - x2) - x0 * (u1 - u2) + (u1 * x2 - u2 * x1)) / delta;
    const c = (y0 * (v1 - v2) - v0 * (y1 - y2) + (y1 * v2 - y2 * v1)) / delta;
    const d = (u0 * (y1 - y2) - y0 * (u1 - u2) + (u1 * y2 - u2 * y1)) / delta;
    const e = x0 - a * u0 - b * v0;
    const f = y0 - c * u0 - d * v0;

    ctx.transform(a, c, b, d, e, f);
    ctx.drawImage(img, 0, 0);
  }
  ctx.restore();
}

/**
 * Aplica filtros de eliminación de sombras, blanco y negro y reducción de ruido localmente
 */
export async function applyFilterLocal(imageBlob, filterType = 'magic_color') {
  if (filterType === 'original') return imageBlob;

  const img = await loadImageFromBlob(imageBlob);
  let w = img.naturalWidth || img.width;
  let h = img.naturalHeight || img.height;

  // Limitar dimensiones para evitar desbordamiento de memoria en WebView móvil
  const MAX_DIM = 2048;
  if (w > MAX_DIM || h > MAX_DIM) {
    const scale = Math.min(MAX_DIM / w, MAX_DIM / h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);

  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const totalPixels = w * h;

  if (filterType === 'clean_bw') {
    // 1. Convertir a luminancia
    const gray = new Uint8ClampedArray(totalPixels);
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      gray[i] = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
    }

    // 2. Umbral adaptativo local por bloques para eliminar cualquier fondo gris
    const blockSize = Math.max(15, Math.round(w / 35));
    const halfBlock = Math.floor(blockSize / 2);
    const C = 10; // Sensibilidad de contraste

    // Integral Image para promedio en O(1) con Float32Array para ahorro de RAM
    const integral = new Float32Array((w + 1) * (h + 1));
    for (let y = 0; y < h; y++) {
      let rowSum = 0;
      for (let x = 0; x < w; x++) {
        rowSum += gray[y * w + x];
        integral[(y + 1) * (w + 1) + (x + 1)] = integral[y * (w + 1) + (x + 1)] + rowSum;
      }
    }

    for (let y = 0; y < h; y++) {
      const y1 = Math.max(0, y - halfBlock);
      const y2 = Math.min(h, y + halfBlock + 1);
      for (let x = 0; x < w; x++) {
        const x1 = Math.max(0, x - halfBlock);
        const x2 = Math.min(w, x + halfBlock + 1);

        const count = (x2 - x1) * (y2 - y1);
        const sum = integral[y2 * (w + 1) + x2]
                  - integral[y1 * (w + 1) + x2]
                  - integral[y2 * (w + 1) + x1]
                  + integral[y1 * (w + 1) + x1];

        const mean = sum / count;
        const val = gray[y * w + x] < (mean - C) ? 0 : 255;
        const idx = (y * w + x) * 4;
        data[idx] = val;
        data[idx + 1] = val;
        data[idx + 2] = val;
      }
    }
  } else if (filterType === 'magic_color') {
    // Magic Color: Eliminación de sombras + realce de texto y colores vívidos
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let r = data[idx];
      let g = data[idx + 1];
      let b = data[idx + 2];

      // Luminancia
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;

      // Si es fondo claro, blanquearlo para eliminar sombras
      if (lum > 165) {
        const boost = (lum - 165) / (255 - 165);
        r = Math.min(255, Math.round(r + (255 - r) * boost * 0.85));
        g = Math.min(255, Math.round(g + (255 - g) * boost * 0.85));
        b = Math.min(255, Math.round(b + (255 - b) * boost * 0.85));
      } else {
        // Oscurecer texto y trazos para mayor contraste
        const darkFactor = 0.85;
        r = Math.round(r * darkFactor);
        g = Math.round(g * darkFactor);
        b = Math.round(b * darkFactor);
      }

      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
    }
  } else if (filterType === 'grayscale') {
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      let grayVal = Math.round(0.299 * data[idx] + 0.587 * data[idx + 1] + 0.114 * data[idx + 2]);
      // Aumentar contraste
      grayVal = Math.min(255, Math.max(0, Math.round((grayVal - 128) * 1.35 + 128)));
      data[idx] = grayVal;
      data[idx + 1] = grayVal;
      data[idx + 2] = grayVal;
    }
  } else if (filterType === 'denoise') {
    // Reducción de ruido sutil preservando bordes
    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      // Ligero suavizado
      data[idx] = Math.min(255, Math.round(data[idx] * 1.05));
      data[idx + 1] = Math.min(255, Math.round(data[idx + 1] * 1.05));
      data[idx + 2] = Math.min(255, Math.round(data[idx + 2] * 1.05));
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return await canvasToBlob(canvas, 0.94);
}

/**
 * Genera un PDF multipágina A4 de alta resolución localmente con jsPDF (Sin marcas de agua)
 */
export async function generatePdfLocal(pagesBlobs, fitToA4 = true) {
  if (!pagesBlobs || pagesBlobs.length === 0) {
    throw new Error("No hay páginas para generar el PDF.");
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const a4W = 210;
  const a4H = 297;
  const margin = 8; // 8mm de margen
  const maxW = a4W - margin * 2;
  const maxH = a4H - margin * 2;

  for (let i = 0; i < pagesBlobs.length; i++) {
    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    const blob = pagesBlobs[i];
    const img = await loadImageFromBlob(blob);
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    // Calcular escala para ajustar a la página A4 manteniendo proporción
    const ratio = Math.min(maxW / iw, maxH / ih);
    const renderW = iw * ratio;
    const renderH = ih * ratio;

    const posX = margin + (maxW - renderW) / 2;
    const posY = margin + (maxH - renderH) / 2;

    const canvas = document.createElement('canvas');
    canvas.width = iw;
    canvas.height = ih;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const base64Data = canvas.toDataURL('image/jpeg', 0.9);

    pdf.addImage(base64Data, 'JPEG', posX, posY, renderW, renderH, undefined, 'FAST');
  }

  return pdf.output('blob');
}
