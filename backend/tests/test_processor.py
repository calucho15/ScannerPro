"""
Pruebas automatizadas para el motor de procesamiento de imágenes y generador de PDF.
Crea una imagen sintética de prueba con texto simulado y perspectiva distorsionada,
y verifica:
- Detección de esquinas
- Transformación de perspectiva
- Filtros de reducción de ruido y realce
- Generación de PDF multipágina
"""

import os
import sys
import cv2
import numpy as np

# Asegurar que el path incluya el directorio backend
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from services.image_processor import (
    detect_document_corners,
    four_point_transform,
    apply_filter,
    encode_image_bytes,
    decode_image_bytes,
    order_points
)
from services.pdf_builder import create_pdf_from_images


def create_synthetic_test_document() -> np.ndarray:
    """Crea una imagen de 1000x800 con un documento rotado/deformado y con ruido."""
    canvas = np.full((900, 1000, 3), 60, dtype=np.uint8)  # Fondo oscuro tipo mesa

    # Crear hoja blanca con texto y gradiente de sombra
    doc_w, doc_h = 500, 700
    doc = np.full((doc_h, doc_w, 3), 245, dtype=np.uint8)

    # Añadir texto simulado
    cv2.putText(doc, "DOCUMENTO DE PRUEBA", (40, 80), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (20, 20, 20), 2)
    cv2.putText(doc, "Clon de CamScanner Sin Publicidad", (40, 130), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (50, 50, 50), 2)

    for y in range(180, 620, 35):
        cv2.line(doc, (40, y), (460, y), (80, 80, 80), 2)

    # Añadir gradiente de sombra simulada
    for y in range(doc_h):
        shadow_factor = 0.6 + 0.4 * (y / doc_h)
        doc[y, :] = (doc[y, :] * shadow_factor).astype(np.uint8)

    # Deformar hoja con perspectiva arbitraria para pegarla en la mesa
    src_pts = np.array([[0, 0], [doc_w, 0], [doc_w, doc_h], [0, doc_h]], dtype="float32")
    dst_pts = np.array([[180, 120], [840, 80], [780, 820], [120, 760]], dtype="float32")

    M = cv2.getPerspectiveTransform(src_pts, dst_pts)
    warped_doc = cv2.warpPerspective(doc, M, (1000, 900))

    # Mascara para combinar con el canvas
    mask = cv2.warpPerspective(np.ones((doc_h, doc_w), dtype=np.uint8) * 255, M, (1000, 900))
    inv_mask = cv2.bitwise_not(mask)

    canvas_bg = cv2.bitwise_and(canvas, canvas, mask=inv_mask)
    final_img = cv2.add(canvas_bg, warped_doc)

    # Añadir ruido Gaussiano para simular sensor de cámara
    noise = np.random.normal(0, 10, final_img.shape).astype(np.uint8)
    final_img = cv2.add(final_img, noise)

    return final_img


def run_tests():
    print("=== INICIANDO PRUEBAS DEL MOTOR DE ESCANEO ===")

    # 1. Crear documento sintético
    test_img = create_synthetic_test_document()
    assert test_img is not None, "Error creando imagen sintética"
    print("[OK] Imagen de prueba sintetica generada exitosamente (1000x900).")

    # 2. Deteccion de esquinas
    corners = detect_document_corners(test_img)
    assert len(corners) == 4, f"Se esperaban 4 esquinas, pero se obtuvieron {len(corners)}"
    print(f"[OK] Esquinas detectadas: {corners}")

    # 3. Transformacion de perspectiva
    pts = np.array(corners, dtype="float32")
    rectified = four_point_transform(test_img, pts)
    assert rectified.shape[0] > 100 and rectified.shape[1] > 100
    print(f"[OK] Documento enderezado exitosamente: resolucion {rectified.shape[1]}x{rectified.shape[0]}")

    # 4. Probar filtros
    filters = ["magic_color", "clean_bw", "grayscale", "denoise"]
    processed_images_bytes = []

    for f in filters:
        filtered = apply_filter(rectified, filter_type=f)
        assert filtered is not None
        assert filtered.shape[:2] == rectified.shape[:2]
        img_bytes = encode_image_bytes(filtered)
        assert len(img_bytes) > 1000
        processed_images_bytes.append(img_bytes)
        print(f"[OK] Filtro '{f}' aplicado correctamente ({len(img_bytes)} bytes).")

    # 5. Generacion de PDF multipagina
    pdf_bytes = create_pdf_from_images(processed_images_bytes, fit_to_a4=True)
    assert len(pdf_bytes) > 5000, f"Tamano del PDF anormalmente pequeno: {len(pdf_bytes)}"
    assert pdf_bytes.startswith(b"%PDF"), "El archivo generado no tiene cabecera PDF valida"
    print(f"[OK] PDF multipagina generado exitosamente ({len(pdf_bytes)} bytes) con cabecera %PDF.")

    print("\n=== TODAS LAS PRUEBAS DEL BACKEND PASARON SATISFACTORIAMENTE ===")


if __name__ == "__main__":
    run_tests()
