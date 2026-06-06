/**
 * Deck Fill - Frontend Application
 * JavaScript para processar decklists e renderizar cartas
 *
 * Arquitetura: Cliente-servidor com API FastAPI + Frontend Vanilla JS
 * Responsabilidades: Processamento de decklists, renderização de cartas, geração de PDFs
 */

// ================================================================================
// CONFIGURACAO E ESTADO GLOBAL
// ================================================================================

// Constantes movidas para ./js/core/config.js (AppConfig.AppConfig.MTG_BACK_URL, AppConfig.AppConfig.API_BASE)

// Estado global movido para ./js/core/state.js (AppState.AppState.currentCards, AppState.AppState.isGenerationCancelled, etc.)

// ================================================================================
// MAPEAMENTO DE ELEMENTOS DOM
// ================================================================================

// Cache de elementos DOM para performance e organização
const elements = {
  // === ELEMENTOS PRINCIPAIS DA INTERFACE ===
  decklistInput: document.getElementById("decklist-input"), // Input do decklist
  processBtn: document.getElementById("process-btn"), // Botão processar
  clearBtn: document.getElementById("clear-btn"), // Botão limpar
  loadSampleBtn: document.getElementById("load-sample-btn"), // Botão carregar exemplo
  generatePdfBtn: document.getElementById("generate-pdf-btn"), // Botão gerar PDF

  // === SELETOR DE JOGO ===
  gameMagic: document.getElementById("game-magic"),
  gamePokemon: document.getElementById("game-pokemon"),
  gameYugioh: document.getElementById("game-yugioh"),
  gameLorcana: document.getElementById("game-lorcana"),
  gameOnepiece: document.getElementById("game-onepiece"),
  gameFab: document.getElementById("game-fab"),
  gameSupportNotice: document.getElementById("game-support-notice"),
  gameSupportTitle: document.getElementById("game-support-title"),
  gameSupportDescription: document.getElementById("game-support-description"),

  // === SECOES DA INTERFACE ===
  loadingSection: document.getElementById("loading-section"), // Loading principal
  loadingTitle: document.getElementById("loading-title"),
  loadingDescription: document.getElementById("loading-description"),
  loadingHint: document.getElementById("loading-hint"),
  resultsSection: document.getElementById("results-section"), // Resultados
  cardsGrid: document.getElementById("cards-grid"), // Grid de cartas
  resultsSummary: document.getElementById("results-summary"), // Resumo estatístico
  statusBadge: document.getElementById("status-badge"), // Badge de status
  errorsSection: document.getElementById("errors-section"), // Seção de erros
  errorsList: document.getElementById("errors-list"), // Lista de erros

  // === MODAL DE ESCOLHA DE ARTES ===
  artModal: document.getElementById("art-modal"), // Container principal do modal
  modalCardName: document.getElementById("modal-card-name"), // Nome da carta no header
  closeModalBtn: document.getElementById("close-modal-btn"), // Botão fechar modal
  modalLoading: document.getElementById("modal-loading"), // Loading de artes
  modalArtGrid: document.getElementById("modal-art-grid"), // Grid de opções de arte
  modalError: document.getElementById("modal-error"), // Mensagem de erro
  artSourceControls: document.getElementById("art-source-controls"),
  artSourceSelect: document.getElementById("art-source-select"),
  artSourceTabs: document.getElementById("art-source-tabs"),
  artSourceNotice: document.getElementById("art-source-notice"),
  modalGameLabel: document.getElementById("modal-game-label"),
  artSearchInput: document.getElementById("art-search-input"),
  artSearchBtn: document.getElementById("art-search-btn"),
  artResultCount: document.getElementById("art-result-count"),

  // === UPLOAD DE IMAGENS PERSONALIZADAS ===
  customImageUpload: document.getElementById("custom-image-upload"), // Input de upload
  uploadPreview: document.getElementById("upload-preview"), // Container do preview

  // === MODAL DE VERSO GLOBAL ===
  globalBackModal: document.getElementById("global-back-modal"), // Container do modal de verso global
  closeGlobalBackModal: document.getElementById("close-global-back-modal"), // Botão fechar modal
  globalBackBtn: document.getElementById("global-back-btn"), // Botão para abrir modal
  globalBackPreviewLarge: document.getElementById("global-back-preview-large"), // Preview grande da arte
  globalBackUploadModal: document.getElementById("global-back-upload-modal"), // Input de upload
  clearGlobalBackModal: document.getElementById("clear-global-back-modal"), // Botão remover
  uploadPreviewImg: document.getElementById("upload-preview-img"), // Imagem de preview
  clearCustomImage: document.getElementById("clear-custom-image"), // Botão remover imagem
  // Upload do verso (DFCs)
  customImageUploadBack: document.getElementById("custom-image-upload-back"), // Input de upload verso
  uploadBackSection: document.getElementById("upload-back-section"), // Container do upload verso
  uploadPreviewBack: document.getElementById("upload-preview-back"), // Container do preview verso
  uploadPreviewImgBack: document.getElementById("upload-preview-img-back"), // Imagem de preview verso
  clearCustomImageBack: document.getElementById("clear-custom-image-back"), // Botão remover imagem verso

  // === CONFIGURACOES DE IMPRESSAO (ACCORDION) ===
  printSettingsToggle: document.getElementById("print-settings-toggle"), // Toggle do accordion
  printSettingsContent: document.getElementById("print-settings-content"), // Conteúdo do accordion
  printSettingsChevron: document.getElementById("print-settings-chevron"), // Ícone do accordion

  // === MODO DE SAÍDA ===
  outputModeManual: document.getElementById("output-mode-manual"),
  outputModeProfessional: document.getElementById("output-mode-professional"),
  professionalPrintPanel: document.getElementById("professional-print-panel"),
  whatsappPrintBtn: document.getElementById("whatsapp-print-btn"),

  // === CATEGORIA 1: LAYOUT & GEOMETRIA ===
  pageSize: document.getElementById("page-size"), // Tamanho da folha
  gapSpacing: document.getElementById("gap-spacing"), // Espaçamento/gap
  gapSpacingProfessional: document.getElementById("gap-spacing-professional"),
  scale: document.getElementById("scale"), // Escala da carta
  gapValue: document.getElementById("gap-value"), // Display do valor do gap
  gapValueProfessional: document.getElementById("gap-value-professional"),

  // === CATEGORIA 2: GUIAS DE IMPRESSÒO ===
  cropMarks: document.getElementById("crop-marks"), // Guias
  guideType: document.getElementById("guide-type"),
  guideTypeOptions: document.getElementById("guide-type-options"),
  blackCorners: document.getElementById("black-corners"), // Bordas pretas
  bleed: document.getElementById("bleed"), // Sangria/bleed
  blackCornersProfessional: document.getElementById("black-corners-professional"),
  bleedProfessional: document.getElementById("bleed-professional"),
  guideColor: document.getElementById("guide-color"), // Cor das guias
  languageSettingsRow: document.getElementById("language-settings-row"),
  languageSettingsNote: document.getElementById("language-settings-note"),
  preferredLanguage: document.getElementById("preferred-language"),
  autoCompleteCategory: document.getElementById("auto-complete-category"),
  printRelevantFaces: document.getElementById("print-relevant-faces"),
  relatedTokensRow: document.getElementById("related-tokens-row"),
  includeRelatedTokens: document.getElementById("include-related-tokens"),
  skipBasicLandsRow: document.getElementById("skip-basic-lands-row"),

  // === CATEGORIA 3: FUNCIONALIDADES INTELIGENTES ===
  skipBasicLands: document.getElementById("skip-basic-lands"), // Ignorar terrenos básicos
  autodetectTokens: document.getElementById("autodetect-tokens"), // Auto-detectar tokens
  printDoubleFaced: document.getElementById("print-double-faced"), // Imprimir dupla face

  // === MODAL DE PROGRESSO (GERACAO DE PDF) ===
  progressModal: document.getElementById("progress-modal"), // Container do modal
  progressBar: document.getElementById("progress-bar"), // Barra de progresso
  progressPercentage: document.getElementById("progress-percentage"), // Percentual
  progressStatus: document.getElementById("progress-status"), // Status text
  progressCards: document.getElementById("progress-cards"), // Contador de cartas
  progressPages: document.getElementById("progress-pages"), // Contador de páginas
  progressCancelBtn: document.getElementById("progress-cancel-btn"), // Botão cancelar
  progressCloseBtn: document.getElementById("progress-close-btn"), // Botão fechar
};

