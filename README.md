# ScannerPro — Clon de CamScanner (Libre de Publicidad y Sin Marcas de Agua)

Aplicación moderna para digitalización inteligente de documentos inspirada en **CamScanner**, pero 100% privada, sin anuncios, sin suscripciones, sin marcas de agua ("Scanned by CamScanner") y con sincronización directa a tu propia cuenta de **Google Drive**.

---

## 🚀 Características Principales

1. **Captura Inteligente y Selección de Archivos:**
   - Cámara en vivo con guía visual tipo escáner láser.
   - Soporte para cámara trasera (con flash/linterna) y delantera en teléfonos móviles.
   - Importación directa desde la galería de imágenes o explorador de archivos.
   - Generador de documento de prueba integrado para testeo rápido sin cámara.

2. **Visión Artificial y Procesamiento de Imagen (OpenCV):**
   - **Detección Automática de Bordes:** Algoritmos Canny y aproximación poligonal para identificar los 4 vértices del papel.
   - **Recorte Interactivo de 4 Esquinas:** Puntos táctiles arrastrables con ajuste milimétrico de perspectiva (Homografía de 4 puntos).
   - **Eliminación de Sombras:** Estimación morfológica de fondo y normalización de iluminación irregular.
   - **Filtros de Acabado:**
     - ✨ **Magic Color:** Realce de contraste de texto, eliminación de sombras y colores vívidos.
     - 🔲 **B&W Limpio:** Umbral adaptativo Gaussiano para texto ultra-nítido con fondo blanco puro.
     - 🔘 **Escala de Grises:** Ecualización adaptativa de histograma (CLAHE).
     - 🛡️ **Denoise HD:** Reducción profunda de grano y ruido digital (*Fast Non-Local Means Denoising*).
     - 📷 **Original:** Sin alteraciones.

3. **Biblioteca y Persistencia Local (IndexedDB):**
   - Guarda automáticamente todos los documentos escaneados en la memoria del dispositivo.
   - Buscador rápido por título.
   - Reabrir, descargar o volver a compartir cualquier documento en cualquier momento.

4. **Renombrar Documentos Fácilmente:**
   - Opción para personalizar el nombre del documento al terminar el escaneo o directamente desde la biblioteca con el botón de edición.

5. **Compartir Directo por WhatsApp y Otras Apps:**
   - Botón directo **"Compartir por WhatsApp"** para enviar el documento en un solo toque.
   - Menú de compartir nativo con soporte para Telegram, Gmail, Bluetooth o almacenamiento en el móvil.

6. **Gestión Multipágina y Exportación Limpia:**
   - Agrupación de múltiples páginas en un solo documento.
   - Reordenar, visualizar y eliminar páginas individuales.
   - Generación de PDF optimizado (A4 estándar con márgenes de impresión).
   - **Cero marcas de agua:** Documentos limpios y profesionales.

7. **Conexión con tu Google Drive Personal:**
   - Integración nativa OAuth 2.0 con alcance restringido (`drive.file`) para máxima seguridad.
   - Creación automática de la carpeta **"Mi CamScanner"** en tu Drive.
   - Subida directa en un clic con enlace web inmediato para abrir o compartir.

---

## 📁 Estructura del Proyecto

