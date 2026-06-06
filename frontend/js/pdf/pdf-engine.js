/**
 * Deck Fill - PDF Engine Module
 * Handles PDF generation with advanced layout and printing features
 */

/**
 * Gera o PDF final usando o layout resolvido, as artes selecionadas e as
 * configuracoes de acabamento escolhidas pelo usuario.
 */

function getPdfInitialStatus(gameConfig, resolvedSettings) {
  const modeLabel =
    resolvedSettings.outputMode === "professional"
      ? "impressão profissional"
      : "modo normal";

  return `Preparando PDF de ${gameConfig.shortLabel || gameConfig.label} para ${modeLabel}...`;
}

function getPdfCardProcessingStatus(selectedGame, progressPercentage) {
  if (progressPercentage < 20) {
    return "Preparando layout das páginas...";
  }

  if (progressPercentage < 75) {
    if (selectedGame === "magic") {
      return "Carregando imagens das cartas...";
    }

    return "Baixando imagens externas das cartas...";
  }

  return "Aplicando guias e configurações de impressão...";
}


async function generatePDF() {
  if (!AppState.currentCards || AppState.currentCards.length === 0) {
    showError("Nenhuma carta para gerar PDF. Processe um decklist primeiro.");
    return;
  }

  const resolvedSettings = PrintSettingsResolver.getResolvedPrintSettings();
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);
  const printableCardItems = PdfCardList.buildPrintableCardList(
    AppState.currentCards,
    resolvedSettings,
  );
  const cardsToProcess = printableCardItems.map((item) => item.card);

  if (cardsToProcess.length === 0) {
    showError("Nenhuma carta disponivel para gerar PDF.");
    return;
  }

  showProgressModal();
  updateProgress(
    2,
    getPdfInitialStatus(gameConfig, resolvedSettings),
    0,
    cardsToProcess.length,
    1,
  );

  const originalText = elements.generatePdfBtn.innerHTML;
  elements.generatePdfBtn.disabled = true;
  elements.generatePdfBtn.innerHTML = `
    <i data-lucide="loader-circle" class="animate-spin df-icon" aria-hidden="true"></i>
    <span>Gerando PDF...</span>
  `;
  AppConfig.refreshIcons?.();

  try {
    const settings = getPrintSettings();
    const activeResolvedSettings = PrintSettingsResolver.getResolvedPrintSettings();
    const isProfessionalPrint =
      activeResolvedSettings.outputMode === "professional";
    const shouldDrawManualGuides =
      Boolean(activeResolvedSettings.guides?.enabled) && !isProfessionalPrint;
    const shouldDrawProfessionalRegistrationMarks =
      isProfessionalPrint && activeResolvedSettings.cutMode === "silhouette";
    const [r, g, b] = hexToRgb(settings.guideColor);
    const layout = PdfLayout.calculatePdfLayout(settings, activeResolvedSettings);
    const doc = new window.jspdf.jsPDF({
      orientation: layout.orientation,
      unit: "mm",
      format: layout.pageSize,
    });

    const cardWidth = layout.cardWidth;
    const cardHeight = layout.cardHeight;
    const spacingX = layout.spacingX;
    const spacingY = layout.spacingY;
    const cols = layout.cols;
    const cardsPerPage = layout.cardsPerPage;
    const marginX = layout.marginX;
    const marginY = layout.marginY;
    const isDoubleFacedPrint = Boolean(settings.printDoubleFaced);
    const cardsToPrintItems = printableCardItems;
    const cardsToPrint = cardsToPrintItems.map((item) => item.card);
    const imageFailures = [];

    let currentPdfPage = 1;

    for (
      let pageIndex = 0;
      pageIndex < Math.ceil(cardsToPrint.length / cardsPerPage);
      pageIndex++
    ) {
      if (AppState.isGenerationCancelled) {
        break;
      }

      if (pageIndex > 0) {
        doc.addPage();
        currentPdfPage++;
      }

      doc.setPage(currentPdfPage);
      drawProfessionalMarksIfNeeded(
        shouldDrawProfessionalRegistrationMarks,
        doc,
        layout,
      );

      const startCardIndex = pageIndex * cardsPerPage;
      const endCardIndex = Math.min(
        startCardIndex + cardsPerPage,
        cardsToPrint.length,
      );

      for (let i = startCardIndex; i < endCardIndex; i++) {
        if (AppState.isGenerationCancelled) {
          break;
        }

        const printItem = cardsToPrintItems[i];
        const card = printItem.card;
        const progressPercentage = ((i + 1) / cardsToPrint.length) * 90;
        const currentPage = Math.ceil((i + 1) / cardsPerPage);
        const { x, y } = getCardPosition({
          indexInPage: i % cardsPerPage,
          cols,
          marginX,
          marginY,
          cardWidth,
          cardHeight,
          spacingX,
          spacingY,
        });

        updateProgress(
          progressPercentage,
          getPdfCardProcessingStatus(selectedGame, progressPercentage),
          i + 1,
          cardsToPrint.length,
          currentPage,
        );

        try {
          await drawCardImageOnPdf({
            doc,
            imageUrl: printItem.frontImageUrl,
            cardName: card.name,
            x,
            y,
            cardWidth,
            cardHeight,
            settings,
            r,
            g,
            b,
            drawCropMarks: shouldDrawManualGuides,
          });
        } catch (error) {
          imageFailures.push({ cardName: card.name, error });
          console.error(`Erro ao processar carta ${card.name}:`, error);
        }
      }

      if (isDoubleFacedPrint) {
        doc.addPage();
        currentPdfPage++;
        doc.setPage(currentPdfPage);
        drawProfessionalMarksIfNeeded(
          shouldDrawProfessionalRegistrationMarks,
          doc,
          layout,
        );

        for (let i = startCardIndex; i < endCardIndex; i++) {
          if (AppState.isGenerationCancelled) {
            break;
          }

          const printItem = cardsToPrintItems[i];
          const card = printItem.card;
          const selectedGame = AppState.getSelectedGame?.() || "magic";
          const gameConfig = GameConfigs.getGameConfig(selectedGame);
          const indexInPage = i % cardsPerPage;
          const row = Math.floor(indexInPage / cols);
          const mirroredCol = cols - 1 - (indexInPage % cols);
          const x = marginX + mirroredCol * (cardWidth + spacingX);
          const y = marginY + row * (cardHeight + spacingY);
          const backImageUrl =
            printItem.backImageUrl ||
            AppState.getGlobalCustomBackImage?.() ||
            gameConfig.defaultBackUrl ||
            window.AppConfig.MTG_BACK_URL;

          try {
            await drawCardImageOnPdf({
              doc,
              imageUrl: backImageUrl,
              cardName: `${card.name} - verso`,
              x,
              y,
              cardWidth,
              cardHeight,
              settings,
              r,
              g,
              b,
              drawCropMarks: shouldDrawManualGuides,
            });
          } catch (error) {
            imageFailures.push({ cardName: `${card.name} - verso`, error });
            console.error(`Erro ao processar verso ${card.name}:`, error);
          }
        }
      }
    }

    if (imageFailures.length > 0) {
      const failedNames = imageFailures
        .slice(0, 5)
        .map((failure) => failure.cardName)
        .join(", ");
      const extraCount =
        imageFailures.length > 5 ? ` e mais ${imageFailures.length - 5}` : "";

      throw new Error(
        `Falha ao carregar ${imageFailures.length} imagem(ns) para o PDF: ${failedNames}${extraCount}.`,
      );
    }

    updateProgress(
      100,
      "PDF finalizado. Preparando download...",
      cardsToPrint.length,
      cardsToPrint.length,
      Math.ceil(cardsToPrint.length / cardsPerPage),
    );
    await Promise.resolve(doc.save("decklist.pdf"));
  } catch (error) {
    console.error("Erro ao gerar PDF:", error);
    showError(`Erro ao gerar PDF: ${error.message || "tente novamente."}`);
  } finally {
    elements.generatePdfBtn.disabled = false;
    elements.generatePdfBtn.innerHTML = originalText;
    hideProgressModal();
  }
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);

  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [255, 255, 255];
}

