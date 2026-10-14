import React, { useRef, useState, useEffect } from 'react';
import { Check, Maximize2, Sparkles, ArrowLeft, Loader2 } from 'lucide-react';
import { detectCorners } from '../services/api';

export default function InteractiveCrop({ imageBlob, onApplyCrop, onBack }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState(null); // [[x,y], [x,y], [x,y], [x,y]] en coordenadas nativas de la imagen
  const [activeCornerIdx, setActiveCornerIdx] = useState(null);
  const [loadingDetection, setLoadingDetection] = useState(false);

  useEffect(() => {
    if (!imageBlob) return;

    let url = null;
    if (typeof imageBlob === 'string') {
      setImageSrc(imageBlob);
    } else if (imageBlob instanceof Blob) {
      url = URL.createObjectURL(imageBlob);
      setImageSrc(url);
    }

    return () => {
      // Retrasar revocación para que React 18 StrictMode o re-renders rápidos no anulen la URL
      if (url) {
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }, 15000);
      }
    };
  }, [imageBlob]);

  const setDefaultCorners = (w, h) => {
    const validW = w || 800;
    const validH = h || 600;
    const mx = validW * 0.05;
    const my = validH * 0.05;
    setCorners([
      [mx, my],
      [validW - mx, my],
      [validW - mx, validH - my],
      [mx, validH - my],
    ]);
  };

  const handleImageLoaded = async (e) => {
    const target = e.target || imageRef.current;
    if (!target) return;
    const nw = target.naturalWidth || target.width || 800;
    const nh = target.naturalHeight || target.height || 600;
    setImgNaturalSize({ width: nw, height: nh });

    const rect = target.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      setDisplaySize({ width: rect.width, height: rect.height });
    }

    // 1. Inmediatamente hacer visibles los 4 puntos y la imagen
    setDefaultCorners(nw, nh);

    // 2. Intentar afinar bordes en segundo plano
    setLoadingDetection(true);
    try {
      const data = await detectCorners(imageBlob);
      if (data && data.corners && data.corners.length === 4) {
        setCorners(data.corners);
      }
    } catch (err) {
      console.warn("Detección de bordes omitida, usando márgenes por defecto:", err);
    } finally {
      setLoadingDetection(false);
    }
  };

  // Mantener las dimensiones de pantalla actualizadas ante redimensiones o rotación
  useEffect(() => {
    if (!imageRef.current) return;

    const updateDisplayDimensions = () => {
      if (imageRef.current) {
        const rect = imageRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setDisplaySize({ width: rect.width, height: rect.height });
        }
      }
    };

    updateDisplayDimensions();

    if (imageRef.current.complete && imageRef.current.naturalWidth > 0 && imgNaturalSize.width === 0) {
      handleImageLoaded({ target: imageRef.current });
    }

    const ro = new ResizeObserver(updateDisplayDimensions);
    ro.observe(imageRef.current);
    window.addEventListener('resize', updateDisplayDimensions);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDisplayDimensions);
    };
  }, [imageSrc, imgNaturalSize.width]);

  const handleAutoDetect = async () => {
    setLoadingDetection(true);
    try {
      const data = await detectCorners(imageBlob);
      if (data && data.corners && data.corners.length === 4) {
        setCorners(data.corners);
      }
    } catch (err) {
      alert("No se pudo detectar automáticamente el papel. Ajusta los puntos manualmente.");
    } finally {
      setLoadingDetection(false);
    }
  };

  const handleSelectAll = () => {
    const w = imgNaturalSize.width || 800;
    const h = imgNaturalSize.height || 600;
    setCorners([
      [0, 0],
      [w, 0],
      [w, h],
      [0, h],
    ]);
  };

  // Convertir coordenadas nativas a coordenadas de pantalla (display)
  const getDisplayCoords = (pt) => {
    const w = displaySize.width || (imageRef.current ? imageRef.current.clientWidth : 0);
    const h = displaySize.height || (imageRef.current ? imageRef.current.clientHeight : 0);

    if (!w || !h || !imgNaturalSize.width || !imgNaturalSize.height) {
      return { x: 0, y: 0 };
    }
    const scaleX = w / imgNaturalSize.width;
    const scaleY = h / imgNaturalSize.height;
    return {
      x: pt[0] * scaleX,
      y: pt[1] * scaleY,
    };
  };

  // Convertir coordenadas de evento de pantalla a nativas
  const getNativeCoords = (clientX, clientY) => {
    if (!imageRef.current || !imgNaturalSize.width) return [0, 0];
    const rect = imageRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const y = Math.max(0, Math.min(clientY - rect.top, rect.height));

    const scaleX = imgNaturalSize.width / (rect.width || 1);
    const scaleY = imgNaturalSize.height / (rect.height || 1);

    return [x * scaleX, y * scaleY];
  };

  const handlePointerDown = (idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      if (e.target && e.target.setPointerCapture && e.pointerId !== undefined) {
        e.target.setPointerCapture(e.pointerId);
      }
    } catch (err) {}
    setActiveCornerIdx(idx);
  };

  const handlePointerMove = (e) => {
    if (activeCornerIdx === null || !corners) return;
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const [nativeX, nativeY] = getNativeCoords(clientX, clientY);

    setCorners((prev) => {
      const next = [...prev];
      next[activeCornerIdx] = [nativeX, nativeY];
      return next;
    });
  };

  const handlePointerUp = (e) => {
    try {
      if (e && e.target && e.target.releasePointerCapture && e.pointerId !== undefined) {
        e.target.releasePointerCapture(e.pointerId);
      }
    } catch (err) {}
    setActiveCornerIdx(null);
  };

  const handleConfirm = () => {
    if (!corners) return;
    onApplyCrop(corners);
  };

  // Generar path poligonal para el SVG
  const displayCorners = corners ? corners.map(getDisplayCoords) : [];
  const polygonPoints = displayCorners.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div
      className="crop-screen"
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="crop-header">
        <button className="icon-btn-ghost" onClick={onBack} title="Atrás">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="crop-title">Ajusta las 4 esquinas del documento</span>
        <button
          className="btn-confirm-crop"
          onClick={handleConfirm}
          disabled={!corners}
          title="Enderezar"
        >
          <Check className="w-5 h-5 mr-1" />
          <span>Siguiente</span>
        </button>
      </div>

      <div className="crop-canvas-wrapper" ref={containerRef}>
        {imageSrc && (
          <div className="image-overlay-box">
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Documento capturado"
              className="crop-source-image"
              onLoad={handleImageLoaded}
              draggable={false}
            />

            {/* Capa SVG con máscara de recorte y líneas */}
            {corners && imageRef.current && displayCorners.length === 4 && (
              <svg className="crop-svg-overlay">
                <defs>
                  <mask id="crop-mask">
                    <rect width="100%" height="100%" fill="white" />
                    <polygon points={polygonPoints} fill="black" />
                  </mask>
                </defs>
                <rect
                  width="100%"
                  height="100%"
                  fill="rgba(0, 0, 0, 0.6)"
                  mask="url(#crop-mask)"
                />

                {/* Líneas delimitadoras de la hoja */}
                <polygon
                  points={polygonPoints}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="4 2"
                />

                {/* Líneas guía cruzadas */}
                <line
                  x1={(displayCorners[0].x + displayCorners[3].x) / 2}
                  y1={(displayCorners[0].y + displayCorners[3].y) / 2}
                  x2={(displayCorners[1].x + displayCorners[2].x) / 2}
                  y2={(displayCorners[1].y + displayCorners[2].y) / 2}
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                />
                <line
                  x1={(displayCorners[0].x + displayCorners[1].x) / 2}
                  y1={(displayCorners[0].y + displayCorners[1].y) / 2}
                  x2={(displayCorners[3].x + displayCorners[2].x) / 2}
                  y2={(displayCorners[3].y + displayCorners[2].y) / 2}
                  stroke="rgba(16, 185, 129, 0.4)"
                  strokeWidth="1"
                />
              </svg>
            )}

            {/* Puntos de esquina arrastrables */}
            {displayCorners.map((pt, idx) => (
              <div
                key={idx}
                className={`crop-handle ${activeCornerIdx === idx ? 'active' : ''}`}
                style={{
                  left: `${pt.x}px`,
                  top: `${pt.y}px`,
                }}
                onPointerDown={(e) => handlePointerDown(idx, e)}
              >
                <div className="handle-dot" />
              </div>
            ))}
          </div>
        )}

        {loadingDetection && (
          <div className="detection-spinner-overlay">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>Optimizando bordes...</span>
          </div>
        )}
      </div>

      <div className="crop-bottom-toolbar">
        <button className="toolbar-tool-btn" onClick={handleAutoDetect}>
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>Auto-detectar</span>
        </button>

        <button className="toolbar-tool-btn" onClick={handleSelectAll}>
          <Maximize2 className="w-5 h-5 text-gray-300" />
          <span>Todo el marco</span>
        </button>
      </div>
    </div>
  );
}
