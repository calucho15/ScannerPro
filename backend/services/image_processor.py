"""
Servicio de Procesamiento de Imágenes para Clon de CamScanner
Incluye:
- Detección automática de esquinas de documentos
- Corrección de perspectiva de 4 puntos (Homografía)
- Eliminación de sombras e iluminación desigual
- Filtros de mejora: Magic Color, Blanco y Negro limpio (Adaptive Threshold), Escala de Grises y Reducción de Ruido
"""

import cv2
import numpy as np
from typing import List, Tuple, Optional


def decode_image_bytes(image_bytes: bytes) -> np.ndarray:
    """Decodifica un arreglo de bytes en una imagen OpenCV (BGR)."""
    np_arr = np.frombuffer(image_bytes, np.uint8)
    img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    if img is None:
        raise ValueError("No se pudo decodificar la imagen. Formato no válido.")
    return img


def encode_image_bytes(image: np.ndarray, format_ext: str = ".jpg", quality: int = 92) -> bytes:
    """Codifica una imagen OpenCV a bytes (JPEG o PNG)."""
    if format_ext.lower() in [".jpg", ".jpeg"]:
        params = [int(cv2.IMWRITE_JPEG_QUALITY), quality]
    elif format_ext.lower() == ".png":
        params = [int(cv2.IMWRITE_PNG_COMPRESSION), 4]
    else:
        params = []
    
    success, buffer = cv2.imencode(format_ext, image, params)
    if not success:
        raise ValueError("Error al codificar la imagen procesada.")
    return buffer.tobytes()


def order_points(pts: np.ndarray) -> np.ndarray:
    """
    Ordena 4 puntos en el orden estándar:
    [superior-izq, superior-der, inferior-der, inferior-izq]
    """
    rect = np.zeros((4, 2), dtype="float32")

    # Suma x + y: el menor es superior-izq, el mayor es inferior-der
    s = pts.sum(axis=1)
    rect[0] = pts[np.argmin(s)]
    rect[2] = pts[np.argmax(s)]

    # Diferencia y - x: el menor es superior-der, el mayor es inferior-izq
    diff = np.diff(pts, axis=1)
    rect[1] = pts[np.argmin(diff)]
    rect[3] = pts[np.argmax(diff)]

    return rect


def four_point_transform(image: np.ndarray, pts: np.ndarray) -> np.ndarray:
    """
    Aplica transformación de perspectiva dada una lista de 4 esquinas.
    Devuelve la imagen recortada y enderezada con vista perpendicular.
    """
    rect = order_points(pts)
    (tl, tr, br, bl) = rect

    # Calcular ancho máximo de la nueva imagen
    width_a = np.sqrt(((br[0] - bl[0]) ** 2) + ((br[1] - bl[1]) ** 2))
    width_b = np.sqrt(((tr[0] - tl[0]) ** 2) + ((tr[1] - tl[1]) ** 2))
    max_width = max(int(width_a), int(width_b))

    # Calcular alto máximo de la nueva imagen
    height_a = np.sqrt(((tr[0] - br[0]) ** 2) + ((tr[1] - br[1]) ** 2))
    height_b = np.sqrt(((tl[0] - bl[0]) ** 2) + ((tl[1] - bl[1]) ** 2))
    max_height = max(int(height_a), int(height_b))

    # Asegurar dimensiones mínimas
    max_width = max(max_width, 100)
    max_height = max(max_height, 100)

    # Coordenadas destino de vista de pájaro
    dst = np.array([
        [0, 0],
        [max_width - 1, 0],
        [max_width - 1, max_height - 1],
        [0, max_height - 1]
    ], dtype="float32")

    # Calcular matriz de transformación de perspectiva y aplicar
    matrix = cv2.getPerspectiveTransform(rect, dst)
    warped = cv2.warpPerspective(image, matrix, (max_width, max_height), flags=cv2.INTER_CUBIC)

    return warped


