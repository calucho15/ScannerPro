"""
Servicio de Integración con Google Drive API v3.
Permite autenticación OAuth 2.0 con cuenta personal de Google y subida directa
de documentos escaneados (PDF o imágenes) a una carpeta dedicada ('Mi CamScanner').
"""

import os
import json
import io
from typing import Optional, Dict, Any
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

# Scopes restringidos para mayor seguridad: solo gestiona los archivos creados por esta aplicación
SCOPES = ["https://www.googleapis.com/auth/drive.file"]

CONFIG_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CREDENTIALS_FILE = os.path.join(CONFIG_DIR, "client_secrets.json")
TOKEN_FILE = os.path.join(CONFIG_DIR, "token.json")


def is_client_configured() -> bool:
    """Verifica si el archivo de configuración de cliente OAuth de Google existe."""
    return os.path.exists(CREDENTIALS_FILE)


def is_authenticated() -> bool:
    """Verifica si ya existe un token de sesión de usuario válido."""
    if not os.path.exists(TOKEN_FILE):
        return False
    try:
        with open(TOKEN_FILE, "r") as f:
            data = json.load(f)
        creds = Credentials.from_authorized_user_info(data, SCOPES)
        return creds.valid or (creds.expired and creds.refresh_token is not None)
    except Exception:
        return False


def get_credentials() -> Optional[Credentials]:
    """Obtiene y refresca las credenciales de usuario almacenadas."""
    if not os.path.exists(TOKEN_FILE):
        return None
    try:
        with open(TOKEN_FILE, "r") as f:
            data = json.load(f)
        creds = Credentials.from_authorized_user_info(data, SCOPES)
        if creds.expired and creds.refresh_token:
            from google.auth.transport.requests import Request
            creds.refresh(Request())
            # Guardar token refrescado
            with open(TOKEN_FILE, "w") as f:
                f.write(creds.to_json())
        return creds
    except Exception as e:
        print(f"Error cargando credenciales: {e}")
        return None


def get_authorization_url(redirect_uri: str) -> Dict[str, str]:
    """Genera la URL de autorización OAuth2 de Google para iniciar sesión."""
    if not is_client_configured():
        raise FileNotFoundError(
            f"No se encontró el archivo '{CREDENTIALS_FILE}'. "
            "Descarga tus credenciales OAuth 2.0 desde la Consola de Google Cloud "
            "y guárdalas como 'client_secrets.json' en la carpeta backend."
        )

    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    auth_url, state = flow.authorization_url(
        access_type="offline",
        include_granted_scopes="true",
        prompt="consent"
    )
    return {"auth_url": auth_url, "state": state}


def exchange_code_for_token(code: str, redirect_uri: str) -> bool:
    """Intercambia el código de autorización por el token de acceso permanente."""
    if not is_client_configured():
        raise FileNotFoundError("Archivo client_secrets.json no encontrado.")

    flow = Flow.from_client_secrets_file(
        CREDENTIALS_FILE,
        scopes=SCOPES,
        redirect_uri=redirect_uri
    )
    flow.fetch_token(code=code)
    creds = flow.credentials

    with open(TOKEN_FILE, "w") as f:
        f.write(creds.to_json())
    return True


def disconnect_account() -> bool:
    """Elimina el token de sesión guardado."""
    if os.path.exists(TOKEN_FILE):
        os.remove(TOKEN_FILE)
        return True
    return False


def get_or_create_folder(service, folder_name: str = "Mi CamScanner") -> str:
    """Busca o crea la carpeta de destino en Google Drive."""
    query = f"name = '{folder_name}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false"
    results = service.files().list(q=query, spaces="drive", fields="files(id, name)").execute()
    files = results.get("files", [])

    if files:
        return files[0]["id"]

    # Crear carpeta si no existe
    file_metadata = {
        "name": folder_name,
        "mimeType": "application/vnd.google-apps.folder"
    }
    folder = service.files().create(body=file_metadata, fields="id").execute()
    return folder.get("id")


def upload_document(
    file_bytes: bytes,
    filename: str,
    mime_type: str = "application/pdf",
    folder_name: str = "Mi CamScanner"
) -> Dict[str, Any]:
    """
    Sube un archivo (PDF o Imagen) a Google Drive en la carpeta designada.
    Retorna información del archivo incluyendo enlace web para ver y compartir.
    """
    creds = get_credentials()
    if not creds:
        raise PermissionError("No hay una cuenta de Google conectada o la sesión ha expirado.")

    service = build("drive", "v3", credentials=creds)
    folder_id = get_or_create_folder(service, folder_name)

    file_metadata = {
        "name": filename,
        "parents": [folder_id]
    }
    media = MediaIoBaseUpload(io.BytesIO(file_bytes), mimetype=mime_type, resumable=True)

    file = service.files().create(
        body=file_metadata,
        media_body=media,
        fields="id, name, webViewLink, webContentLink"
    ).execute()

    return {
        "success": True,
        "file_id": file.get("id"),
        "filename": file.get("name"),
        "web_view_link": file.get("webViewLink"),
        "download_link": file.get("webContentLink")
    }
