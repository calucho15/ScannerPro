import React, { useRef, useState, useEffect } from 'react';
import {
  Check,
  Maximize2,
  Sparkles,
  ArrowLeft,
  Loader2,
  Grid,
  RotateCw,
  RotateCcw
} from 'lucide-react';
import { detectCorners, rotateImage } from '../services/api';
import ProgressBar from './ProgressBar';

const CORNER_NAMES = [
  'Superior Izquierda (1/4)',
  'Superior Derecha (2/4)',
  'Inferior Derecha (3/4)',
  'Inferior Izquierda (4/4)'
];

export default function InteractiveCrop({ imageBlob, onApplyCrop, onBack }) {
  const containerRef = useRef(null);
  const imageRef = useRef(null);
  const loupeCanvasRef = useRef(null);

  const [activeBlob, setActiveBlob] = useState(imageBlob);
  const [imageSrc, setImageSrc] = useState(null);
  const [imgNaturalSize, setImgNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [corners, setCorners] = useState(null); // [[x,y], [x,y], [x,y], [x,y]]
  const [activeCornerIdx, setActiveCornerIdx] = useState(null);
  const [loadingDetection, setLoadingDetection] = useState(false);
  const [showGrid, setShowGrid] = useState(true);
  const [isRotating, setIsRotating] = useState(false);

  // Barra de progreso al confirmar recorte y enderezar
  const [isWarping, setIsWarping] = useState(false);
  const [warpProgress, setWarpProgress] = useState(0);
  const [warpStatus, setWarpStatus] = useState('');

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
    const mx = validW * 0.08;
    const my = validH * 0.08;
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

    setDefaultCorners(nw, nh);

    // Intentar auto-detección robusta con Otsu y segmentación de papel
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

  // Actualizar Lupa con Zoom Ligero (1.15x) en posición fija HUD
  useEffect(() => {
    if (activeCornerIdx === null || !corners || !imageRef.current || !loupeCanvasRef.current) return;
    const canvas = loupeCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const [nx, ny] = corners[activeCornerIdx];
    const zoom = 1.15; // Zoom ligero y natural
    const size = 110;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, size, size);

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

    // Cruz de mira precisa
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(size / 2 - 14, size / 2);
    ctx.lineTo(size / 2 + 14, size / 2);
    ctx.moveTo(size / 2, size / 2 - 14);
    ctx.lineTo(size / 2, size / 2 + 14);
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

  const handleRotate = async (degrees) => {
    if (isRotating) return;
    setIsRotating(true);
    try {
      const rotated = await rotateImage(activeBlob, degrees);
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
    const nw = imgNaturalSize.width || 1;
    const nh = imgNaturalSize.height || 1;

    return {
      x: (pt[0] / nw) * w,
      y: (pt[1] / nh) * h,
    };
  };

  const handlePointerDown = (idx, e) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveCornerIdx(idx);

    const onPointerMove = (moveEvent) => {
      moveEvent.preventDefault();
      if (!imageRef.current) return;

      const rect = imageRef.current.getBoundingClientRect();
      const clientX = moveEvent.clientX;
      const clientY = moveEvent.clientY;

      const clampedX = Math.max(0, Math.min(rect.width, clientX - rect.left));
      const clampedY = Math.max(0, Math.min(rect.height, clientY - rect.top));

      const nw = imgNaturalSize.width || 800;
      const nh = imgNaturalSize.height || 600;

      const realX = Math.round((clampedX / rect.width) * nw);
      const realY = Math.round((clampedY / rect.height) * nh);

      setCorners((prev) => {
        if (!prev) return prev;
        const next = [...prev];
        next[idx] = [realX, realY];
        return next;
      });
    };

    const onPointerUp = () => {
      setActiveCornerIdx(null);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    window.addEventListener('pointermove', onPointerMove, { passive: false });
    window.addEventListener('pointerup', onPointerUp);
  };

  const handleConfirmCrop = async () => {
    if (!corners || isWarping) return;
    setIsWarping(true);
    setWarpProgress(25);
    setWarpStatus('Mapeando perspectiva del documento...');

    const timer = setInterval(() => {
      setWarpProgress((p) => (p < 85 ? p + 20 : p));
    }, 100);

    try {
      setTimeout(async () => {
        clearInterval(timer);
        setWarpProgress(90);
        setWarpStatus('Enderezando y optimizando geometría...');
        await onApplyCrop(corners);
      }, 250);
    } catch (e) {
      clearInterval(timer);
      setIsWarping(false);
      alert("Error al aplicar recorte: " + e.message);
    }
  };

  const displayCorners = corners ? corners.map(getDisplayCoords) : [];

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
    <div className="crop-screen" ref={containerRef}>
      <div className="crop-header">
        <button className="icon-btn-ghost" onClick={onBack} title="Atrás" disabled={isWarping}>
          <ArrowLeft className="w-6 h-6" />
        </button>
        <span className="crop-title">Ajusta las 4 esquinas</span>
        <button
          className="btn-confirm-crop"
          onClick={handleConfirmCrop}
          disabled={!corners || loadingDetection || isRotating || isWarping}
        >
          <Check className="w-5 h-5 mr-1" />
          <span>Siguiente</span>
        </button>
      </div>

      <div className="crop-canvas-wrapper">
        {imageSrc && (
          <div className="image-overlay-box">
            <img
              ref={imageRef}
              src={imageSrc}
              alt="Documento a recortar"
              className="crop-source-image"
              onLoad={handleImageLoaded}
              draggable={false}
            />

            {/* Polígono y Cuadrícula 3x3 */}
            {displayCorners.length === 4 && (
              <svg className="crop-svg-overlay">
                <polygon
                  points={displayCorners.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="rgba(16, 185, 129, 0.16)"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeDasharray="none"
                />

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

            {/* Lupa Fija en la parte superior (Stationary Top HUD) con Zoom Ligero (1.15x) */}
            {activeCornerIdx !== null && corners && displayCorners[activeCornerIdx] && (
              <div className="crop-fixed-loupe-hud">
                <span className="loupe-corner-label">
                  {CORNER_NAMES[activeCornerIdx] || `Esquina ${activeCornerIdx + 1}`}
                </span>
                <div className="loupe-canvas-box">
                  <canvas ref={loupeCanvasRef} width={110} height={110} className="loupe-canvas" />
                  <div className="loupe-ring" />
                </div>
              </div>
            )}
          </div>
        )}

        {(loadingDetection || isRotating) && (
          <div className="detection-spinner-overlay">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>{isRotating ? 'Rotando imagen...' : 'Detectando bordes de papel...'}</span>
          </div>
        )}

        {/* Barra de progreso al confirmar recorte */}
        {isWarping && (
          <ProgressBar
            progress={warpProgress}
            title="Enderezando documento"
            statusText={warpStatus}
            isOverlay={true}
          />
        )}
      </div>

      <div className="crop-bottom-toolbar">
        <button className="toolbar-tool-btn" onClick={handleAutoDetect} disabled={isWarping}>
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span>Auto-detectar</span>
        </button>

        <button className="toolbar-tool-btn" onClick={() => setShowGrid(!showGrid)} disabled={isWarping}>
          <Grid className={`w-5 h-5 ${showGrid ? 'text-emerald-400' : 'text-gray-400'}`} />
          <span>{showGrid ? 'Guías ON' : 'Guías OFF'}</span>
        </button>

        <button className="toolbar-tool-btn" onClick={() => handleRotate(-90)} disabled={isRotating || isWarping} title="Rotar 90° hacia la izquierda">
          <RotateCcw className="w-5 h-5 text-cyan-400" />
          <span>Rotar Izq</span>
        </button>

        <button className="toolbar-tool-btn" onClick={() => handleRotate(90)} disabled={isRotating || isWarping} title="Rotar 90° hacia la derecha">
          <RotateCw className="w-5 h-5 text-cyan-400" />
          <span>Rotar Der</span>
        </button>

        <button className="toolbar-tool-btn" onClick={handleSelectAll} disabled={isWarping}>
          <Maximize2 className="w-5 h-5 text-gray-300" />
          <span>Todo el marco</span>
        </button>
      </div>
    </div>
  );
}