function drawProfessionalMarksIfNeeded(enabled, doc, layout) {
  if (!enabled) {
    return;
  }

  PdfRegistrationMarks.drawProfessionalRegistrationMarks({ doc, layout });
}

function getCardPosition({
  indexInPage,
  cols,
  marginX,
  marginY,
  cardWidth,
  cardHeight,
  spacingX,
  spacingY,
}) {
  const col = indexInPage % cols;
  const row = Math.floor(indexInPage / cols);

  return {
    x: marginX + col * (cardWidth + spacingX),
    y: marginY + row * (cardHeight + spacingY),
  };
}
function getPdfFetchableImageUrl(imageUrl) {
  if (!imageUrl) {
    return imageUrl;
  }

  if (
    imageUrl.startsWith("data:") ||
    imageUrl.startsWith("blob:") ||
    imageUrl.includes("/image-proxy?url=")
  ) {
    return imageUrl;
  }

  try {
    const parsedUrl = new URL(imageUrl, window.location.href);
    const apiUrl = new URL(AppConfig.API_BASE, window.location.href);
    const isRemoteHttp =
      parsedUrl.protocol === "https:" || parsedUrl.protocol === "http:";
    const isApiUrl = parsedUrl.origin === apiUrl.origin;

    if (!isRemoteHttp || isApiUrl) {
      return imageUrl;
    }
  } catch (error) {
    return imageUrl;
  }

  return `${AppConfig.API_BASE}/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

async function drawCardImageOnPdf({
  doc,
  imageUrl,
  cardName,
  x,
  y,
  cardWidth,
  cardHeight,
  settings,
  r,
  g,
  b,
  drawCropMarks = true,
}) {
  if (!imageUrl) {
    throw new Error(`Carta sem imagem: ${cardName}`);
  }

  const fetchableImageUrl = getPdfFetchableImageUrl(imageUrl);

  const response = await fetchPdfImageWithFallback(fetchableImageUrl, imageUrl);

  const blob = await response.blob();

  if (!blob || blob.size === 0) {
    throw new Error(`Imagem vazia recebida para ${cardName}`);
  }

  const bleedSize =
    settings.bleed && settings.gapSpacing > 0
      ? settings.gapSpacing / 2
      : 0;

  const blackBorderSize =
    settings.blackCorners && settings.gapSpacing > 0
      ? settings.gapSpacing / 2
      : 0;

  let dataUrl;
  const isJpegBlob =
    blob.type === "image/jpeg" ||
    blob.type === "image/jpg" ||
    blob.type === "image/pjpeg";

  if (bleedSize > 0) {
    dataUrl = await processImageWithBleed(blob, bleedSize);
  } else if (!isJpegBlob) {
    dataUrl = await blobToJpegDataUrl(blob);
  } else {
    dataUrl = await blobToDataUrl(blob);
  }

  if (blackBorderSize > 0) {
    doc.setFillColor(0, 0, 0);
    doc.rect(
      x - blackBorderSize,
      y - blackBorderSize,
      cardWidth + blackBorderSize * 2,
      cardHeight + blackBorderSize * 2,
      "F",
    );

    doc.addImage(dataUrl, "JPEG", x, y, cardWidth, cardHeight);
  } else if (bleedSize > 0) {
    doc.addImage(
      dataUrl,
      "JPEG",
      x - bleedSize,
      y - bleedSize,
      cardWidth + bleedSize * 2,
      cardHeight + bleedSize * 2,
    );
  } else {
    doc.addImage(dataUrl, "JPEG", x, y, cardWidth, cardHeight);
  }

  if (settings.cropMarks && drawCropMarks) {
    drawExternalCornerGuides({
      doc,
      x,
      y,
      cardWidth,
      cardHeight,
      bleedSize,
      blackBorderSize,
      r,
      g,
      b,
    });
  }
}

function drawExternalCornerGuides({
  doc,
  x,
  y,
  cardWidth,
  cardHeight,
  bleedSize = 0,
  blackBorderSize = 0,
  r,
  g,
  b,
}) {
  const extension = Math.max(bleedSize, blackBorderSize, 0);
  const guideX = x - extension;
  const guideY = y - extension;
  const guideW = cardWidth + extension * 2;
  const guideH = cardHeight + extension * 2;
  const length = 3;
  const offset = 1.2;

  doc.setDrawColor(r, g, b);
  doc.setFillColor(r, g, b);
  doc.setLineWidth(0.12);

  const corners = [
    { x: guideX, y: guideY, hx: -1, vy: -1 },
    { x: guideX + guideW, y: guideY, hx: 1, vy: -1 },
    { x: guideX, y: guideY + guideH, hx: -1, vy: 1 },
    { x: guideX + guideW, y: guideY + guideH, hx: 1, vy: 1 },
  ];

  corners.forEach((corner) => {
    doc.line(
      corner.x + corner.hx * offset,
      corner.y,
      corner.x + corner.hx * (offset + length),
      corner.y,
    );
    doc.line(
      corner.x,
      corner.y + corner.vy * offset,
      corner.x,
      corner.y + corner.vy * (offset + length),
    );
  });
}

async function fetchPdfImageWithFallback(fetchableImageUrl, originalImageUrl) {
  try {
    const response = await fetch(fetchableImageUrl);

    if (response.ok) {
      return response;
    }

    if (fetchableImageUrl === originalImageUrl) {
      throw new Error(`HTTP ${response.status}`);
    }

    console.warn(
      `Proxy de imagem falhou (${response.status}); tentando URL original.`,
    );
  } catch (error) {
    if (fetchableImageUrl === originalImageUrl) {
      throw error;
    }

    console.warn("Proxy de imagem indisponível; tentando URL original.", error);
  }

  const directResponse = await fetch(originalImageUrl);

  if (!directResponse.ok) {
    throw new Error(`HTTP ${directResponse.status}`);
  }

  return directResponse;
}

/**
 * Converte Blob para DataURL
 */
function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

function blobToJpegDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(blob);

    image.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;

        const context = canvas.getContext("2d");
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);

        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch (error) {
        URL.revokeObjectURL(objectUrl);
        reject(error);
      }
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Failed to decode external image for PDF"));
    };

    image.src = objectUrl;
  });
}
