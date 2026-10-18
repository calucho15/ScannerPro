# Historial de Versiones - ScannerPro

## [v1.1.0] - 2026-10-18

### 📸 Nuevas Funcionalidades
- **Modo Foto Fondo Blanco Puro (Background Removal)**:
  - Diseñado para fotografías, retratos, fotos carnet, documentos de identidad y fotos de productos.
  - Elimina el fondo de paredes o mesas y lo sustituye por blanco puro de estudio (`#FFFFFF`).
  - Incluye control deslizante de tolerancia y permite tocar cualquier punto de la foto para borrar ese tono.
- **Modo Documento Blanco Puro**:
  - Blanquea al 100% el fondo de hojas y contratos, eliminando sombras e iluminación irregular.
  - Mantiene firmas a bolígrafo azul o rojo, sellos y logos con su color original nítido.
- **Lupa Flotante de Precisión en Recorte**:
  - Al arrastrar cualquier esquina, muestra una lupa circular con aumento 2.5x y cruz de mira para encuadrar con precisión milimétrica sin que el pulgar tape el borde de la hoja.
- **Cuadrícula Perspectiva 3x3 (Regla de Tercios)**:
  - Muestra líneas guía que se adaptan a la perspectiva del documento para verificar la alineación del texto.
  - Incluye botón para mostrar u ocultar las guías rápidamente.
- **Rotación Rápida 90°**:
  - Botón directo en la pantalla de recorte y en el visor de documentos para rotar la orientación de fotos tomadas de lado.
- **Selector de Calidad de PDF**:
  - Opción *WhatsApp / Rápido (~250 KB)* para enviar en segundos por redes y datos móviles.
  - Opción *Estándar (~800 KB)* balance óptimo para correos.
  - Opción *Alta Calidad HD (~2.4 MB)* para impresión y archivo.

### ⚡ Mejoras de Rendimiento
- **Previsualización Instantánea de Filtros (< 15 ms)**:
  - Generación de miniaturas de pre-renderizado en tiempo real para que cambiar de filtro sea inmediato sin congelar la interfaz.
- **Detección Automática Real de Bordes**:
  - Algoritmo de gradiente Sobel de alta velocidad que detecta el cuadrilátero del papel sobre la mesa en menos de 10 ms.

---

## [v1.0.0] - 2026-10-14
- Lanzamiento inicial de la aplicación Android APK independiente y sin publicidad.
- Procesamiento de imagen 100% offline y local en el dispositivo con corrección de perspectiva.
- Filtros Magic Color, B&W Limpio y Grises.
- Almacenamiento local persistente en IndexedDB.
- Compartición nativa de archivos físicos adjuntos (PDF y JPG) a WhatsApp y aplicaciones móviles.
- Respaldo en la nube con Google Drive personal.
