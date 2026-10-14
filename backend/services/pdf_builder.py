"""
Servicio para la creación y generación de documentos PDF a partir de imágenes procesadas.
Sin marcas de agua, con compresión inteligente y soporte para páginas A4 o tamaño original adaptado.
"""

import io
from typing import List
from PIL import Image
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas


def create_pdf_from_images(
    images_bytes: List[bytes],
    fit_to_a4: bool = True,
    quality: int = 88
) -> bytes:
    """
    Toma una lista de bytes de imágenes (JPEG/PNG) y genera un único archivo PDF.
    - fit_to_a4: Si es True, redimensiona y centra cada imagen en una página A4 estándar.
                 Si es False, cada página del PDF adopta exactamente las dimensiones de la imagen.
    - quality: Calidad de compresión JPEG interna para optimizar el tamaño final del archivo.
    """
    if not images_bytes:
        raise ValueError("La lista de imágenes no puede estar vacía.")

    pdf_buffer = io.BytesIO()

    if not fit_to_a4:
        # Modo adaptación directa usando Pillow
        pil_images = []
        for img_data in images_bytes:
            im = Image.open(io.BytesIO(img_data))
            if im.mode != "RGB":
                im = im.convert("RGB")
            pil_images.append(im)

        first_image = pil_images[0]
        remaining_images = pil_images[1:] if len(pil_images) > 1 else []

        first_image.save(
            pdf_buffer,
            format="PDF",
            save_all=True,
            append_images=remaining_images,
            resolution=150.0,
            quality=quality
        )
        return pdf_buffer.getvalue()

    # Modo A4 estándar usando ReportLab
    a4_width, a4_height = A4
    c = canvas.Canvas(pdf_buffer, pagesize=A4)

    for img_data in images_bytes:
        pil_img = Image.open(io.BytesIO(img_data))
        if pil_img.mode != "RGB":
            pil_img = pil_img.convert("RGB")

        img_w, img_h = pil_img.size

        # Mantener relación de aspecto dentro de la página A4 (con margen de 20pt)
        margin = 20.0
        avail_w = a4_width - (margin * 2)
        avail_h = a4_height - (margin * 2)

        scale = min(avail_w / img_w, avail_h / img_h)
        draw_w = img_w * scale
        draw_h = img_h * scale

        # Centrar en la página
        x = margin + (avail_w - draw_w) / 2.0
        y = margin + (avail_h - draw_h) / 2.0

        # Guardar en buffer temporal optimizado
        temp_img_io = io.BytesIO()
        pil_img.save(temp_img_io, format="JPEG", quality=quality, optimize=True)
        temp_img_io.seek(0)

        # Dibujar la imagen en el canvas del PDF
        from reportlab.lib.utils import ImageReader
        img_reader = ImageReader(temp_img_io)
        c.drawImage(img_reader, x, y, width=draw_w, height=draw_h)
        c.showPage()

    c.save()
    return pdf_buffer.getvalue()
