/**
 * Deck Fill - PDF Registration Marks
 * Desenha marcas específicas para modos profissionais de impressão/corte.
 *
 * Esta primeira versão separa as guias profissionais das guias manuais.
 * Depois refinaremos dimensões e calibração conforme feedback real da gráfica.
 */

function drawCornerLMark({ doc, x, y, horizontalDirection, verticalDirection, length, thickness }) {
  doc.setFillColor(0, 0, 0);

  doc.rect(
    x,
    y,
    horizontalDirection * length,
    thickness,
    "F",
  );

  doc.rect(
    x,
    y,
    thickness,
    verticalDirection * length,
    "F",
  );
}

function drawProfessionalRegistrationMarks({ doc, layout, registration = 3 }) {
  const inset = 10;
  const length = 18;
  const thickness = 0.8;
  const squareSize = 5;

  const pageWidth = layout.pageWidth;
  const pageHeight = layout.pageHeight;

  doc.setDrawColor(0, 0, 0);
  doc.setFillColor(0, 0, 0);
  doc.setLineWidth(thickness);

  // Top-left: quadrado preto de referência.
  doc.rect(inset, inset, squareSize, squareSize, "F");

  // Top-right: marca em L.
  drawCornerLMark({
    doc,
    x: pageWidth - inset,
    y: inset,
    horizontalDirection: -1,
    verticalDirection: 1,
    length,
    thickness,
  });

  // Bottom-left: marca em L.
  drawCornerLMark({
    doc,
    x: inset,
    y: pageHeight - inset,
    horizontalDirection: 1,
    verticalDirection: -1,
    length,
    thickness,
  });

  // Opcional: padrão de 4 cantos.
  if (registration === 4) {
    drawCornerLMark({
      doc,
      x: pageWidth - inset,
      y: pageHeight - inset,
      horizontalDirection: -1,
      verticalDirection: -1,
      length,
      thickness,
    });
  }
}

window.PdfRegistrationMarks = {
  drawProfessionalRegistrationMarks,
};