```
Scanner/
├── backend/
│   ├── services/
│   │   ├── image_processor.py   # OpenCV: bordes, perspectiva, reducción de ruido y filtros
│   │   ├── pdf_builder.py       # ReportLab y Pillow: creación de PDF multipágina A4
│   │   └── gdrive_service.py    # Google Drive API v3: OAuth2 y subida de archivos
│   ├── tests/
│   │   └── test_processor.py    # Pruebas automatizadas de visión artificial
│   ├── main.py                  # API REST FastAPI con endpoints CORS
│   └── requirements.txt         # Dependencias Python
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Header.jsx          # Barra superior con estado de Google Drive
│   │   │   ├── HomeScreen.jsx      # Pantalla principal con accesos rápidos
│   │   │   ├── CameraView.jsx      # Cámara en vivo con guía láser y linterna
│   │   │   ├── InteractiveCrop.jsx # Editor de 4 esquinas con máscara SVG
│   │   │   ├── FilterScreen.jsx    # Selector de filtros de reducción de ruido
│   │   │   ├── DocumentViewer.jsx  # Visor multipágina y exportación
│   │   │   └── GDriveModal.jsx     # Modal de conexión con Google Drive
│   │   ├── services/
│   │   │   ├── api.js              # Cliente de llamadas a FastAPI
│   │   │   └── demoDoc.js          # Generador de documento de prueba
│   │   ├── App.jsx                 # Máquina de estados del escáner
│   │   └── App.css                 # Diseño moderno adaptable (móvil y PC)
│   └── vite.config.js              # Configuración de proxy y host de red
├── run_backend.bat                 # Script para iniciar backend
├── run_frontend.bat                # Script para iniciar frontend
└── start_all.bat                   # Iniciar ambos servicios en un clic
```

---

## 🛠️ Cómo Iniciar la Aplicación

### Opción 1: Un Solo Clic (Recomendada)
Doble clic en el archivo `start_all.bat` ubicado en la raíz del proyecto. Se abrirán automáticamente dos consolas:
- **Frontend:** [http://localhost:5173](http://localhost:5173)
- **Backend API:** [http://localhost:8000/docs](http://localhost:8000/docs)

### Opción 2: Desde la Terminal
1. **Terminal 1 (Backend):**
   ```bash
   cd backend
   python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```
2. **Terminal 2 (Frontend):**
   ```bash
   cd frontend
   npm.cmd run dev -- --host
   ```

---

## 📱 Cómo Instalar y Usar en tu Teléfono Móvil (APK / WebApp)

Tienes dos métodos sencillos para tener la aplicación en tu móvil:

### Método 1: Instalación Inmediata como App Nativa (WebAPK / PWA)
No requiere compilar nada ni instalar Android Studio:
1. Conecta tu teléfono a la misma red Wi-Fi de tu computadora.
2. Abre la consola de tu PC y escribe `ipconfig` para ver tu dirección IP local (ejemplo: `192.168.1.50`).
3. En el navegador de tu teléfono móvil (Chrome en Android o Safari en iPhone), ingresa a:  
   `http://192.168.1.50:5173`
4. Presiona el menú de 3 puntos de Chrome y selecciona **"Instalar aplicación"** o **"Agregar a la pantalla de inicio"**.
5. Android creará automáticamente el paquete APK nativo (WebAPK), colocará el icono de **ScannerPro** en tu pantalla de inicio y la app se abrirá a pantalla completa como una aplicación instalada normal, con acceso a la cámara y memoria local.

### Método 2: Generar APK mediante Capacitor y Android Studio
El proyecto nativo de Android ya está generado y sincronizado en la carpeta `frontend/android`:
1. Abre la carpeta `frontend/android` en **Android Studio**.
2. Ve al menú superior **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
3. Se generará el archivo `app-debug.apk` listo para pasar a tu teléfono por cable USB o WhatsApp e instalarlo.

---

## ☁️ Conectar tu Cuenta de Google Drive (3 Pasos)

1. Ve a [Google Cloud Console](https://console.cloud.google.com/) con tu cuenta de Google.
2. Crea un proyecto nuevo (o usa uno existente) y habilita la **Google Drive API** en la sección *APIs y Servicios*.
3. En la pestaña *Credenciales*:
   - Pulsa en **Crear credenciales > ID de cliente de OAuth > Tipo: Aplicación web**.
   - En **URI de redirección autorizados**, añade:
     `http://localhost:8000/api/drive/callback`
   - Descarga el archivo JSON de credenciales, cámbiale el nombre a `client_secrets.json` y colócalo dentro de la carpeta `backend/`.
4. Abre ScannerPro, pulsa el botón **"Conectar Drive"** en la barra superior y autoriza el acceso. ¡Listo! Tus documentos se guardarán automáticamente en tu carpeta **"Mi CamScanner"**.