// Exportar elements globalmente para que outros módulos possam acessar os elementos DOM
window.elements = elements;

// ================================================================================
// DADOS DE EXEMPLO
// ================================================================================

// AppConfig.SAMPLE_DECKLIST movido para ./js/core/config.js (AppConfig.AppConfig.SAMPLE_DECKLIST)

// ================================================================================
// INICIALIZACAO DA APLICACAO
// ================================================================================

// Ponto de entrada da aplicação - executado quando DOM está carregado
document.addEventListener("DOMContentLoaded", () => {
  initializeEventListeners();
  AppConfig.refreshIcons?.();
  checkApiHealth();
});

/**
 * Inicializa todos os event listeners da aplicação
 *
 * Responsabilidades:
 * - Configurar interações dos botões principais
 * - Configurar eventos do modal de artes
 * - Configurar eventos do modal de progresso
 * - Configurar exclusão mútua entre configurações
 * - Configurar atalhos de teclado (ESC)
 */
function initializeEventListeners() {
  // Botão Processar Deck
  elements.processBtn.addEventListener("click", processDecklist);

  // Botão Limpar
  elements.clearBtn.addEventListener("click", clearDecklist);

  // Botão Carregar Exemplo
  elements.loadSampleBtn.addEventListener("click", loadSampleDecklist);

  getGameSelectorInputs().forEach((input) => {
    input.addEventListener("change", handleGameChange);
  });

  updateSelectedGameUI();

  // Botão Gerar PDF
  elements.generatePdfBtn.addEventListener("click", generatePDF);

  // Print Settings Accordion
  elements.printSettingsToggle.addEventListener("click", togglePrintSettings);

  if (elements.outputModeManual) {
    elements.outputModeManual.addEventListener("change", handleOutputModeChange);
  }

  if (elements.outputModeProfessional) {
    elements.outputModeProfessional.addEventListener("change", handleOutputModeChange);
  }

  if (elements.whatsappPrintBtn) {
    elements.whatsappPrintBtn.addEventListener("click", openProfessionalPrintWhatsApp);
  }

  handleOutputModeChange();
  // Slider value updates
  elements.gapSpacing?.addEventListener("input", updateGapValue);
  elements.gapSpacingProfessional?.addEventListener("input", updateGapValue);
  elements.guideColor?.addEventListener("input", updateGuidePreviewState);
  elements.guideType?.addEventListener("change", updateGuidePreviewState);
  elements.guideTypeOptions
    ?.querySelectorAll("[data-guide-type-option]")
    .forEach((option) => {
      option.addEventListener("click", () => {
        setSelectedGuideType(option.dataset.guideTypeOption);
      });
    });
  updateGuidePreviewState();
  elements.printRelevantFaces?.addEventListener("change", updateFaceWarningBadges);
  // Progress Modal
  elements.progressCancelBtn.addEventListener("click", () => {
    AppState.isGenerationCancelled = true;
    hideProgressModal();
  });
  elements.progressCloseBtn.addEventListener("click", hideProgressModal);

  // Modal events
  elements.closeModalBtn.addEventListener("click", closeArtModal);
  if (elements.artSearchBtn) {
    elements.artSearchBtn.addEventListener("click", handleArtSearchSubmit);
  }

  if (elements.artSearchInput) {
    elements.artSearchInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        handleArtSearchSubmit();
      }
    });
  }

  // Upload de imagens personalizadas
  elements.customImageUpload.addEventListener(
    "change",
    handleCustomImageUpload,
  );
  elements.clearCustomImage.addEventListener("click", clearCustomImage);
  // Upload do verso (DFCs)
  elements.customImageUploadBack.addEventListener(
    "change",
    handleCustomImageUploadBack,
  );
  elements.clearCustomImageBack.addEventListener("click", clearCustomImageBack);

