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
async function generatePDF() {
  // === VALIDAÇÃO INICIAL ===
  if (!AppState.currentCards || AppState.currentCards.length === 0) {
    showError("Nenhuma carta para gerar PDF. Processe um decklist primeiro.");
    return;
  }

  // === FILTRAGEM DE TERRENOS BÁSICOS ===
  let cardsToProcess = [...AppState.currentCards];
  if (elements.skipBasicLands && elements.skipBasicLands.checked) {
    const basicLands = [
      "Plains",
      "Island",
      "Swamp",
      "Mountain",
      "Forest",
      "Wastes",
    ];
    const originalCount = cardsToProcess.length;
    cardsToProcess = cardsToProcess.filter(
      (card) => !basicLands.includes(card.name),
    );
    const filteredCount = originalCount - cardsToProcess.length;
    if (filteredCount > 0) {
      console.log(`🏔️ Filtrados ${filteredCount} terrenos básicos do PDF`);
    }
  }

  // === ESTADO DA INTERFACE ===
  showProgressModal();

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

    // === CÁLCULO DE DIMENSÕES DAS CARTAS ===
    // Mapeamento de escala: small(75%), normal(100%), large(125%), giant(150%)
    const scaleMultipliers = {
      small: 0.75,
      normal: 1,
      large: 1.25,
      giant: 1.5,
    };
    const scaleMult = scaleMultipliers[settings.scale] || 1;
    const cardWidth = 63 * scaleMult; // Base: 63mm (dimensão MTG oficial)
    const cardHeight = 88 * scaleMult; // Base: 88mm (dimensão MTG oficial)

    // === CÁLCULO DE ESPAÇAMENTO (GAP) ===
    // Gap é o espaço entre as cartas para facilitar corte
    const spacingX = parseFloat(settings.gapSpacing) || 0;
    const spacingY = parseFloat(settings.gapSpacing) || 0;

    // === OBTENÇÃO DE DIMENSÕES DA FOLHA ===
    // Cria documento temporário apenas para ler dimensões reais do formato selecionado
    const tempDoc = new window.jspdf.jsPDF({
      format: settings.pageSize || "a4",
      orientation: "portrait",
      unit: "mm",
    });
    const basePageW = tempDoc.internal.pageSize.getWidth();
    const basePageH = tempDoc.internal.pageSize.getHeight();

    // === FUNÇÃO DE OTIMIZAÇÃO DE LAYOUT ===
    // Calcula quantas cartas cabem na página considerando o gap
    const calculateFit = (pageW, pageH) => {
      const cols = Math.floor((pageW + spacingX) / (cardWidth + spacingX));
      const rows = Math.floor((pageH + spacingY) / (cardHeight + spacingY));
      return {
        cols: Math.max(1, cols),
        rows: Math.max(1, rows),
        total: cols * rows,
      };
    };

    // === OTIMIZAÇÃO DE ORIENTAÇÃO ===
    // Testa qual orientação (retrato vs paisagem) comporta mais cartas
    const portraitFit = calculateFit(basePageW, basePageH);
    const landscapeFit = calculateFit(basePageH, basePageW);

    // === ESCOLHA DA MELHOR ORIENTAÇÃO ===
    let bestOrientation = "portrait";
    let cols = portraitFit.cols;
    let rows = portraitFit.rows;

    if (landscapeFit.total > portraitFit.total) {
      bestOrientation = "landscape";
      cols = landscapeFit.cols;
      rows = landscapeFit.rows;
    }

    const cardsPerPage = cols * rows;

    // === CRIAÇÃO DO DOCUMENTO JSPDF FINAL ===
    // Inicializa o documento oficial com a melhor orientação encontrada
    const doc = new window.jspdf.jsPDF({
      orientation: bestOrientation,
      unit: "mm",
      format: settings.pageSize || "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // === CÁLCULO DE MARGENS E CENTRALIZAÇÃO ===
    // Calcular o espaço total consumido pelos gaps (ex: 3 colunas têm 2 gaps entre elas)
    const totalSpacingX = (cols - 1) * spacingX;
    const totalSpacingY = (rows - 1) * spacingY;

    // Calcular a largura e altura REAIS do grid inteiro
    const totalCardsWidth = cols * cardWidth + totalSpacingX;
    const totalCardsHeight = rows * cardHeight + totalSpacingY;

    // Recalcular as margens perfeitas para centralizar tudo
    const marginX = (pageWidth - totalCardsWidth) / 2;
    const marginY = (pageHeight - totalCardsHeight) / 2;

    console.log(`📐 Layout: ${cols}x${rows}, ${cardsPerPage} cartas/página`);
    console.log(
      `📏 Margens: X=${marginX.toFixed(1)}mm, Y=${marginY.toFixed(1)}mm`,
    );
    console.log(`🃏 Processando ${cardsToProcess.length} cartas...`);

    // ================================================================================
    // LÓGICA DE IMPRESSÃO DUPLA FACE
    // ================================================================================
    console.group("🔄 Impressão Dupla Face");

    // Verificar status do switch de dupla-face
    const isDoubleFacedPrint =
      document.getElementById("print-double-faced").checked;
    const globalBackType =
      document.getElementById("global-back-type")?.value || "mtg-back";
    console.log("🔧 Switch Imprimir Dupla Face:", isDoubleFacedPrint);
    console.log("🔧 Tipo de Verso Global:", globalBackType);

    // Criar array de cartas para impressão
    const cardsToPrint = [];

    // Array de terrenos básicos para filtro (normalizado para minúsculas)
    const basicLands = [
      "plains",
      "island",
      "swamp",
      "mountain",
      "forest",
      "snow-covered plains",
      "snow-covered island",
      "snow-covered swamp",
      "snow-covered mountain",
      "snow-covered forest",
      "wastes",
    ];

    let skipBasicLands = false;
    try {
      // Tenta pegar via app global
      const printSettings = window.deckFillApp?.getPrintSettings();
      if (
        printSettings &&
        typeof printSettings.skipBasicLands !== "undefined"
      ) {
        skipBasicLands = printSettings.skipBasicLands;
      } else {
        // Fallback blindado: lê direto do DOM
        const cb = document.getElementById("skip-basic-lands");
        if (cb) skipBasicLands = cb.checked;
      }
    } catch (e) {
      console.error("Erro ao ler checkbox de terrenos:", e);
    }

    console.log(
      `Filtro de Terrenos Básicos: ${skipBasicLands ? "ATIVADO" : "DESATIVADO"}`,
    );

    if (isDoubleFacedPrint) {
      // MODO DUPLO: Não duplicar DFCs, usar apenas as cartas originais
      for (const card of cardsToProcess) {
        // Normalizar nome da carta para comparação
        const normalizedName = card.name.trim().toLowerCase();

        // Log de investigação extrema
        console.warn(
          "GERANDO PDF -> Skip Lands está:",
          skipBasicLands,
          " | Avaliando carta:",
          card.name,
          " | Normalizado:",
          normalizedName,
        );

        // Pular terrenos básicos se o filtro estiver ativo
        if (skipBasicLands && basicLands.includes(normalizedName)) {
          console.log(`✅ IGNORANDO terreno básico: ${card.name}`);
          continue;
        }
        console.log(`➡️ ADICIONANDO carta: ${card.name}`);
        cardsToPrint.push(card);
      }
      console.log(
        `Modo Duplo Face: ${cardsToPrint.length} cartas (sem duplicação)`,
      );
    } else {
      // MODO NORMAL: Duplicar DFCs como versos separados
      for (let i = 0; i < cardsToProcess.length; i++) {
        const card = cardsToProcess[i];

        // Normalizar nome da carta para comparação
        const normalizedName = card.name.trim().toLowerCase();

        // Log de investigação extrema
        console.warn(
          "GERANDO PDF -> Skip Lands está:",
          skipBasicLands,
          " | Avaliando carta:",
          card.name,
          " | Normalizado:",
          normalizedName,
        );

        // Pular terrenos básicos se o filtro estiver ativo
        if (skipBasicLands && basicLands.includes(normalizedName)) {
          console.log(`✅ IGNORANDO terreno básico: ${card.name}`);
          continue;
        }

        console.log(`➡️ ADICIONANDO carta: ${card.name}`);
        cardsToPrint.push(card);

        // Se for DFC, duplicar para o verso
        if (card.image_uri_back_normal || card.image_uri_back_png) {
          console.log(`Duplicando DFC: ${card.name}`);
          const backCard = { ...card };
          backCard.image_uri_normal =
            card.image_uri_back_normal || card.image_uri_png;
          backCard.image_uri_png =
            card.image_uri_back_png || card.image_uri_normal;
          cardsToPrint.push(backCard);
        }
      }
      console.log(
        `Modo Normal: ${cardsToPrint.length} cartas (com duplicação)`,
      );
    }
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
      pageIndex < Math.ceil(cardsToProcess.length / cardsPerPage);
      pageIndex++
    ) {
      if (AppState.isGenerationCancelled) {
        break;
      }

      console.log(
        `📄 Processando Página ${pageIndex + 1}/${Math.ceil(cardsToProcess.length / cardsPerPage)}`,
      );

      // === NAVEGAÇÃO DE PÁGINAS ===
      if (pageIndex > 0) {
        doc.addPage();
        currentPdfPage++;
      }
      doc.setPage(currentPdfPage);
      console.log(`🎯 Página ativa frente: ${currentPdfPage}`);

      // === DESENHO DAS BACKGROUND LINES (SE ATIVADO) ===
      if (settings.cropMarks && pageCoordinates.has(pageIndex)) {
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
        const card = cardsToPrint[i];

        // === ATUALIZAÇÃO DE PROGRESSO ===
        const progressPercentage = ((i + 1) / cardsToPrint.length) * 90;
        const currentPage = pageIndex + 1;
        updateProgress(
          progressPercentage,
          "Baixando imagens...",
          i + 1,
          cardsToProcess.length,
          cardsToProcess.length,
          Math.ceil(cardsToProcess.length / cardsPerPage),
        );

        // Lógica normal: calcula X, Y sem espelhar, pega a imageUrl da FRENTE
        const imageUrl = getCardImageUrl(i, card);
        const cardIndexInPage = i % cardsPerPage;
        const col = cardIndexInPage % cols;
        const row = Math.floor(cardIndexInPage / cols);
        const x = marginX + col * (cardWidth + spacingX);
        const y = marginY + row * (cardHeight + spacingY);

        // === BUSCA E PROCESSAMENTO DE IMAGEM ===
        try {
          if (!imageUrl) {
            console.warn(`⚠️ Carta sem imagem: ${card.name}`);
            continue;
          }

          // Verificar se é imagem personalizada para log apropriado
          const isCustom = AppState.customImages.has(i);
          console.log(
            `🔄 Baixando imagem da carta: ${card.name} ${isCustom ? "(📸 Personalizada)" : "(🌐 Original)"}`,
          );

          // === FETCH DA IMAGEM ===
          console.log(`🌐 Fazendo fetch da imagem: ${imageUrl}`);
          const response = await fetch(imageUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
          }
          console.log(`✅ Download bem-sucedido: ${card.name}`);

          // === CONVERSÃO PARA BLOB ===
          const blob = await response.blob();

          // === CÁLCULO DE DIMENSÕES ESPECIAIS ===
          // O tamanho da sangria é exatamente metade do gap (se ativado)
          const bleedSize =
            settings.bleed && settings.gapSpacing > 0
              ? settings.gapSpacing / 2
              : 0;

          // O tamanho da borda preta é exatamente metade do gap (se ativado)
          const blackBorderSize =
            settings.blackCorners && settings.gapSpacing > 0
              ? settings.gapSpacing / 2
              : 0;

          // === PROCESSAMENTO DE IMAGEM ===
          let dataUrl;
          if (bleedSize > 0) {
            console.log(`🩸 Aplicando sangria de ${bleedSize}mm`);
            dataUrl = await processImageWithBleed(blob, bleedSize);
          } else {
            console.log(`🖼️ Processando imagem normal`);
            dataUrl = await blobToDataUrl(blob);
          }

          // === DESENHO DE ELEMENTOS VISUAIS ===
          // Lógica clara para os três cenários: Borda Preta vs Sangria vs Normal
          if (blackBorderSize > 0) {
            // === CENÁRIO 1: BORDA PRETA ===
            // Fundo preto + carta normal no centro (gap preenchido)
            console.log(`⚫ Desenhando borda preta de ${blackBorderSize}mm`);
            doc.setFillColor(0, 0, 0); // Preto
            doc.rect(
              x - blackBorderSize,
              y - blackBorderSize,
              cardWidth + blackBorderSize * 2,
              cardHeight + blackBorderSize * 2,
              "F",
            );
            // Carta no tamanho normal, centralizada no retângulo preto
            doc.addImage(dataUrl, "JPEG", x, y, cardWidth, cardHeight);
          } else if (bleedSize > 0) {
            // === CENÁRIO 2: SANGRIA (BLEED) ===
            // Carta esticada para preencher o gap (extensão da arte)
            console.log(`🩸 Desenhando carta com sangria`);
            doc.addImage(
              dataUrl,
              "JPEG",
              x - bleedSize,
              y - bleedSize,
              cardWidth + bleedSize * 2,
              cardHeight + bleedSize * 2,
            );
          } else {
            // === CENÁRIO 3: NORMAL ===
            // Carta no tamanho original sem esticar
            console.log(`🖼️ Desenhando carta normal`);
            doc.addImage(dataUrl, "JPEG", x, y, cardWidth, cardHeight);
          }

          // === CRUZES DE CORTE (FOREGROUND CROSSES) ===
          // Desenha 4 cruzes nos cantos de cada carta para guia de corte
          if (settings.cropMarks) {
            console.log(`✂️ Desenhando cruzes de corte para: ${card.name}`);
            const c = 2; // Tamanho da haste da cruz em mm

            // === RESET DE CORES (ANTI-STATE LEAKAGE) ===
            // Importante: Resetar cores para evitar vazamento da Borda Preta
            doc.setDrawColor(r, g, b); // Reset cor de desenho para cor do usuário
            doc.setFillColor(r, g, b); // Reset cor de preenchimento
            doc.setLineWidth(0.1); // Linha fina

            // === FUNÇÃO DE DESENHO DE CRUZ ===
            const drawCross = (cx, cy) => {
              doc.line(cx - c, cy, cx + c, cy); // Horizontal
              doc.line(cx, cy - c, cx, cy + c); // Vertical
            };

            // === DESENHAR AS 4 CRUZES ===
            drawCross(x, y); // Superior Esquerdo
            drawCross(x + cardWidth, y); // Superior Direito
            drawCross(x, y + cardHeight); // Inferior Esquerdo
            drawCross(x + cardWidth, y + cardHeight); // Inferior Direito
          }
        } catch (error) {
          console.error(`❌ Erro ao processar carta ${card.name}:`, error);
          // Continuar com as próximas cartas mesmo se esta falhar
        }
      }

      // B. SE FOR DUPLA FACE: CRIA NOVA PÁGINA E DESENHA OS VERSOS
      if (isDoubleFacedPrint) {
        console.log(`📄 Criando página de versos para página ${pageIndex + 1}`);
        doc.addPage();
        currentPdfPage++;
        doc.setPage(currentPdfPage);
        console.log(`🎯 Página ativa verso: ${currentPdfPage}`);

        // ATENÇÃO: Redesenhe as marcas de corte/sangria nesta nova página se estiverem ativadas
        if (settings.cropMarks && pageCoordinates.has(pageIndex)) {
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
          const card = cardsToPrint[i];

          console.log(`🔄 Desenhando verso espelhado: ${card.name}`);

          // Cálculo das coordenadas espelhadas
          const cardIndexInPage = i % cardsPerPage;
          const row = Math.floor(cardIndexInPage / cols);
          const colFrente = cardIndexInPage % cols;

          // Espelhamento matemático
          const colVerso = cols - 1 - colFrente;
          const x = marginX + colVerso * (cardWidth + spacingX);
          const y = marginY + row * (cardHeight + spacingY);

          // Define a imagem do verso (Prioridade: 1º DFC Nativo, 2º Custom, 3º Padrão MTG)
          let backImageUrl = window.AppConfig.MTG_BACK_URL;

          if (card.image_uri_back_normal) {
            backImageUrl = card.image_uri_back_normal;
            console.log(`🔄 Usando verso DFC para: ${card.name}`);
          } else if (
            AppState.getGlobalCustomBackImage &&
            AppState.getGlobalCustomBackImage()
          ) {
            backImageUrl = AppState.getGlobalCustomBackImage();
            console.log(
              `🎨 Usando verso customizado global para: ${card.name}`,
            );
          } else {
            console.log(`🎴 Usando verso padrão MTG para: ${card.name}`);
          }

          // Lógica de desenhar a imagem do verso
          try {
            if (!backImageUrl) {
              console.warn(`⚠️ Verso sem imagem: ${card.name}`);
              continue;
            }

            // Fetch da imagem do verso
            const response = await fetch(backImageUrl);
            if (!response.ok) {
              throw new Error(`HTTP ${response.status}`);
            }

            const blob = await response.blob();

            // O Segredo: Versos oficiais têm borda preta nativa.
            // Em vez de esticar a imagem com processImageWithBleed (o que puxa bordas sujas de jpeg),
            // preenchemos o gap com preto puro absoluto e colamos a arte normal por cima!

            const backX = doc.internal.pageSize.getWidth() - x - cardWidth;
            const bleedOffset =
              settings.gapSpacing > 0 ? settings.gapSpacing / 2 + 0.5 : 0; // +0.5mm para sobreposição segura

            // 1. Desenha o sangramento PRETO atrás da carta (cobre totalmente as frestas)
            if (settings.gapSpacing > 0) {
              doc.setFillColor(0, 0, 0);
              doc.rect(
                backX - bleedOffset,
                y - bleedOffset,
                cardWidth + bleedOffset * 2,
                cardHeight + bleedOffset * 2,
                "F",
              );
            }

            // 2. Converte o blob diretamente e desenha a arte no tamanho EXATO por cima do fundo
            const dataUrl = await blobToDataUrl(blob);
            doc.addImage(dataUrl, "JPEG", backX, y, cardWidth, cardHeight);

            // Desenhar cruzes de corte no verso se ativado
            if (settings.cropMarks) {
              const c = 2; // Tamanho da haste da cruz em mm
              doc.setDrawColor(r, g, b);
              doc.setLineWidth(0.1);

              const drawCross = (cx, cy) => {
                doc.line(cx - c, cy, cx + c, cy); // Horizontal
                doc.line(cx, cy - c, cx, cy + c); // Vertical
              };

              drawCross(x, y); // Superior Esquerdo
              drawCross(x + cardWidth, y); // Superior Direito
              drawCross(x, y + cardHeight); // Inferior Esquerdo
              drawCross(x + cardWidth, y + cardHeight); // Inferior Direito
            }
          } catch (error) {
            console.error(`❌ Erro ao processar verso ${card.name}:`, error);
            // Continuar com as próximas cartas mesmo se esta falhar
          }
        }
      }
    }

    console.groupEnd(); // Fecha o grupo da Passada 2

    // === SALVAMENTO DO PDF ===
    console.log("💾 Salvando PDF...");
    updateProgress(
      100,
      "Concluído!",
      cardsToProcess.length,
      cardsToProcess.length,
      Math.ceil(cardsToProcess.length / cardsPerPage),
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
