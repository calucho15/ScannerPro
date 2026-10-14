/**
 * Genera una imagen sintética en Canvas de un documento inclinado con texto y sombra
 * para que el usuario pueda probar el escaneo y recorte de inmediato.
 */
export function generateDemoDocumentBlob() {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1000;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    // Fondo oscuro (tipo mesa de madera)
    ctx.fillStyle = '#2b241e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Guardar contexto para rotación
    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((8 * Math.PI) / 180); // Inclinación de 8 grados

    const docW = 520;
    const docH = 680;

    // Sombra del documento
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fillRect(-docW / 2 + 15, -docH / 2 + 15, docW, docH);

    // Hoja blanca de papel
    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(-docW / 2, -docH / 2, docW, docH);

    // Contenido del documento
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('CONTRATO DE SERVICIOS', -docW / 2 + 50, -docH / 2 + 80);

    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('ScannerPro - Clon Sin Publicidad', -docW / 2 + 50, -docH / 2 + 120);

    ctx.fillStyle = '#475569';
    ctx.font = '15px sans-serif';
    const lines = [
      '1. Este documento de prueba simula un papel sobre una mesa.',
      '2. La aplicacion detectara automaticamente los 4 bordes del papel.',
      '3. El motor OpenCV enderezara la perspectiva y eliminara sombras.',
      '4. Puedes elegir filtros de Magic Color o Blanco y Negro Limpio.',
      '5. Exporta a PDF multipagina sin marcas de agua ni anuncios.',
      '6. Conecta directamente con tu cuenta de Google Drive.',
      '7. Comparte tus documentos con un solo toque.'
    ];

    lines.forEach((line, idx) => {
      ctx.fillText(line, -docW / 2 + 50, -docH / 2 + 180 + idx * 42);
    });

    // Simular firma al final
    ctx.strokeStyle = '#2563eb';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(-docW / 2 + 60, -docH / 2 + 540);
    ctx.bezierCurveTo(
      -docW / 2 + 100, -docH / 2 + 500,
      -docW / 2 + 150, -docH / 2 + 580,
      -docW / 2 + 220, -docH / 2 + 530
    );
    ctx.stroke();

    ctx.fillStyle = '#94a3b8';
    ctx.font = '13px sans-serif';
    ctx.fillText('Firma digital verificada', -docW / 2 + 60, -docH / 2 + 565);

    // Gradiente sutil de iluminación/sombra sobre la hoja
    const grad = ctx.createLinearGradient(-docW / 2, -docH / 2, docW / 2, docH / 2);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0.18)');
    ctx.fillStyle = grad;
    ctx.fillRect(-docW / 2, -docH / 2, docW, docH);

    ctx.restore();

    canvas.toBlob((blob) => {
      resolve(blob);
    }, 'image/jpeg', 0.95);
  });
}