// Botão de limpar verso global
  // Fechar modal clicando no backdrop
  elements.artModal.addEventListener("click", (e) => {
    if (e.target === elements.artModal) {
      closeArtModal();
    }
  });

  // Fechar modal com ESC
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !elements.artModal.classList.contains("hidden")) {
      closeArtModal();
    }
  });

  // Exclusão mútua: Sangria vs Bordas Pretas
  setupExclusiveEdgeControls(elements.bleed, elements.blackCorners);
  setupExclusiveEdgeControls(
    elements.bleedProfessional,
    elements.blackCornersProfessional,
  );

  // Event listeners para o modal de verso global
  if (elements.globalBackBtn) {
    elements.globalBackBtn.addEventListener("click", openGlobalBackModal);
  }

  if (elements.closeGlobalBackModal) {
    elements.closeGlobalBackModal.addEventListener(
      "click",
      closeGlobalBackModal,
    );
  }

  if (elements.globalBackUploadModal) {
    elements.globalBackUploadModal.addEventListener(
      "change",
      handleGlobalBackUploadModal,
    );
  }

  if (elements.clearGlobalBackModal) {
    elements.clearGlobalBackModal.addEventListener(
      "click",
      clearGlobalBackModal,
    );
  }

  // Clique na imagem do verso padrão MTG para resetar
  if (elements.globalBackPreviewLarge) {
    elements.globalBackPreviewLarge.addEventListener("click", function () {
      const currentBack = AppState.getGlobalCustomBackImage();

      // Se já tiver imagem customizada, permite resetar
      if (currentBack) {
        // Limpar do estado
        AppState.setGlobalCustomBackImage(null);

        // Limpar preview
        elements.globalBackPreviewLarge.src = window.AppConfig.MTG_BACK_URL;

        // Atualizar botão
        updateGlobalBackButton();

        // Fechar modal
        setTimeout(() => {
          closeGlobalBackModal();
        }, 300);
      }
    });
  }

  // Fechar modal clicando no backdrop
  if (elements.globalBackModal) {
    elements.globalBackModal.addEventListener("click", (e) => {
      if (e.target === elements.globalBackModal) {
        closeGlobalBackModal();
      }
    });
  }

  // Fechar modal com ESC
  document.addEventListener("keydown", (e) => {
    if (
      e.key === "Escape" &&
      !elements.globalBackModal.classList.contains("hidden")
    ) {
      closeGlobalBackModal();
    }
  });

  // Inicializa delegação de eventos para cliques nas cartas
  initializeCardClickDelegation();

  // Atalho de teclado: Ctrl+Enter para processar
  elements.decklistInput.addEventListener("keydown", (e) => {
    if (e.ctrlKey && e.key === "Enter") {
      processDecklist();
    }
  });

  // Auto-resize do textarea
  elements.decklistInput.addEventListener("input", () => {
    elements.decklistInput.style.height = "auto";
    elements.decklistInput.style.height =
      elements.decklistInput.scrollHeight + "px";
  });

  // Fechar seção de erros
  elements.errorsSection.addEventListener("click", (e) => {
    if (e.target === elements.errorsSection) {
      hideErrors();
    }
  });
}

