/**
 * Deck Fill - PDF Layout
 * Centraliza o cálculo de layout físico da impressão.
 *
 * Manual:
 * - Mantém comportamento atual de auto-fit.
 *
 * Professional:
 * - Usa preset fixo para produção/corte.
 * - Primeira versão: A4 landscape, cartas standard 63x88mm, 4x2.
 */

function createTempPdfForLayout(pageSize, orientation) {
  return new window.jspdf.jsPDF({
    format: pageSize || "a4",
    orientation,
    unit: "mm",
  });
}

function calculateCenteredGridMargins({
  pageWidth,
  pageHeight,
  cols,
  rows,
  cardWidth,
  cardHeight,
  spacingX,
  spacingY,
}) {
  const totalSpacingX = (cols - 1) * spacingX;
  const totalSpacingY = (rows - 1) * spacingY;

  const totalCardsWidth = cols * cardWidth + totalSpacingX;
  const totalCardsHeight = rows * cardHeight + totalSpacingY;

  return {
    marginX: (pageWidth - totalCardsWidth) / 2,
    marginY: (pageHeight - totalCardsHeight) / 2,
    totalCardsWidth,
    totalCardsHeight,
  };
}

function calculateManualPdfLayout(settings) {
  const scaleMultipliers = {
    small: 0.75,
    normal: 1,
    large: 1.25,
    giant: 1.5,
  };

  const scaleMult = scaleMultipliers[settings.scale] || 1;
  const cardWidth = 63 * scaleMult;
  const cardHeight = 88 * scaleMult;

  const spacingX = Number.parseFloat(settings.gapSpacing) || 0;
  const spacingY = Number.parseFloat(settings.gapSpacing) || 0;

  const tempPortrait = createTempPdfForLayout(settings.pageSize || "a4", "portrait");
  const basePageW = tempPortrait.internal.pageSize.getWidth();
  const basePageH = tempPortrait.internal.pageSize.getHeight();

  const calculateFit = (pageW, pageH) => {
    const cols = Math.floor((pageW + spacingX) / (cardWidth + spacingX));
    const rows = Math.floor((pageH + spacingY) / (cardHeight + spacingY));

    return {
      cols: Math.max(1, cols),
      rows: Math.max(1, rows),
      total: Math.max(1, cols) * Math.max(1, rows),
    };
  };

  const portraitFit = calculateFit(basePageW, basePageH);
  const landscapeFit = calculateFit(basePageH, basePageW);

  let orientation = "portrait";
  let cols = portraitFit.cols;
  let rows = portraitFit.rows;

  if (landscapeFit.total > portraitFit.total) {
    orientation = "landscape";
    cols = landscapeFit.cols;
    rows = landscapeFit.rows;
  }

  const finalDoc = createTempPdfForLayout(settings.pageSize || "a4", orientation);
  const pageWidth = finalDoc.internal.pageSize.getWidth();
  const pageHeight = finalDoc.internal.pageSize.getHeight();

  const margins = calculateCenteredGridMargins({
    pageWidth,
    pageHeight,
    cols,
    rows,
    cardWidth,
    cardHeight,
    spacingX,
    spacingY,
  });

  return {
    mode: "manual",
    pageSize: settings.pageSize || "a4",
    orientation,
    pageWidth,
    pageHeight,
    cardWidth,
    cardHeight,
    spacingX,
    spacingY,
    cols,
    rows,
    cardsPerPage: cols * rows,
    marginX: margins.marginX,
    marginY: margins.marginY,
    totalCardsWidth: margins.totalCardsWidth,
    totalCardsHeight: margins.totalCardsHeight,
  };
}

function calculateProfessionalPdfLayout(settings) {
  const pageSize = "a4";
  const orientation = "landscape";

  const cardWidth = 63;
  const cardHeight = 88;

  /**
   * Primeira versão profissional:
   * A4 landscape com 4 colunas x 2 linhas.
   *
   * Isso é inspirado no fluxo de corte profissional/Silhouette,
   * onde o layout precisa ser previsível, não auto-otimizado.
   */
  const cols = 4;
  const rows = 2;

  const spacingX = Number.parseFloat(settings.gapSpacing) || 2;
  const spacingY = Number.parseFloat(settings.gapSpacing) || 2;

  const finalDoc = createTempPdfForLayout(pageSize, orientation);
  const pageWidth = finalDoc.internal.pageSize.getWidth();
  const pageHeight = finalDoc.internal.pageSize.getHeight();

  const margins = calculateCenteredGridMargins({
    pageWidth,
    pageHeight,
    cols,
    rows,
    cardWidth,
    cardHeight,
    spacingX,
    spacingY,
  });

  return {
    mode: "professional",
    pageSize,
    orientation,
    pageWidth,
    pageHeight,
    cardWidth,
    cardHeight,
    spacingX,
    spacingY,
    cols,
    rows,
    cardsPerPage: cols * rows,
    marginX: margins.marginX,
    marginY: margins.marginY,
    totalCardsWidth: margins.totalCardsWidth,
    totalCardsHeight: margins.totalCardsHeight,
  };
}

function calculatePdfLayout(settings, resolvedSettings) {
  if (resolvedSettings?.outputMode === "professional") {
    return calculateProfessionalPdfLayout(settings);
  }

  return calculateManualPdfLayout(settings);
}

window.PdfLayout = {
  calculatePdfLayout,
};