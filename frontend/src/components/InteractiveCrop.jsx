import React, { useRef, useState, useEffect } from 'react';
import { Check, Maximize2, Sparkles, ArrowLeft, Loader2, Grid, RotateCw } from 'lucide-react';
import { detectCorners, rotateImage } from '../services/api';

export default function InteractiveCrop({ imageBlob, onApplyCrop, onBack }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const loupeCanvasRef = useRef(null);

  const [activeBlob, setActiveBlob] = useState(imageBlob);
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState(null); // [[x,y], [x,y], [x,y], [x,y]] en coordenadas nativas
  const [activeCornerIdx, setActiveCornerIdx] = useState(null);
  const [loadingDetection, setLoadingDetection] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isRotating, setIsRotating] = useState(false);

  useEffect(() => {
    setActiveBlob(imageBlob);
  }, [imageBlob]);

  useEffect(() => {
    if (!activeBlob) return;

    let url = null;
    if (typeof activeBlob === 'string') {
      setImageSrc(activeBlob);
    } else if (activeBlob instanceof Blob) {
      url = URL.createObjectURL(activeBlob);
      setImageSrc(url);
    }

    return () => {
      if (url) {
        setTimeout(() => {
          try { URL.revokeObjectURL(url); } catch (e) {}
        }, 15000);
      }
    };
  }, [activeBlob]);

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

    // 1. Mostrar de inmediato margen inteligente por defecto
    setDefaultCorners(nw, nh);

    // 2. Intentar afinar bordes con análisis de gradiente
    setLoadingDetection(true);
    try {
      const data = await detectCorners(activeBlob);
      if (data && data.corners && data.corners.length === 4) {
        setCorners(data.corners);
      }
    } catch (err) {
      console.warn("Detección de bordes omitida:", err);
    } finally {
      setLoadingDetection(false);
    }
  };

  // Mantener las dimensiones de pantalla sincronizadas
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

  // Actualizar contenido de la Lupa de Precisión en tiempo real
  useEffect(() => {
    if (activeCornerIdx === null || !corners || !imageRef.current || !loupeCanvasRef.current) return;
    const canvas = loupeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const [nx, ny] = corners[activeCornerIdx];
    const zoom = 2.5;
    const size = 110;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);

    // Dibujar imagen ampliada centrada en la esquina
    const srcSize = size / zoom;
    ctx.drawImage(
      imageRef.current,
      nx - srcSize / 2,
      ny - srcSize / 2,
      srcSize,
      srcSize,
      0,
      0,
      size,
      size
    );

    // Dibujar cruz de mira de precisión
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 12, size / 2);
    ctx.lineTo(size / 2 + 12, size / 2);
    ctx.moveTo(size / 2, size / 2 - 12);
    ctx.lineTo(size / 2, size / 2 + 12);
    ctx.stroke();

    ctx.restore();
  }, [activeCornerIdx, corners]);

  const handleAutoDetect = async () => {
    setLoadingDetection(true);
    try {
      const data = await detectCorners(activeBlob);
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

  const handleRotate = async () => {
    if (isRotating) return;
    setIsRotating(true);
    try {
      const rotated = await rotateImage(activeBlob, 90);
      setActiveBlob(rotated);
      setCorners(null);
    } catch (err) {
      alert("Error al rotar imagen: " + err.message);
    } finally {
      setIsRotating(false);
    }
  };

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
    onApplyCrop(corners, activeBlob);
  };

  const displayCorners = corners ? corners.map(getDisplayCoords) : [];
  const polygonPoints = displayCorners.map((p) => `${p.x},${p.y}`).join(' ');

  // Interpolación bilineal para líneas de cuadrícula 3x3
  const interpolateDisplay = (u, v) => {
    if (displayCorners.length < 4) return { x: 0, y: 0 };
    const [tl, tr, br, bl] = displayCorners;
    const topX = tl.x + u * (tr.x - tl.x);
    const topY = tl.y + u * (tr.y - tl.y);
    const botX = bl.x + u * (br.x - bl.x);
    const botY = bl.y + u * (br.y - bl.y);
    return {
      x: topX + v * (botX - topX),
      y: topY + v * (botY - topY)
    };
  };

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
          disabled={!corners || isRotating}
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

            {/* Capa SVG con máscara de recorte y cuadrícula */}
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

                {/* Cuadrícula 3x3 de alineación perspectiva */}
                {showGrid && (
                  <>
                    <line
                      x1={interpolateDisplay(0, 0.33).x}
                      y1={interpolateDisplay(0, 0.33).y}
                      x2={interpolateDisplay(1, 0.33).x}
                      y2={interpolateDisplay(1, 0.33).y}
                      stroke="rgba(16, 185, 129, 0.45)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={interpolateDisplay(0, 0.67).x}
                      y1={interpolateDisplay(0, 0.67).y}
                      x2={interpolateDisplay(1, 0.67).x}
                      y2={interpolateDisplay(1, 0.67).y}
                      stroke="rgba(16, 185, 129, 0.45)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={interpolateDisplay(0.33, 0).x}
                      y1={interpolateDisplay(0.33, 0).y}
                      x2={interpolateDisplay(0.33, 1).x}
                      y2={interpolateDisplay(0.33, 1).y}
                      stroke="rgba(16, 185, 129, 0.45)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                    <line
                      x1={interpolateDisplay(0.67, 0).x}
                      y1={interpolateDisplay(0.67, 0).y}
                      x2={interpolateDisplay(0.67, 1).x}
                      y2={interpolateDisplay(0.67, 1).y}
                      stroke="rgba(16, 185, 129, 0.45)"
                      strokeWidth="1.2"
                      strokeDasharray="3 3"
                    />
                  </>
                )}
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

            {/* Lupa Flotante de Precisión (2.5x zoom con cruz de mira) */}
            {activeCornerIdx !== null && corners && displayCorners[activeCornerIdx] && (
              <div
                className="crop-magnifier-loupe"
                style={{
                  left: `${Math.max(60, Math.min(displaySize.width - 60, displayCorners[activeCornerIdx].x))}px`,
                  top: `${displayCorners[activeCornerIdx].y < 95 ? displayCorners[activeCornerIdx].y + 75 : displayCorners[activeCornerIdx].y - 75}px`
                }}
              >
                <canvas ref={loupeCanvasRef} width={110} height={110} className="loupe-canvas" />
                <div className="loupe-ring" />
              </div>
            )}
          </div>
        )}

        {(loadingDetection || isRotating) && (
          <div className="detection-spinner-overlay">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>{isRotating ? 'Rotando imagen...' : 'Optimizando bordes...'}</span>
          </div>
        )}
      </div>

      <div className="crop-bottom-toolbar">
        <button className="toolbar-tool-btn" onClick={handleAutoDetect}>
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>Auto-detectar</span>
        </button>

        <button className="toolbar-tool-btn" onClick={() => setShowGrid(!showGrid)}>
          <Grid className={`w-5 h-5 ${showGrid ? 'text-emerald-400' : 'text-gray-400'}`} />
          <span>{showGrid ? 'Guías ON' : 'Guías OFF'}</span>
        </button>

        <button className="toolbar-tool-btn" onClick={handleRotate} disabled={isRotating}>
          <RotateCw className="w-5 h-5 text-cyan-400" />
          <span>Rotar 90°</span>
        </button>

        <button className="toolbar-tool-btn" onClick={handleSelectAll}>
          <Maximize2 className="w-5 h-5 text-gray-300" />
          <span>Todo el marco</span>
        </button>
      </div>
    </div>
  );
}