// Função checkApiHealth movida para ./js/api/api-client.js

// ================================================================================
// FUNCOES PRINCIPAIS DA APLICACAO
// ================================================================================

// Função processDecklist movida para ./js/deck/deck-processor.js

// Funções de renderização movidas para ./js/deck/card-renderer.js

// Funções de loading movidas para ./js/ui/notifications.js

// Funções de deck movidas para ./js/deck/deck-processor.js (clearDecklist, loadSampleDecklist)

// Funções de erro movidas para ./js/ui/notifications.js

// Função processImageWithBleed movida para ./js/utils/helpers.js

// Função generatePDF movida para ./js/pdf/pdf-engine.js

// Função blobToDataUrl movida para ./js/pdf/pdf-engine.js

// Funções de modal movidas para ./js/ui/modal-manager.js

/**
 * Atualiza apenas o elemento de carta específico no DOM
 */
function updateCardElement(cardIndex) {
  const card = AppState.currentCards[cardIndex];
  const cardElements = elements.cardsGrid.children;

  if (cardElements[cardIndex]) {
    const newCardElement = createCardElement(card, cardIndex);
    // Garante que o novo elemento tenha cursor pointer
    newCardElement.style.cursor = "pointer";
    cardElements[cardIndex].replaceWith(newCardElement);
  }
}

// Função closeArtModal movida para ./js/ui/modal-manager.js

/**
 * Inicializa delegação de eventos para cliques nas cartas
 * (Abordagem 1 - Recomendada: Delegação de Eventos)
 */
function initializeCardClickDelegation() {
  // Adiciona um único listener no container pai
  elements.cardsGrid.addEventListener("click", (e) => {
    // Encontra o elemento .card-item mais próximo do clique
    const cardElement = e.target.closest(".card-item");

    if (cardElement) {
      // Encontra o índice da carta no container
      const cardElements = Array.from(elements.cardsGrid.children);
      const cardIndex = cardElements.indexOf(cardElement);

      if (cardIndex !== -1 && AppState.currentCards[cardIndex]) {
        openArtModal(AppState.currentCards[cardIndex], cardIndex);
      }
    }
  });
}

/**
 * Adiciona evento de clique às cartas para abrir o modal
 * (Mantido para compatibilidade, mas usa delegação)
 */
function addCardClickHandlers() {
  // Apenas garante que as cartas tenham cursor pointer
  const cardElements = elements.cardsGrid.querySelectorAll(".card-item");
  cardElements.forEach((cardElement) => {
    cardElement.style.cursor = "pointer";
  });
}

// Funções de configuração movidas para ./js/ui/modal-manager.js

// Funções de progresso movidas para ./js/ui/notifications.js

/**
 * Obtem as configuracoes de impressao
 */
function getPrintSettings() {
  const selectedMode = getSelectedOutputMode();
  const isProfessional = selectedMode === "professional";
  const activeBleed = isProfessional
    ? elements.bleedProfessional?.checked
    : elements.bleed?.checked;
  const activeBlackBorder = isProfessional
    ? elements.blackCornersProfessional?.checked
    : elements.blackCorners?.checked;
  const activeGapSpacing = isProfessional
    ? elements.gapSpacingProfessional?.value
    : elements.gapSpacing?.value;

  return {
    pageSize: elements.pageSize?.value || "a4",
    gapSpacing: parseFloat(activeGapSpacing) || 2,
    scale: elements.scale?.value || "normal",
    cropMarks: !isProfessional && (elements.cropMarks?.checked || false),
    guideType: elements.guideType?.value || "external-corners",
    blackCorners: Boolean(activeBlackBorder),
    bleed: Boolean(activeBleed),
    skipBasicLands: elements.skipBasicLands?.checked || false,
    // Novos campos inteligentes (com fallbacks seguros)
    autodetectTokens: elements.includeRelatedTokens?.checked || false,
    includeRelatedTokens: elements.includeRelatedTokens?.checked || false,
    printRelevantFaces: elements.printRelevantFaces?.checked !== false,
    printDoubleFaced: elements.printDoubleFaced?.checked || false,
    outputMode: selectedMode,
    preferredLanguage: elements.preferredLanguage?.value || "en",
    backFaceType: elements.backFaceType?.value || "standard",
    smartFill: elements.autoCompleteCategory?.value || "off",
    autoCompleteCategory: elements.autoCompleteCategory?.value || "off",
    // Cor das guias
    guideColor: elements.guideColor?.value || "#E7B650",
  };
}

// ================================================================================
// FUNCOES DE UPLOAD DE IMAGENS PERSONALIZADAS
// ================================================================================

// Funções de upload movidas para ./js/upload/image-upload.js

/**
 * Restaura a imagem original da carta
 */
