import React, { useRef, useState, useEffect } from 'react';
import { Camera, SwitchCamera, X, Image as ImageIcon, Zap, ZapOff } from 'lucide-react';

export default function CameraView({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [facingMode, setFacingMode] = useState('environment'); // 'environment' = trasera, 'user' = frontal
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, [facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    try {
      const constraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        },
        audio: false
      };
      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Comprobar soporte de linterna/flash
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities ? track.getCapabilities() : {};
      if (capabilities.torch) {
        setHasTorch(true);
      }
    } catch (err) {
      console.warn("No se pudo iniciar la cámara:", err);
      setCameraError("No se pudo acceder a la cámara. Puedes subir una imagen desde tu galería o archivos.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const toggleCameraFacing = () => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  };

  const toggleTorch = async () => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (track && track.applyConstraints) {
      try {
        await track.applyConstraints({
          advanced: [{ torch: !torchOn }]
        });
        setTorchOn(!torchOn);
      } catch (e) {
        console.warn("No se pudo cambiar la linterna:", e);
      }
    }
  };

  const [capturedBlobs, setCapturedBlobs] = useState([]);
  const [isFlashing, setIsFlashing] = useState(false);

  const takePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 120);

    canvas.toBlob((blob) => {
      if (blob) {
        setCapturedBlobs((prev) => [...prev, blob]);
      }
    }, 'image/jpeg', 0.95);
  };

  const handleFinishCapture = () => {
    if (capturedBlobs.length > 0) {
      stopCamera();
      onCapture(capturedBlobs);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      stopCamera();
      onCapture(files);
    }
  };

  return (
    <div className="camera-modal">
      <div className="camera-header">
        <button
          className="icon-btn-ghost flex-shrink-0"
          onClick={() => {
            if (capturedBlobs.length > 0) {
              handleFinishCapture();
            } else {
              onClose();
            }
          }}
          title={capturedBlobs.length > 0 ? "Terminar captura" : "Cerrar"}
        >
          <X className="w-6 h-6" />
        </button>
        <span className="camera-title truncate">
          {capturedBlobs.length > 0
            ? `${capturedBlobs.length} ${capturedBlobs.length === 1 ? 'página tomada' : 'páginas tomadas'}`
            : 'Apunta hacia el documento'}
        </span>
        <div className="camera-header-tools">
          {hasTorch && (
            <button className="icon-btn-ghost" onClick={toggleTorch} title="Linterna">
              {torchOn ? <Zap className="w-5 h-5 text-amber-400" /> : <ZapOff className="w-5 h-5" />}
            </button>
          )}
          <button className="icon-btn-ghost" onClick={toggleCameraFacing} title="Cambiar Cámara">
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="camera-viewport-container">
        {cameraError ? (
          <div className="camera-fallback-msg">
            <p>{cameraError}</p>
            <button className="btn-primary" onClick={() => fileInputRef.current?.click()}>
              <ImageIcon className="w-5 h-5 mr-2" />
              Seleccionar desde Galería / Archivo
            </button>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video-stream"
            />
            {isFlashing && <div className="camera-flash-overlay"></div>}
            {/* Guía visual de escaneo */}
            <div className="scanner-overlay-guide">
              <div className="corner-bracket top-left"></div>
              <div className="corner-bracket top-right"></div>
              <div className="corner-bracket bottom-left"></div>
              <div className="corner-bracket bottom-right"></div>
              <div className="scan-laser-line"></div>
            </div>
          </>
        )}
      </div>

      <div className="camera-bottom-bar">
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={handleFileSelect}
        />
        <button
          className="gallery-btn"
          onClick={() => fileInputRef.current?.click()}
          title="Importar imagen"
        >
          <ImageIcon className="w-6 h-6 text-white" />
        </button>

        {!cameraError && (
          <button className="shutter-btn" onClick={takePhoto} title="Tomar foto de la página">
            <div className="shutter-inner"></div>
          </button>
        )}

        <div className="camera-finish-btn-wrapper">
          {capturedBlobs.length > 0 && (
            <button
              className="btn-confirm-crop"
              onClick={handleFinishCapture}
              title="Continuar con las fotos tomadas"
            >
              <span>Listo ({capturedBlobs.length})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
