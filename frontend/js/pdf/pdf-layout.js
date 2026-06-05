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
  areaX = 0,
  areaY = 0,
  areaWidth = pageWidth,
  areaHeight = pageHeight,
}) {
  const totalSpacingX = (cols - 1) * spacingX;
  const totalSpacingY = (rows - 1) * spacingY;

  const totalCardsWidth = cols * cardWidth + totalSpacingX;
  const totalCardsHeight = rows * cardHeight + totalSpacingY;

  return {
    marginX: areaX + (areaWidth - totalCardsWidth) / 2,
    marginY: areaY + (areaHeight - totalCardsHeight) / 2,
    totalCardsWidth,
    totalCardsHeight,
  };
}

function calculateManualPdfLayout(settings, resolvedSettings) {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);
  const cardWidth =
    resolvedSettings?.card?.finalWidthMm || gameConfig.cardWidthMm;
  const cardHeight =
    resolvedSettings?.card?.finalHeightMm || gameConfig.cardHeightMm;

  const spacingX = resolvedSettings?.spacing?.gapMm ?? Number.parseFloat(settings.gapSpacing) ?? 2;
  const spacingY = resolvedSettings?.spacing?.gapMm ?? Number.parseFloat(settings.gapSpacing) ?? 2;

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
    mode: "normal",
    game: selectedGame,
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

function calculateProfessionalPdfLayout(settings, resolvedSettings) {
  const pageSize = "a4";
  const orientation = "landscape";

  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  const cardWidth = gameConfig.cardWidthMm;
  const cardHeight = gameConfig.cardHeightMm;

  /**
   * Primeira versão profissional:
   * A4 landscape com 4 colunas x 2 linhas.
   *
   * Isso é inspirado no fluxo de corte profissional/Silhouette,
   * onde o layout precisa ser previsível, não auto-otimizado.
   */
  const cols = 4;
  const rows = 2;

  const spacingX = resolvedSettings?.spacing?.gapMm ?? Number.parseFloat(settings.gapSpacing) ?? 2;
  const spacingY = resolvedSettings?.spacing?.gapMm ?? Number.parseFloat(settings.gapSpacing) ?? 2;

  const finalDoc = createTempPdfForLayout(pageSize, orientation);
  const pageWidth = finalDoc.internal.pageSize.getWidth();
  const pageHeight = finalDoc.internal.pageSize.getHeight();

  const registrationMarks = {
    type: "silhouette-basic",
    registration: 3,
    insetMm: 10,
    lengthMm: 18,
    thicknessMm: 0.8,
    squareSizeMm: 5,
    };

    /**
     * Área segura inicial para o modo profissional.
     *
     * O objetivo é manter o grid das cartas longe das marcas de registro.
     * Esses valores ainda são conservadores e devem ser ajustados com feedback real
     * da gráfica/cortadora.
     */
    const safeArea = {
    x: 18,
    y: 15,
    width: pageWidth - 36,
    height: pageHeight - 30,
    };

  const margins = calculateCenteredGridMargins({
    pageWidth,
    pageHeight,
    cols,
    rows,
    cardWidth,
    cardHeight,
    spacingX,
    spacingY,
    areaX: safeArea.x,
    areaY: safeArea.y,
    areaWidth: safeArea.width,
    areaHeight: safeArea.height,
    });

  return {
    mode: "professional",
    game: selectedGame,
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
    safeArea,
    registrationMarks,
  };
}

function calculatePdfLayout(settings, resolvedSettings) {
  if (resolvedSettings?.outputMode === "professional") {
    return calculateProfessionalPdfLayout(settings, resolvedSettings);
  }

  return calculateManualPdfLayout(settings, resolvedSettings);
}

window.PdfLayout = {
  calculatePdfLayout,
};