function restoreOriginalImage(cardIndex) {
  const cardElements = document.querySelectorAll(".card-item");
  if (cardElements[cardIndex] && AppState.currentCards[cardIndex]) {
    const imgElement =
      cardElements[cardIndex].querySelector('[data-role="primary-card-image"]') ||
      cardElements[cardIndex].querySelector("img");
    if (imgElement) {
      const originalUrl =
        AppState.currentCards[cardIndex].image_uri_png ||
        AppState.currentCards[cardIndex].image_uri_normal;
      imgElement.src = originalUrl;

      // Remover indicadores de imagem personalizada
      cardElements[cardIndex].classList.remove("custom-image");
      imgElement.classList.remove("border-2", "border-df-primary");
    }
  }
}

/**
 * Two-Way Data Binding: Atualiza o textarea do decklist com base nas cartas atuais
 */
function updateDecklistTextarea() {
  const cardCounts = {};

  // Agrupa as cartas e ignora os versos (para não duplicar no texto)
  AppState.currentCards.forEach((card) => {
    if (card.name.endsWith(" (Verso)")) return;

    const deckName = card.decklist_name || card.name;
    const setCode = card.decklist_set_code || card.set_code || card.set_name || "SET";
    const collectorNumber =
      card.decklist_collector_number || card.collector_number || "-";
    const key = `${deckName} (${setCode} #${collectorNumber})`;
    cardCounts[key] = (cardCounts[key] || 0) + 1;
  });

  // Monta o novo texto
  const newText = Object.entries(cardCounts)
    .map(([key, count]) => `${count} ${key}`)
    .join("\n");

  // Atualiza o textarea no DOM
  if (elements.decklistInput) {
    elements.decklistInput.value = newText;
  }
}

/**
 * Abre o modal de verso global
 */
function openGlobalBackModal() {
  elements.globalBackModal.classList.remove("hidden");
  updateGlobalBackButton();
}

/**
 * Fecha o modal de verso global
 */
function closeGlobalBackModal() {
  elements.globalBackModal.classList.add("hidden");
}

/**
 * Atualiza o texto e estilo do botão de verso global
 */
function updateGlobalBackButton() {
  const currentBack = AppState.getGlobalCustomBackImage();
  const buttonText = elements.globalBackBtn;

  if (currentBack) {
    buttonText.textContent = "Customizado";
    buttonText.classList.remove(
      "bg-df-raised",
      "hover:bg-df-line",
      "text-df-soft",
    );
    buttonText.classList.add(
      "bg-df-success",
      "hover:bg-df-success-dark",
      "text-df-bg",
      "border-2",
      "border-df-success",
    );
  } else {
    buttonText.textContent = "Padrão";
    buttonText.classList.remove(
      "bg-df-success",
      "hover:bg-df-success-dark",
      "text-df-bg",
      "border-2",
      "border-df-success",
    );
    buttonText.classList.add(
      "bg-df-raised",
      "hover:bg-df-line",
      "text-df-soft",
    );
  }
}

/**
 * Lida com o upload da imagem do verso global
 */
