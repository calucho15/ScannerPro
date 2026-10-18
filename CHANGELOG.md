# Historial de Versiones - ScannerPro

## [v1.3.0] - 2026-10-18

### 📸 Flujo de Captura por Lotes (Fotos Primero, Edición Después)
- **Captura continua**: Toma todas las fotos de tu documento seguidas con un contador visual de páginas capturadas sin que la aplicación te interrumpa para recortar tras cada foto.
- **Bandeja de revisión previa**: Revisa las miniaturas de las páginas tomadas, elimina fotos movidas o desenfocadas y añade más páginas desde la cámara o la galería.
- **Edición secuencial guiada**: Al pulsar "Continuar a Edición", recorre página por página (`Pág. 1 de N`, `Pág. 2 de N`...) ajustando esquinas y acabados de forma fluida.
- **Selección múltiple desde Galería**: Ahora puedes importar múltiples fotos a la vez desde la galería del móvil.

### 📐 Auto-Detección de Bordes Ultra Robusta
- **Nuevo motor de visión**: Segmentación morfológica avanzada con análisis de componentes conectados (CCA), envolvente convexa (*Convex Hull*) y maximización de área de cuadriláteros.
- **Contraste Extremo Resuelto**: Detecta con precisión sub-pixel hojas blancas sobre fondos negros o mesas oscuras, ignorando completamente el texto impreso, reflejos o polvo en la superficie.

### 📱 Optimización de Interfaz y Botón Listo
- **Sin botones ocultos o cortados**: Reorganizado el encabezado en la pantalla de acabados para garantizar que el botón "Listo" / "Siguiente" quede siempre visible y espacioso en cualquier ancho de pantalla móvil.
- **Barra de rotación dedicada**: Botones dedicados "Rotar Izq" (-90°) y "Rotar Der" (+90°) ubicados cómodamente bajo el visor de la imagen.

---

## [v1.2.0] - 2026-10-18

### 👤 Nueva Herramienta: Estudio de Foto Carnet & Retrato Fondo Blanco
- **Herramienta independiente**: Separada del flujo de escáner de documentos para un uso fotográfico especializado.
- **Fondo Blanco Puro de Estudio (#FFFFFF)**: Toma o selecciona la foto de una persona y remueve el fondo automáticamente conservando silueta, cabello y ropa sin recortes toscos.
- **Selector de Tolerancia y Muestreo Táctil**: Deslizador interactivo y opción de tocar en la foto para elegir el color exacto a eliminar.
- **Plantilla Imprimible de Fotos Carnet (Formato 4x6" / 10x15 cm)**: Genera automáticamente una hoja con 6 fotos carnet alineadas y con líneas de corte para impresión física inmediata.
- **Rotación y Compartición Directa**: Rota en 90° fotos tomadas de lado y compártelas directamente por WhatsApp o descárgalas en la galería.

### 🎨 Rediseño Integral de la Interfaz (Aspecto Nativo, Cero IA Clichés)
- **Eliminación de textos promocionales**: Eliminadas todas las frases de marketing y comparativas ("Por qué este clon es superior", etc.).
- **Diseño limpio y utilitario**: Arquitectura basada en herramientas esenciales (Escanear Documento vs Estudio Foto Carnet), con paleta neutra oscura ergonómica.
- **Barra de Progreso Animada entre Procesos**: Indicador visual paso a paso con porcentaje numérico en todas las operaciones intensivas (recorte, filtros, compilación de PDF y segmentación fotográfica).

### 🔍 Correcciones y Ajustes de Precisión
- **Lupa Ergonómica de Recorte**: Reducido el aumento a 1.45x para una puntería mucho más cómoda y natural al ajustar las esquinas del papel.
- **Formato de Nombre Normalizado**: Nomenclatura oficial de archivos generados en formato `Escaneo_DD-MM-YYYY` (ej. `Escaneo_18-10-2026`).
- **Desconexión de Google Drive**: Eliminados todos los botones, modales y enlaces de Google Drive para mantener la aplicación 100% enfocada en su funcionamiento offline local.

---

## [v1.1.0] - 2026-10-18
- Modo Documento Blanco Puro manteniendo firmas y sellos a color.
- Lupa flotante en recorte y cuadrícula perspectiva 3x3.
- Selector de calidad de PDF (WhatsApp vs HD).
- Rotación rápida de 90° en pantallas clave.
- Historial de versiones y changelog interactivo.

---

## [v1.0.0] - 2026-10-14
- Lanzamiento inicial de la aplicación Android APK independiente y sin publicidad.
- Procesamiento de imagen 100% offline y local en el dispositivo con corrección de perspectiva.
- Filtros Magic Color, B&W Limpio y Grises.
- Almacenamiento local persistente en IndexedDB.
- Compartición nativa de archivos físicos adjuntos (PDF y JPG) a WhatsApp y aplicaciones móviles.
