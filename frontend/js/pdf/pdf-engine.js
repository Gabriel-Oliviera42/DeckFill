/**
 * Deck Fill - PDF Engine Module
 * Handles PDF generation with advanced layout and printing features
 */

/**
 * Gera PDF com layout 3x3 em A4 usando dimensões MTG oficiais (63x88mm)
 *
 * Arquitetura de geração:
 * - Sistema de DUAS PASSADAS para otimizar desenho de marcas de corte
 * - Passada 1: Coleta de coordenadas para desenhar background lines
 * - Passada 2: Desenho completo (background lines + cartas + elementos)
 *
 * @returns {Promise<void>}
 */

function getPdfInitialStatus(gameConfig, resolvedSettings) {
  const modeLabel =
    resolvedSettings.outputMode === "professional"
      ? "impressão profissional"
      : "impressão manual";

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

function getPdfBackProcessingStatus(selectedGame) {
  if (selectedGame === "magic") {
    return "Montando páginas de verso...";
  }

  return "Montando páginas de verso e aplicando verso padrão do jogo...";
}

async function generatePDF() {
  // === VALIDAÇÃO INICIAL ===
  if (!AppState.currentCards || AppState.currentCards.length === 0) {
    showError("Nenhuma carta para gerar PDF. Processe um decklist primeiro.");
    return;
  }

  // === FILTRAGEM DE TERRENOS BÁSICOS ===
  const resolvedSettings = PrintSettingsResolver.getResolvedPrintSettings();
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  const printableCardItems = PdfCardList.buildPrintableCardList(
    AppState.currentCards,
    resolvedSettings,
  );

  const cardsToProcess = printableCardItems.map((item) => item.card);

  if (cardsToProcess.length === 0) {
    showError("Nenhuma carta disponível para gerar PDF.");
    return;
  }

  // === ESTADO DA INTERFACE ===
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
        <svg class="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Gerando PDF...</span>
    `;

  try {
    // === SISTEMA DE DEBUG AVANÇADO ===
    console.group("🎨 Deck Fill - Geração de PDF Iniciada");
    console.log("📊 Iniciando geração de PDF...");

    // === CAPTURA DE CONFIGURAÇÕES ===
    const settings = getPrintSettings();
    console.log("⚙️ Configurações de Impressão Detectadas:", settings);
    const activeResolvedSettings = PrintSettingsResolver.getResolvedPrintSettings();
    const isProfessionalPrint =
      activeResolvedSettings.outputMode === "professional";

    const shouldDrawManualGuides =
      settings.cropMarks && !isProfessionalPrint;

    const shouldDrawProfessionalRegistrationMarks =
      isProfessionalPrint && activeResolvedSettings.cutMode === "silhouette";
    console.log("🩸 Status da Sangria:", settings.bleed);
    console.log("✂️ Status das Marcas de Corte:", settings.cropMarks);
    console.log("⚫ Status das Bordas Pretas:", settings.blackCorners);

    // === UTILITÁRIOS DE COR ===
    // Função auxiliar para converter HEX para RGB (usada para marcas de corte)
    const hex2rgb = (hex) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result
        ? [
            parseInt(result[1], 16),
            parseInt(result[2], 16),
            parseInt(result[3], 16),
          ]
        : [255, 255, 255];
    };

    // Converter cor das guias para RGB (variáveis globais da função)
    const [r, g, b] = hex2rgb(settings.guideColor);

    // === INICIALIZAÇÃO DO JSPDF ===
    const { jsPDF } = window.jspdf;

    // === CÁLCULO DE LAYOUT DO PDF ===
    const layout = PdfLayout.calculatePdfLayout(settings, activeResolvedSettings);

    const cardWidth = layout.cardWidth;
    const cardHeight = layout.cardHeight;
    const spacingX = layout.spacingX;
    const spacingY = layout.spacingY;
    const bestOrientation = layout.orientation;
    const cols = layout.cols;
    const rows = layout.rows;
    const cardsPerPage = layout.cardsPerPage;

    console.log("📐 Layout calculado:", layout);

    // === CRIAÇÃO DO DOCUMENTO JSPDF FINAL ===
    // Inicializa o documento oficial com a melhor orientação encontrada
    const doc = new window.jspdf.jsPDF({
      orientation: layout.orientation,
      unit: "mm",
      format: layout.pageSize,
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === CÁLCULO DE MARGENS E CENTRALIZAÇÃO ===
    const marginX = layout.marginX;
    const marginY = layout.marginY;
    const totalCardsWidth = layout.totalCardsWidth;
    const totalCardsHeight = layout.totalCardsHeight;

    console.log(`📐 Layout: ${cols}x${rows}, ${cardsPerPage} cartas/página`);
    console.log(
      `📏 Margens: X=${marginX.toFixed(1)}mm, Y=${marginY.toFixed(1)}mm`,
    );
    console.log(`🃏 Processando ${printableCardItems.length} cartas...`);

    // ================================================================================
    // LISTA FINAL DE CARTAS PARA IMPRESSÃO
    // ================================================================================
    console.group("🃏 Lista de Cartas para Impressão");

    const isDoubleFacedPrint = Boolean(settings.printDoubleFaced);

    const cardsToPrintItems = printableCardItems;
    const cardsToPrint = cardsToPrintItems.map((item) => item.card);

    console.log("🔧 Modo dupla face:", isDoubleFacedPrint);
    console.log(`🃏 Cartas imprimíveis: ${cardsToPrint.length}`);
    console.table(
      cardsToPrintItems.map((item, index) => ({
        printIndex: index,
        originalIndex: item.originalIndex,
        name: item.card.name,
        isDoubleFaced: item.isDoubleFaced,
        hasFront: Boolean(item.frontImageUrl),
        hasBack: Boolean(item.backImageUrl),
      })),
    );

    console.groupEnd();

    // ================================================================================
    // PASSADA 1: COLETA DE COORDENADAS PARA BACKGROUND LINES
    // ================================================================================
    console.group("🔍 Passada 1: Coleta de Coordenadas para Background Lines");

    // Coleta de coordenadas por página para desenhar linhas de fundo
    const pageCoordinates = new Map(); // pageIndex -> {xCoords: Set, yCoords: Set}

    for (let i = 0; i < cardsToPrint.length; i++) {
      if (AppState.isGenerationCancelled) {
        break;
      }

      const cardIndex = i;
      const pageIndex = Math.floor(cardIndex / cardsPerPage);
      const cardIndexInPage = cardIndex % cardsPerPage;

      // Calcular coordenadas
      const col = cardIndexInPage % cols;
      const row = Math.floor(cardIndexInPage / cols);
      const x = marginX + col * (cardWidth + spacingX);
      const y = marginY + row * (cardHeight + spacingY);

      // Inicializar coordenadas da página se não existirem
      if (!pageCoordinates.has(pageIndex)) {
        pageCoordinates.set(pageIndex, {
          xCoords: new Set(),
          yCoords: new Set(),
        });
      }

      const coords = pageCoordinates.get(pageIndex);

      // Adicionar coordenadas das bordas da carta (onde as linhas devem passar)
      coords.xCoords.add(x); // Borda esquerda
      coords.xCoords.add(x + cardWidth); // Borda direita
      coords.yCoords.add(y); // Borda superior
      coords.yCoords.add(y + cardHeight); // Borda inferior

      console.log(
        `📍 Carta ${i + 1}: Página ${pageIndex + 1}, Coords (${x.toFixed(1)}, ${y.toFixed(1)})`,
      );
    }

    console.log(
      `📊 Coordenadas coletadas para ${pageCoordinates.size} páginas`,
    );
    console.groupEnd();

    // ================================================================================
    // PASSADA 2: DESENHO DE PÁGINAS COMPLETAS (Background Lines + Cartas + Elementos)
    // ================================================================================
    console.group("🎨 Passada 2: Desenho de Páginas Completas");

    let currentPdfPage = 1;

    for (
      let pageIndex = 0;
      pageIndex < Math.ceil(cardsToPrint.length / cardsPerPage);
      pageIndex++
    ) {
      if (AppState.isGenerationCancelled) {
        break;
      }

      console.log(
        `📄 Processando Página ${pageIndex + 1}/${Math.ceil(cardsToPrint.length / cardsPerPage)}`,
      );

      // === NAVEGAÇÃO DE PÁGINAS ===
      if (pageIndex > 0) {
        doc.addPage();
        currentPdfPage++;
      }
      doc.setPage(currentPdfPage);
      console.log(`🎯 Página ativa frente: ${currentPdfPage}`);

      if (shouldDrawProfessionalRegistrationMarks) {
        PdfRegistrationMarks.drawProfessionalRegistrationMarks({
          doc,
          layout,
        });
      }

      // === DESENHO DAS BACKGROUND LINES (SE ATIVADO) ===
      if (shouldDrawManualGuides && pageCoordinates.has(pageIndex)) {
        console.log("✂️ Desenhando Background Lines...");
        const coords = pageCoordinates.get(pageIndex);

        // Resetar cor para cor do usuário
        doc.setDrawColor(r, g, b);
        doc.setLineWidth(0.1);

        // Desenhar linhas horizontais (atravessam a página inteira)
        for (const y of coords.yCoords) {
          doc.line(0, y, pageWidth, y); // De ponta a ponta
          console.log(`➖ Linha horizontal em y=${y.toFixed(1)}mm`);
        }

        // Desenhar linhas verticais (atravessam a página inteira)
        for (const x of coords.xCoords) {
          doc.line(x, 0, x, pageHeight); // De ponta a ponta
          console.log(`| Linha vertical em x=${x.toFixed(1)}mm`);
        }
      }

      // === DESENHO DAS CARTAS DESTA PÁGINA ===
      const startCardIndex = pageIndex * cardsPerPage;
      const endCardIndex = Math.min(
        startCardIndex + cardsPerPage,
        cardsToPrint.length,
      );

      console.log(
        `🃏 Desenhando cartas ${startCardIndex + 1}-${endCardIndex} da página ${pageIndex + 1}`,
      );

      // A. PRIMEIRO LOOP: DESENHA AS FRENTES NA PÁGINA ATUAL
      for (let i = startCardIndex; i < endCardIndex; i++) {
        if (AppState.isGenerationCancelled) {
          break;
        }
        const printItem = cardsToPrintItems[i];
        const card = printItem.card;

        // === ATUALIZAÇÃO DE PROGRESSO ===
        const progressPercentage = ((i + 1) / cardsToPrint.length) * 90;
        const currentPage = Math.ceil((i + 1) / cardsPerPage);
        updateProgress(
          progressPercentage,
          getPdfCardProcessingStatus(selectedGame, progressPercentage),
          i + 1,
          cardsToPrint.length,
          currentPage,
        );

        // Lógica normal: calcula X, Y sem espelhar, pega a imageUrl da FRENTE
        const imageUrl = printItem.frontImageUrl;
        const cardIndexInPage = i % cardsPerPage;
        const col = cardIndexInPage % cols;
        const row = Math.floor(cardIndexInPage / cols);
        const x = marginX + col * (cardWidth + spacingX);
        const y = marginY + row * (cardHeight + spacingY);

        // === BUSCA E PROCESSAMENTO DE IMAGEM ===
        try {
          const isCustom = AppState.customImages.has(printItem.originalIndex);

          console.log(
            `🔄 Desenhando frente da carta: ${card.name} ${isCustom ? "(📸 Personalizada)" : "(🌐 Original)"}`,
          );

          await drawCardImageOnPdf({
            doc,
            imageUrl,
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
          console.error(`❌ Erro ao processar carta ${card.name}:`, error);
        }
      }

      // B. SE FOR DUPLA FACE: CRIA NOVA PÁGINA E DESENHA OS VERSOS
      if (isDoubleFacedPrint) {
        console.log(`📄 Criando página de versos para página ${pageIndex + 1}`);
        doc.addPage();
        currentPdfPage++;
        doc.setPage(currentPdfPage);
        console.log(`🎯 Página ativa verso: ${currentPdfPage}`);
        if (shouldDrawProfessionalRegistrationMarks) {
          PdfRegistrationMarks.drawProfessionalRegistrationMarks({
            doc,
            layout,
          });
        }

        // ATENÇÃO: Redesenhe as marcas de corte/sangria nesta nova página se estiverem ativadas
        if (shouldDrawManualGuides && pageCoordinates.has(pageIndex)) {
          console.log("✂️ Desenhando Background Lines na página de versos...");
          const coords = pageCoordinates.get(pageIndex);

          // Resetar cor para cor do usuário
          doc.setDrawColor(r, g, b);
          doc.setLineWidth(0.1);

          // Desenhar linhas horizontais (atravessam a página inteira)
          for (const y of coords.yCoords) {
            doc.line(0, y, pageWidth, y);
            console.log(`➖ Linha horizontal verso em y=${y.toFixed(1)}mm`);
          }

          // Desenhar linhas verticais (atravessam a página inteira)
          for (const x of coords.xCoords) {
            doc.line(x, 0, x, pageHeight);
            console.log(`| Linha vertical verso em x=${x.toFixed(1)}mm`);
          }
        }

        // SEGUNDO LOOP: DESENHA OS VERSOS
        for (let i = startCardIndex; i < endCardIndex; i++) {
          if (AppState.isGenerationCancelled) {
            break;
          }
          const printItem = cardsToPrintItems[i];
          const card = printItem.card;

          console.log(`🔄 Desenhando verso espelhado: ${card.name}`);

          // Cálculo das coordenadas espelhadas
          const cardIndexInPage = i % cardsPerPage;
          const row = Math.floor(cardIndexInPage / cols);
          const colFrente = cardIndexInPage % cols;

          // Espelhamento matemático
          const colVerso = cols - 1 - colFrente;
          const x = marginX + colVerso * (cardWidth + spacingX);
          const y = marginY + row * (cardHeight + spacingY);

          const selectedGame = AppState.getSelectedGame?.() || "magic";
          const gameConfig = GameConfigs.getGameConfig(selectedGame);
          // Define a imagem do verso (Prioridade: 1º DFC Nativo, 2º Custom, 3º Padrão MTG)
          let backImageUrl =
            printItem.backImageUrl ||
            AppState.getGlobalCustomBackImage?.() ||
            gameConfig.defaultBackUrl ||
            window.AppConfig.MTG_BACK_URL;

          console.log(`🔄 Verso resolvido para: ${card.name}`);

          // Lógica de desenhar a imagem do verso
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
            console.error(`❌ Erro ao processar verso ${card.name}:`, error);
          }
        }
      }
    }

    console.groupEnd(); // Fecha o grupo da Passada 2

    // === SALVAMENTO DO PDF ===
    console.log("💾 Salvando PDF...");
    updateProgress(
      100,
      "PDF finalizado. Preparando download...",
      cardsToPrint.length,
      cardsToPrint.length,
      Math.ceil(cardsToPrint.length / cardsPerPage),
    );
    doc.save("decklist.pdf");

    console.log("✅ PDF gerado com sucesso!");
    console.groupEnd(); // Fecha o grupo principal da geração de PDF
  } catch (error) {
    console.error("❌ Erro ao gerar PDF:", error);
    console.groupEnd(); // Garante que o grupo seja fechado mesmo em erro
    showError("Erro ao gerar PDF. Tente novamente.");
  } finally {
    // === RESTAURAÇÃO DO ESTADO ===
    console.log("🔄 Restaurando estado da interface...");

    // Restaurar estado do botão
    elements.generatePdfBtn.disabled = false;
    elements.generatePdfBtn.innerHTML = originalText;

    // Garantir que o modal de progresso sempre suma
    hideProgressModal();

    console.log("🏁 Geração de PDF finalizada");
  }
}

function getPdfFetchableImageUrl(imageUrl) {
  if (!imageUrl) {
    return imageUrl;
  }

  const shouldProxy =
    imageUrl.includes("images.ygoprodeck.com") ||
    imageUrl.includes("images.pokemontcg.io") ||
    imageUrl.includes("images.scrydex.com") ||
    imageUrl.includes("cards.scryfall.io") ||
    imageUrl.includes("i.postimg.cc") ||
    imageUrl.includes("upload.wikimedia.org");

  if (!shouldProxy) {
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
    console.warn(`⚠️ Carta sem imagem: ${cardName}`);
    return;
  }

  const fetchableImageUrl = getPdfFetchableImageUrl(imageUrl);

  console.log(`🌐 Fazendo fetch da imagem: ${fetchableImageUrl}`);

  const response = await fetch(fetchableImageUrl);

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  console.log(`✅ Download bem-sucedido: ${cardName}`);

  const blob = await response.blob();

  const bleedSize =
    settings.bleed && settings.gapSpacing > 0
      ? settings.gapSpacing / 2
      : 0;

  const blackBorderSize =
    settings.blackCorners && settings.gapSpacing > 0
      ? settings.gapSpacing / 2
      : 0;

  let dataUrl;

  if (bleedSize > 0) {
    console.log(`🩸 Aplicando sangria de ${bleedSize}mm em: ${cardName}`);
    dataUrl = await processImageWithBleed(blob, bleedSize);
  } else {
    console.log(`🖼️ Processando imagem normal: ${cardName}`);
    dataUrl = await blobToDataUrl(blob);
  }

  if (blackBorderSize > 0) {
    console.log(`⚫ Desenhando borda preta de ${blackBorderSize}mm em: ${cardName}`);

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
    console.log(`🩸 Desenhando carta com sangria: ${cardName}`);

    doc.addImage(
      dataUrl,
      "JPEG",
      x - bleedSize,
      y - bleedSize,
      cardWidth + bleedSize * 2,
      cardHeight + bleedSize * 2,
    );
  } else {
    console.log(`🖼️ Desenhando carta normal: ${cardName}`);
    doc.addImage(dataUrl, "JPEG", x, y, cardWidth, cardHeight);
  }

  if (settings.cropMarks && drawCropMarks) {
    const c = 2;

    doc.setDrawColor(r, g, b);
    doc.setFillColor(r, g, b);
    doc.setLineWidth(0.1);

    const drawCross = (cx, cy) => {
      doc.line(cx - c, cy, cx + c, cy);
      doc.line(cx, cy - c, cx, cy + c);
    };

    drawCross(x, y);
    drawCross(x + cardWidth, y);
    drawCross(x, y + cardHeight);
    drawCross(x + cardWidth, y + cardHeight);
  }
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