function handleGlobalBackUploadModal(event) {
  const file = event.target.files[0];
  if (!file) return;

  // Validar tipo de arquivo
  if (!file.type.startsWith("image/")) {
    alert("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;

    const customSlot = document.getElementById("custom-back-slot");
    const customImg = document.getElementById("custom-back-preview-img");

    if (customSlot && customImg) {
      // Update the custom slot image and show it
      customImg.src = imageUrl;
      customSlot.setAttribute("data-url", imageUrl);
      customSlot.classList.remove("hidden");

      // Manually trigger selection without closing modal
      const options = document.querySelectorAll(".back-option-card");
      options.forEach((opt) => {
        opt.classList.remove("selected");
        opt.classList.remove("border-df-primary");
        opt.classList.add("border-transparent");
        // Hide all selected overlays
        const overlay = opt.querySelector(".selected-overlay");
        if (overlay) overlay.classList.add("hidden");
      });

      // Highlight the custom slot
      customSlot.classList.add("selected");
      customSlot.classList.remove("border-transparent");
      customSlot.classList.add("border-df-primary");

      // Show selected overlay
      const overlay = customSlot.querySelector(".selected-overlay");
      if (overlay) overlay.classList.remove("hidden");
    }
  };

  reader.onerror = function (error) {
    console.error("Erro ao ler arquivo:", error);
    alert("Ocorreu um erro ao processar a imagem. Tente novamente.");
  };

  reader.readAsDataURL(file);
}

/**
 * Limpa a imagem do verso global
 */
function clearGlobalBackModal() {
  // Limpar do estado
  AppState.setGlobalCustomBackImage(null);

  // Limpar preview
  const imgElement = elements.globalBackPreviewLarge;

  if (imgElement) {
    imgElement.src = window.AppConfig.MTG_BACK_URL;
  }

  // Atualizar botão
  updateGlobalBackButton();
}

// Função toggleCardFace movida para ./js/deck/card-renderer.js

// Exportar funções para debug (console)
// Nota: Várias funções movidas para módulos especializados:
// - showProgressModal, hideProgressModal, updateProgress -> ./js/ui/notifications.js
// - openArtModal, closeArtModal, togglePrintSettings -> ./js/ui/modal-manager.js
// - handleCustomImageUpload, clearCustomImage -> ./js/upload/image-upload.js
// - processDecklist, clearDecklist, loadSampleDecklist -> ./js/deck/deck-processor.js
// - renderResults, createCardElement, toggleCardFace -> ./js/deck/card-renderer.js
// - generatePDF, blobToDataUrl -> ./js/pdf/pdf-engine.js
// - checkApiHealth -> ./js/api/api-client.js

window.deckFillApp = {
  // Funções movidas para módulos especializados - mantendo apenas estado e configuração
  currentCards: AppState.currentCards,
  hideProgressModal,
  getPrintSettings,
};

function initializeGlobalBackGallery() {
  const options = document.querySelectorAll(".back-option-card");
  if (!options.length) return;

  let clickCount = 0;
  let lastClickedCard = null;

  options.forEach((option) => {
    option.addEventListener("click", function () {
      const currentTime = Date.now();

      // Check for double click
      if (lastClickedCard === this && currentTime - clickCount < 300) {
        // Double click - confirm selection and close modal
        const selectedUrl = this.getAttribute("data-url");
        AppState.setGlobalCustomBackImage(selectedUrl);
        if (typeof updateGlobalBackButton === "function")
          updateGlobalBackButton();
        setTimeout(() => {
          if (typeof closeGlobalBackModal === "function")
            closeGlobalBackModal();
        }, 300);
        return;
      }

      clickCount = currentTime;
      lastClickedCard = this;

      // Single click - just update selection visual
      options.forEach((opt) => {
        opt.classList.remove("selected");
        opt.classList.remove("border-df-primary");
        opt.classList.add("border-transparent");
        // Hide all selected overlays
        const overlay = opt.querySelector(".selected-overlay");
        if (overlay) overlay.classList.add("hidden");
      });

      // Highlight selected option
      this.classList.add("selected");
      this.classList.remove("border-transparent");
      this.classList.add("border-df-primary");

      // Show selected overlay
      const overlay = this.querySelector(".selected-overlay");
      if (overlay) overlay.classList.remove("hidden");
    });
  });

  // Add confirm button listener
  const confirmBtn = document.getElementById("confirm-global-back-selection");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", function () {
      const selectedOption = document.querySelector(
        ".back-option-card.border-df-primary",
      );
      if (selectedOption) {
        const selectedUrl = selectedOption.getAttribute("data-url");
        AppState.setGlobalCustomBackImage(selectedUrl);
        if (typeof updateGlobalBackButton === "function")
          updateGlobalBackButton();
        setTimeout(() => {
          if (typeof closeGlobalBackModal === "function")
            closeGlobalBackModal();
        }, 300);
      }
    });
  }
}

// About Project Modal functionality
function initializeAboutModal() {
  const donateBtn = document.getElementById("btn-donate-pix");
  const aboutModal = document.getElementById("about-project-modal");
  const closeAboutModal = document.getElementById("close-about-modal");
  const copyPixBtn = document.getElementById("copy-pix-btn");
  const pixKeyInput = document.getElementById("pix-key");

  // Open modal
  if (donateBtn) {
    donateBtn.addEventListener("click", function () {
      if (aboutModal) {
        aboutModal.classList.remove("hidden");
        aboutModal.classList.add("flex");
      }
    });
  }

  // Close modal
  if (closeAboutModal) {
    closeAboutModal.addEventListener("click", function () {
      if (aboutModal) {
        aboutModal.classList.add("hidden");
        aboutModal.classList.remove("flex");
      }
    });
  }

  // Close modal on backdrop click
  if (aboutModal) {
    aboutModal.addEventListener("click", function (e) {
      if (e.target === aboutModal) {
        aboutModal.classList.add("hidden");
        aboutModal.classList.remove("flex");
      }
    });
  }

  // Copy Pix key functionality
  if (copyPixBtn && pixKeyInput) {
    copyPixBtn.addEventListener("click", async function () {
      const pixKey = pixKeyInput.value;

      try {
        await navigator.clipboard.writeText(pixKey);

        // Show success notification
        if (typeof showSuccess === "function") {
          showSuccess("Chave Pix copiada com sucesso!");
        } else {
          // Fallback notification
          const originalContent = copyPixBtn.innerHTML;
          copyPixBtn.innerHTML =
            '<i data-lucide="check" class="df-icon" aria-hidden="true"></i><span>Copiado!</span>';
          copyPixBtn.classList.add("bg-df-success");
          AppConfig.refreshIcons?.();

          setTimeout(() => {
            copyPixBtn.innerHTML = originalContent;
            copyPixBtn.classList.remove("bg-df-success");
            AppConfig.refreshIcons?.();
          }, 2000);
        }
      } catch (err) {
        console.error("Failed to copy Pix key:", err);

        // Show error notification
        if (typeof showError === "function") {
          showError("Falha ao copiar chave Pix. Tente novamente.");
        }
      }
    });
  }
}

