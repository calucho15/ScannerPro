"""
FastAPI Server para Clon de CamScanner.
Provee endpoints para:
- Detección de esquinas y transformación de perspectiva de documentos
- Eliminación de ruido, sombras y realce (Magic Color, Blanco y Negro, Escala de Grises)
- Creación de PDFs multipágina sin marcas de agua
- Autenticación y sincronización con Google Drive
"""

import json
from typing import List, Optional
from fastapi import FastAPI, File, UploadFile, Form, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response, RedirectResponse

from services.image_processor import (
    decode_image_bytes,
    encode_image_bytes,
    detect_document_corners,
    four_point_transform,
    apply_filter,
    order_points
)
from services.pdf_builder import create_pdf_from_images
import services.gdrive_service as gdrive

import numpy as np

app = FastAPI(
    title="Scanner Pro API (CamScanner Clone)",
    description="API de escaneo y procesamiento inteligente de documentos sin publicidad",
    version="1.0.0"
)

# Permitir CORS para permitir solicitudes desde Expo Móvil y Navegador Web
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "service": "Scanner Pro API",
        "gdrive_configured": gdrive.is_client_configured(),
        "gdrive_authenticated": gdrive.is_authenticated()
    }


@app.post("/api/process/detect-corners")
async def detect_corners_endpoint(file: UploadFile = File(...)):
    """
    Detecta automáticamente las 4 esquinas del documento en la foto proporcionada.
    """
    try:
        contents = await file.read()
        image = decode_image_bytes(contents)
        h, w = image.shape[:2]
        corners = detect_document_corners(image)
        return {
            "success": True,
            "width": w,
            "height": h,
            "corners": corners
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process/warp")
async def warp_endpoint(
    file: UploadFile = File(...),
    corners: str = Form(None)  # JSON string con 4 puntos: [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
):
    """
    Aplica transformación de perspectiva dada una selección de 4 puntos.
    Si no se especifican puntos, los detecta automáticamente.
    """
    try:
        contents = await file.read()
        image = decode_image_bytes(contents)

        if corners:
            pts_list = json.loads(corners)
            pts = np.array(pts_list, dtype="float32")
        else:
            pts_list = detect_document_corners(image)
            pts = np.array(pts_list, dtype="float32")

        warped = four_point_transform(image, pts)
        output_bytes = encode_image_bytes(warped, format_ext=".jpg", quality=92)
        return Response(content=output_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process/filter")
async def filter_endpoint(
    file: UploadFile = File(...),
    filter_type: str = Form("magic_color")
):
    """
    Aplica filtros de reducción de ruido y mejora visual:
    'magic_color', 'clean_bw', 'grayscale', 'denoise', 'original'
    """
    try:
        contents = await file.read()
        image = decode_image_bytes(contents)
        enhanced = apply_filter(image, filter_type=filter_type)
        output_bytes = encode_image_bytes(enhanced, format_ext=".jpg", quality=92)
        return Response(content=output_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process/scan-pipeline")
async def scan_pipeline_endpoint(
    file: UploadFile = File(...),
    corners: Optional[str] = Form(None),
    filter_type: str = Form("magic_color")
):
    """
    Tubería completa en un solo paso:
    1. Recorte con corrección de perspectiva.
    2. Eliminación de sombras y reducción de ruido según el filtro seleccionado.
    """
    try:
        contents = await file.read()
        image = decode_image_bytes(contents)

        if corners:
            pts_list = json.loads(corners)
            pts = np.array(pts_list, dtype="float32")
        else:
            pts_list = detect_document_corners(image)
            pts = np.array(pts_list, dtype="float32")

        warped = four_point_transform(image, pts)
        enhanced = apply_filter(warped, filter_type=filter_type)
        output_bytes = encode_image_bytes(enhanced, format_ext=".jpg", quality=92)
        return Response(content=output_bytes, media_type="image/jpeg")
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.post("/api/process/create-pdf")
async def create_pdf_endpoint(
    files: List[UploadFile] = File(...),
    fit_to_a4: bool = Form(True),
    quality: int = Form(88)
):
    """
    Combina múltiples páginas procesadas en un único archivo PDF optimizado.
    """
    try:
        images_bytes = []
        for f in files:
            data = await f.read()
            images_bytes.append(data)

        pdf_bytes = create_pdf_from_images(images_bytes, fit_to_a4=fit_to_a4, quality=quality)
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": "attachment; filename=documento_escaneado.pdf"}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# ---------------- Google Drive Endpoints ---------------- #

@app.get("/api/drive/status")
def drive_status():
    """Retorna el estado de configuración y autenticación con Google Drive."""
    return {
        "configured": gdrive.is_client_configured(),
        "authenticated": gdrive.is_authenticated()
    }


@app.get("/api/drive/auth-url")
def drive_auth_url(request: Request, redirect_uri: Optional[str] = None):
    """Genera el enlace para iniciar sesión con Google."""
    try:
        if not redirect_uri:
            # Por defecto usa la URL del callback en este mismo servidor
            base_url = str(request.base_url).rstrip("/")
            redirect_uri = f"{base_url}/api/drive/callback"

        auth_data = gdrive.get_authorization_url(redirect_uri=redirect_uri)
        return auth_data
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/api/drive/callback")
def drive_callback(request: Request, code: Optional[str] = None, error: Optional[str] = None):
    """Callback invocado por Google tras la autorización del usuario."""
    if error:
        return JSONResponse(status_code=400, content={"error": error})
    if not code:
        raise HTTPException(status_code=400, detail="Código de autorización faltante.")

    try:
        base_url = str(request.base_url).rstrip("/")
        redirect_uri = f"{base_url}/api/drive/callback"
        gdrive.exchange_code_for_token(code=code, redirect_uri=redirect_uri)
        return HTMLResponse(
            """
            <html>
                <body style="font-family:sans-serif; text-align:center; padding: 50px;">
                    <h2 style="color: #10b981;">¡Google Drive Conectado Exitosamente!</h2>
                    <p>Ya puedes volver a la aplicación de escaneo. Esta ventana puede cerrarse.</p>
                </body>
            </html>
            """
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/drive/disconnect")
def drive_disconnect():
    """Desconecta la cuenta de Google eliminando el token de sesión."""
    success = gdrive.disconnect_account()
    return {"success": success}


@app.post("/api/drive/upload")
async def drive_upload(
    file: UploadFile = File(...),
    filename: Optional[str] = Form(None),
    folder_name: str = Form("Mi CamScanner")
):
    """Sube un archivo directamente a Google Drive."""
    try:
        contents = await file.read()
        target_filename = filename or file.filename or "escaneo.pdf"
        mime_type = file.content_type or "application/pdf"

        result = gdrive.upload_document(
            file_bytes=contents,
            filename=target_filename,
            mime_type=mime_type,
            folder_name=folder_name
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


from fastapi.responses import HTMLResponse

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