def detect_document_corners(image: np.ndarray) -> List[List[float]]:
    """
    Detecta automáticamente las 4 esquinas de una hoja o documento en la imagen.
    Si no detecta un contorno de 4 esquinas confiable, retorna un margen por defecto del 5%.
    """
    orig_h, orig_w = image.shape[:2]
    
    # Redimensionar para acelerar y estandarizar la detección de contornos
    detect_h = 800
    scale = orig_h / float(detect_h)
    detect_w = int(orig_w / scale)
    resized = cv2.resize(image, (detect_w, detect_h), interpolation=cv2.INTER_AREA)

    gray = cv2.cvtColor(resized, cv2.COLOR_BGR2GRAY)
    blurred = cv2.GaussianBlur(gray, (5, 5), 0)

    # Detector de bordes Canny + dilatación para cerrar huecos en los bordes
    edged = cv2.Canny(blurred, 50, 150)
    kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (5, 5))
    dilated = cv2.dilate(edged, kernel, iterations=1)

    # Encontrar contornos
    contours, _ = cv2.findContours(dilated, cv2.RETR_LIST, cv2.CHAIN_APPROX_SIMPLE)
    contours = sorted(contours, key=cv2.contourArea, reverse=True)[:5]

    document_contour = None
    min_area = (detect_w * detect_h) * 0.10  # Mínimo 10% del área de la imagen

    for c in contours:
        area = cv2.contourArea(c)
        if area < min_area:
            continue
        peri = cv2.arcLength(c, True)
        approx = cv2.approxPolyDP(c, 0.02 * peri, True)

        if len(approx) == 4 and cv2.isContourConvex(approx):
            document_contour = approx
            break

    if document_contour is not None:
        pts = document_contour.reshape(4, 2).astype("float32")
        pts *= scale  # Escalar de vuelta a la resolución original
        ordered = order_points(pts)
        return [[float(pt[0]), float(pt[1])] for pt in ordered]

    # Fallback: rectángulo por defecto con 5% de margen interno
    margin_x = orig_w * 0.05
    margin_y = orig_h * 0.05
    return [
        [float(margin_x), float(margin_y)],
        [float(orig_w - margin_x), float(margin_y)],
        [float(orig_w - margin_x), float(orig_h - margin_y)],
        [float(margin_x), float(orig_h - margin_y)]
    ]


def remove_shadows(image: np.ndarray) -> np.ndarray:
    """
    Elimina sombras e iluminación dispareja mediante división de fondo morfológica.
    """
    rgb_planes = cv2.split(image)
    result_planes = []
    
    for plane in rgb_planes:
        dilated_img = cv2.dilate(plane, np.ones((7, 7), np.uint8))
        bg_img = cv2.medianBlur(dilated_img, 21)
        diff_img = 255 - cv2.absdiff(plane, bg_img)
        norm_img = cv2.normalize(diff_img, None, alpha=0, beta=255, norm_type=cv2.NORM_MINMAX, dtype=cv2.CV_8UC1)
        result_planes.append(norm_img)
        
    return cv2.merge(result_planes)


def apply_filter(image: np.ndarray, filter_type: str = "magic_color") -> np.ndarray:
    """
    Aplica filtros de mejora y reducción de ruido al documento:
    - 'original': Imagen sin alterar.
    - 'magic_color': Eliminación de sombras, reducción de ruido y realce de color (estilo CamScanner).
    - 'clean_bw': Blanco y negro de alto contraste sin fondo gris (ideal para texto/impresión).
    - 'grayscale': Escala de grises con ecualización de histograma adaptativa (CLAHE).
    - 'denoise': Reducción profunda de ruido digital/grano sin cambiar colores.
    """
    filter_type = filter_type.lower()

    if filter_type == "original":
        return image

    elif filter_type == "magic_color":
        # 1. Eliminación de sombras
        no_shadows = remove_shadows(image)
        # 2. Reducción de ruido sutil
        denoised = cv2.bilateralFilter(no_shadows, d=9, sigmaColor=75, sigmaSpace=75)
        # 3. Realce de nitidez sutil
        sharpen_kernel = np.array([[-0.5, -0.5, -0.5],
                                   [-0.5,  5.0, -0.5],
                                   [-0.5, -0.5, -0.5]])
        sharpened = cv2.filter2D(denoised, -1, sharpen_kernel)
        return cv2.addWeighted(denoised, 0.4, sharpened, 0.6, 0)

    elif filter_type == "clean_bw":
        # 1. Escala de grises
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # 2. Filtro bilateral para preservar bordes del texto reduciendo grano de fondo
        blurred = cv2.bilateralFilter(gray, 9, 75, 75)
        # 3. Umbralizado adaptativo Gaussiano
        binary = cv2.adaptiveThreshold(
            blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY, 25, 12
        )
        # 4. Eliminación de motas aisladas (pequeño cierre morfológico)
        kernel = cv2.getStructuringElement(cv2.MORPH_RECT, (2, 2))
        clean = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel)
        return cv2.cvtColor(clean, cv2.COLOR_GRAY2BGR)

    elif filter_type == "grayscale":
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        # CLAHE (Contrast Limited Adaptive Histogram Equalization)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        enhanced = clahe.apply(gray)
        return cv2.cvtColor(enhanced, cv2.COLOR_GRAY2BGR)

    elif filter_type == "denoise":
        # Reducción de ruido de alta fidelidad Fast Non-Local Means
        return cv2.fastNlMeansDenoisingColored(image, None, 10, 10, 7, 21)

    else:
        return image