document.addEventListener("DOMContentLoaded", initializeGlobalBackGallery);

function getSelectedOutputMode() {
  if (elements.outputModeProfessional?.checked) {
    return "professional";
  }

  return "normal";
}

function updateOutputModeUI() {
  const selectedMode = getSelectedOutputMode();

  document
    .querySelectorAll("[data-print-mode-section]")
    .forEach((section) => {
      const targetMode = section.dataset.printModeSection;
      section.classList.toggle("hidden", targetMode !== selectedMode);
    });

  if (elements.professionalPrintPanel) {
    elements.professionalPrintPanel.classList.toggle(
      "hidden",
      selectedMode !== "professional",
    );
  }

  if (elements.autoCompleteCategory) {
    const defaultCategory = selectedMode === "professional" ? "iconic" : "off";
    if (!elements.autoCompleteCategory.value) {
      elements.autoCompleteCategory.value = defaultCategory;
    }
  }

  updateGameDependentControls(
    GameConfigs.getGameConfig(AppState.getSelectedGame?.() || "magic"),
  );
  updateGuidePreviewState();
  updateFaceWarningBadges();
}

function openProfessionalPrintWhatsApp() {
  const phoneNumber = "5535998458853";
  const message =
    "Olá! Gerei um PDF de proxies pelo DeckFill e gostaria de solicitar a impressão.";

  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function setElementDisabled(element, disabled) {
  if (!element) return;

  element.disabled = disabled;
  element.classList.toggle("opacity-50", disabled);
  element.classList.toggle("cursor-not-allowed", disabled);

  if (disabled) {
    element.title =
      "Esta opção é controlada automaticamente no modo de impressão profissional.";
  } else {
    element.removeAttribute("title");
  }
}

function applyProfessionalPrintPreset() {
  if (elements.pageSize) {
    elements.pageSize.value = "a4";
  }

  if (elements.scale) {
    elements.scale.value = "normal";
  }

  if (elements.gapSpacing) {
    elements.gapSpacing.value = "2";
  }

  if (elements.gapSpacingProfessional) {
    elements.gapSpacingProfessional.value = "2";
  }

  updateGapValue();

  if (elements.bleedProfessional) {
    elements.bleedProfessional.checked = false;
  }

  if (elements.blackCornersProfessional) {
    elements.blackCornersProfessional.checked = false;
  }

  if (elements.autoCompleteCategory) {
    elements.autoCompleteCategory.value = "iconic";
  }
}

function applyNormalPrintPreset() {
  if (elements.pageSize) {
    elements.pageSize.value = elements.pageSize.value || "a4";
  }

  if (elements.scale) {
    elements.scale.value = elements.scale.value || "normal";
  }

  if (elements.gapSpacing) {
    elements.gapSpacing.value = elements.gapSpacing.value || "2";
  }

  if (elements.gapSpacingProfessional) {
    elements.gapSpacingProfessional.value =
      elements.gapSpacingProfessional.value || "2";
  }

  updateGapValue();

  if (elements.cropMarks) {
    elements.cropMarks.checked = true;
  }

  if (elements.bleed) {
    elements.bleed.checked = false;
  }

  if (elements.blackCorners) {
    elements.blackCorners.checked = false;
  }

  if (elements.autoCompleteCategory) {
    elements.autoCompleteCategory.value = "off";
  }
}

function handleOutputModeChange() {
  const selectedMode = getSelectedOutputMode();

  if (selectedMode === "professional") {
    applyProfessionalPrintPreset();
  } else {
    applyNormalPrintPreset();
  }

  updateOutputModeUI();
}

function setupExclusiveEdgeControls(bleedControl, blackBorderControl) {
  if (!bleedControl || !blackBorderControl) {
    return;
  }

  blackBorderControl.addEventListener("change", (event) => {
    if (event.target.checked) {
      bleedControl.checked = false;
    }
    event.target.blur();
  });

  bleedControl.addEventListener("change", (event) => {
    if (event.target.checked) {
      blackBorderControl.checked = false;
    }
    event.target.blur();
  });
}

function setSelectedGuideType(guideType) {
  if (!guideType || !elements.guideType) {
    return;
  }

  elements.guideType.value = guideType;
  updateGuidePreviewState();
}

function updateGuidePreviewState() {
  const selectedGuideType = elements.guideType?.value || "external-corners";
  const guideColor = elements.guideColor?.value || "#E7B650";

  elements.guideTypeOptions
    ?.querySelectorAll("[data-guide-type-option]")
    .forEach((option) => {
      const isSelected = option.dataset.guideTypeOption === selectedGuideType;

      option.setAttribute("aria-pressed", String(isSelected));
      option.classList.toggle("border-df-primary", isSelected);
      option.classList.toggle("ring-1", isSelected);
      option.classList.toggle("ring-df-primary/70", isSelected);
      option.classList.toggle("bg-slate-900/70", isSelected);
      option.classList.toggle("border-slate-600", !isSelected);
      option.classList.toggle("bg-slate-900/50", !isSelected);
    });

  document.querySelectorAll("[data-guide-preview]").forEach((preview) => {
    preview.style.setProperty("color", guideColor, "important");
  });
}

function getAutocompleteCategoryOptions(gameConfig) {
  const categories =
    GameConfigs.autocompleteCategories?.[gameConfig.id] ||
    GameConfigs.autocompleteCategories?.magic ||
    [];

  return [
    { id: "off", label: "Desligado" },
    ...categories.map((category) => ({
      id: category.id,
      label: category.label,
    })),
  ];
}

function updateAutoCompleteCategoryOptions(gameConfig) {
  if (!elements.autoCompleteCategory) {
    return;
  }

  const selectedMode = getSelectedOutputMode();
  const previousValue = elements.autoCompleteCategory.value;
  const options = getAutocompleteCategoryOptions(gameConfig);

  elements.autoCompleteCategory.innerHTML = options
    .map(
      (option) =>
        `<option value="${option.id}">${option.label}</option>`,
    )
    .join("");

  const desiredValue =
    options.some((option) => option.id === previousValue)
      ? previousValue
      : selectedMode === "professional"
        ? "iconic"
        : "off";

  elements.autoCompleteCategory.value = options.some(
    (option) => option.id === desiredValue,
  )
    ? desiredValue
    : "off";
}

function updateLanguageControls(gameConfig) {
  const languageConfig = gameConfig.languages || {};
  const shouldShow = Boolean(languageConfig.supported);

  elements.languageSettingsRow?.classList.toggle("hidden", !shouldShow);

  if (!shouldShow || !elements.preferredLanguage) {
    return;
  }

  const options = languageConfig.options || GameConfigs.languages || [];
  const currentValue = elements.preferredLanguage.value;

  elements.preferredLanguage.innerHTML = options
    .map(
      (language) =>
        `<option value="${language.id}">${language.label}</option>`,
    )
    .join("");

  elements.preferredLanguage.value =
    currentValue && options.some((language) => language.id === currentValue)
      ? currentValue
      : languageConfig.default || "en";

  if (elements.languageSettingsNote) {
    elements.languageSettingsNote.textContent =
      languageConfig.partialNotice || "";
  }
}

function updateGameDependentControls(gameConfig) {
  updateAutoCompleteCategoryOptions(gameConfig);
  updateLanguageControls(gameConfig);

  const supportsRelatedTokens = Boolean(gameConfig.supportsRelatedTokens);

  elements.relatedTokensRow?.classList.toggle("hidden", !supportsRelatedTokens);
  if (elements.includeRelatedTokens) {
    elements.includeRelatedTokens.checked = supportsRelatedTokens;
  }

  const shouldShowSkipBasics =
    gameConfig.id === "magic" && getSelectedOutputMode() === "normal";
  elements.skipBasicLandsRow?.classList.toggle("hidden", !shouldShowSkipBasics);
}

function getGameSelectorInputs() {
  return Array.from(document.querySelectorAll('input[name="game-selector"]'));
}

function getSelectedGameFromUI() {
  const selectedInput = getGameSelectorInputs().find((input) => input.checked);
  return selectedInput?.value || "magic";
}

function handleGameChange() {
  const selectedGame = getSelectedGameFromUI();
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  if (gameConfig.status !== "active") {
    showError(`${GameConfigs.getGameDisplayLabel(gameConfig)} ainda não está disponível.`);
    const magicInput = document.getElementById("game-magic");
    if (magicInput) {
      magicInput.checked = true;
    }
    AppState.setSelectedGame("magic");
    updateSelectedGameUI();
    return;
  }

  AppState.setSelectedGame(selectedGame);
  clearDecklist();
  updateSelectedGameUI();
}

function updateSelectedGameUI() {
  const selectedGame = AppState.getSelectedGame();
  const gameConfig = GameConfigs.getGameConfig(selectedGame);
  const selectedInput = document.querySelector(
    `input[name="game-selector"][value="${selectedGame}"]`,
  );

  if (document.body) {
    document.body.dataset.game = selectedGame;
  }

  if (selectedInput && !selectedInput.checked) {
    selectedInput.checked = true;
  }

  if (elements.decklistInput) {
    elements.decklistInput.placeholder = gameConfig.decklistPlaceholder;
  }

  updateGameDependentControls(gameConfig);
  updateGameSupportNotice(gameConfig);}

function updateGameSupportNotice(gameConfig) {
  if (!elements.gameSupportNotice) {
    return;
  }

  const noticeText = GameConfigs.getGameSupportDescription(gameConfig);

  elements.gameSupportNotice.classList.toggle("hidden", !noticeText);

  if (!noticeText) {
    return;
  }

  elements.gameSupportTitle.textContent =
    GameConfigs.getGameSupportTitle(gameConfig);
  elements.gameSupportDescription.textContent = noticeText;

  elements.gameSupportNotice.className =
    "mt-3 rounded-lg border px-4 py-3 text-sm border-df-line bg-df-surface text-df-muted";
}
