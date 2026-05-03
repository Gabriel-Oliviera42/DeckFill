/**
 * Deck Fill - Frontend Application
 * JavaScript para processar decklists e renderizar cartas
 *
 * Arquitetura: Cliente-servidor com API FastAPI + Frontend Vanilla JS
 * Responsabilidades: Processamento de decklists, renderização de cartas, geração de PDFs
 */

// ================================================================================
// CONFIGURAÇÃO E ESTADO GLOBAL
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

  // === SEÇÕES DA INTERFACE ===
  loadingSection: document.getElementById("loading-section"), // Loading principal
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

  // === CONFIGURAÇÕES DE IMPRESSÃO (ACCORDION) ===
  printSettingsToggle: document.getElementById("print-settings-toggle"), // Toggle do accordion
  printSettingsContent: document.getElementById("print-settings-content"), // Conteúdo do accordion
  printSettingsChevron: document.getElementById("print-settings-chevron"), // Ícone do accordion

  // === CATEGORIA 1: LAYOUT & GEOMETRIA ===
  pageSize: document.getElementById("page-size"), // Tamanho da folha
  gapSpacing: document.getElementById("gap-spacing"), // Espaçamento/gap
  scale: document.getElementById("scale"), // Escala da carta
  gapValue: document.getElementById("gap-value"), // Display do valor do gap

  // === CATEGORIA 2: GUIAS DE IMPRESSÃO ===
  cropMarks: document.getElementById("crop-marks"), // Marcas de corte
  blackCorners: document.getElementById("black-corners"), // Bordas pretas
  bleed: document.getElementById("bleed"), // Sangria/bleed
  guideColor: document.getElementById("guide-color"), // Cor das guias

  // === CATEGORIA 3: FUNCIONALIDADES INTELIGENTES ===
  skipBasicLands: document.getElementById("skip-basic-lands"), // Ignorar terrenos básicos
  autodetectTokens: document.getElementById("autodetect-tokens"), // Auto-detectar tokens
  printDoubleFaced: document.getElementById("print-double-faced"), // Imprimir dupla face

  // === MODAL DE PROGRESSO (GERAÇÃO DE PDF) ===
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
// INICIALIZAÇÃO DA APLICAÇÃO
// ================================================================================

// Ponto de entrada da aplicação - executado quando DOM está carregado
document.addEventListener("DOMContentLoaded", () => {
  console.log("Deck Fill Application started");
  initializeEventListeners();
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

  // Botão Gerar PDF
  elements.generatePdfBtn.addEventListener("click", generatePDF);

  // Print Settings Accordion
  elements.printSettingsToggle.addEventListener("click", togglePrintSettings);

  // Slider value updates
  elements.gapSpacing.addEventListener("input", updateGapValue);

  // Progress Modal
  elements.progressCancelBtn.addEventListener("click", () => {
    AppState.isGenerationCancelled = true;
    hideProgressModal();
  });
  elements.progressCloseBtn.addEventListener("click", hideProgressModal);

  // Modal events
  elements.closeModalBtn.addEventListener("click", closeArtModal);

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

  // Upload do verso global
  if (elements.globalBackUpload) {
    elements.globalBackUpload.addEventListener(
      "change",
      handleGlobalBackUpload,
    );
  }

  // Botão de limpar verso global
  const clearGlobalBackBtn = document.getElementById("clear-global-back");
  if (clearGlobalBackBtn) {
    clearGlobalBackBtn.addEventListener("click", clearGlobalBackImage);
  }

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
  const bleedCheckbox = document.getElementById("bleed");
  const blackCornersCheckbox = document.getElementById("black-corners");

  if (bleedCheckbox && blackCornersCheckbox) {
    blackCornersCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) bleedCheckbox.checked = false;
      e.target.blur(); // Remove foco para eliminar borda laranja
    });
    bleedCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) blackCornersCheckbox.checked = false;
      e.target.blur(); // Remove foco para eliminar borda laranja
    });
  }

  // Event listeners para o modal de verso global
  console.log("Status do botão Global Back:", !!elements.globalBackBtn);

  if (elements.globalBackBtn) {
    elements.globalBackBtn.addEventListener("click", openGlobalBackModal);
    console.log("✅ Event listener do botão Global Back adicionado");
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
        console.log("🔄 Resetando verso para padrão MTG");

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

  // Listener para upload do verso global
  if (elements.globalBackUpload && elements.globalBackFilename) {
    elements.globalBackUpload.addEventListener("change", (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.type.startsWith("image/")) {
          const reader = new FileReader();
          reader.onload = function (event) {
            AppState.globalCustomBackImage = event.target.result;
            elements.globalBackFilename.textContent = file.name;
          };
          reader.readAsDataURL(file);
        } else {
          alert("Por favor, selecione um arquivo de imagem válido.");
          e.target.value = "";
        }
      }
    });
  }

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

  // Botão de doação Pix - copia chave para área de transferência
  const btnDonate = document.getElementById("btn-donate-pix");
  if (btnDonate) {
    btnDonate.addEventListener("click", () => {
      // SUBSTITUA A CHAVE ABAIXO PELA SUA CHAVE PIX ALEATÓRIA REAL
      const chavePix = "COLE-SUA-CHAVE-ALEATORIA-AQUI";

      navigator.clipboard
        .writeText(chavePix)
        .then(() => {
          alert(
            "Chave Pix copiada com sucesso!\n\nChave: " +
              chavePix +
              "\n\nMuito obrigado pelo apoio ao projeto! 🚀",
          );
        })
        .catch((err) => {
          console.error("Erro ao copiar PIX: ", err);
          alert(
            "A tua chave Pix é: " +
              chavePix +
              "\n\n(Copia este código manualmente no teu banco)",
          );
        });
    });
  }
}

// Função checkApiHealth movida para ./js/api/api-client.js

// ================================================================================
// FUNÇÕES PRINCIPAIS DA APLICAÇÃO
// ================================================================================

// Função processDecklist movida para ./js/deck/deck-processor.js

// Funções de renderização movidas para ./js/deck/card-renderer.js

// Funções de loading movidas para ./js/ui/notifications.js

// Funções de deck movidas para ./js/deck/deck-processor.js (clearDecklist, loadSampleDecklist)

// Funções de erro movidas para ./js/ui/notifications.js

// Função processImageWithBleed movida para ./js/utils/helpers.js

// ================================================================================
// GERAÇÃO DE PDF - FUNÇÃO PRINCIPAL
// ================================================================================

/**
 * Gera PDF com layout 3x3 em A4 usando dimensões MTG oficiais (63x88mm)
 *
 * Arquitetura de geração:
 * - Sistema de DUAS PASSADAS para otimizar desenho de marcas de corte
 * - Passada 1: Coleta de coordenadas e desenho de linhas de fundo (Background Lines)
    } else {
      doubleFaceSettings.classList.add("hidden");
    }
  });
}

// Listener para tipo de verso global
if (globalBackType && globalBackUploadSection) {
  globalBackType.addEventListener("change", (e) => {
    if (e.target.value === "custom-global") {
      globalBackUploadSection.classList.remove("hidden");
    } else {
      globalBackUploadSection.classList.add("hidden");
    }
  });
}

// Listener para upload do verso global
if (globalBackUpload && globalBackFilename) {
  globalBackUpload.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = function (event) {
          AppState.globalCustomBackImage = event.target.result;
          globalBackFilename.textContent = file.name;
        };
        reader.readAsDataURL(file);
      } else {
        alert("Por favor, selecione um arquivo de imagem válido.");
        e.target.value = "";
      }
    }
  });
}

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
 * Função Mock para Testar o Modal de Progresso
 */
function showProgressMock() {
  showProgressModal();

  let progress = 0;
  const totalCards = AppState.currentCards.length || 21;
  const statuses = [
    "Baixando imagens...",
    "Processando cartas...",
    "Montando páginas...",
    "Aplicando configurações...",
    "Gerando PDF...",
    "Finalizando...",
  ];

  const interval = setInterval(() => {
    progress += Math.random() * 15;

    if (progress >= 100) {
      progress = 100;
      clearInterval(interval);

      setTimeout(() => {
        updateProgress(
          100,
          "Concluído",
          totalCards,
          totalCards,
          Math.ceil(totalCards / 9),
        );
      }, 500);
    }

    const currentCard = Math.min(
      Math.floor((progress / 100) * totalCards),
      totalCards,
    );
    const currentPage = Math.ceil(currentCard / 9);
    const statusIndex = Math.floor((progress / 100) * statuses.length);
    const currentStatus = statuses[Math.min(statusIndex, statuses.length - 1)];

    updateProgress(
      progress,
      currentStatus,
      currentCard,
      totalCards,
      currentPage,
    );
  }, 300);
}

/**
 * Obtém as configurações de impressão
 */
function getPrintSettings() {
  return {
    pageSize: elements.pageSize?.value || "a4",
    gapSpacing: parseFloat(elements.gapSpacing?.value) || 0,
    scale: elements.scale?.value || "normal",
    cropMarks: elements.cropMarks?.checked || false,
    blackCorners: elements.blackCorners?.checked || false,
    bleed: elements.bleed?.checked || false,
    skipBasicLands: elements.skipBasicLands?.checked || false,
    // Novos campos inteligentes (com fallbacks seguros)
    autodetectTokens: elements.autodetectTokens?.checked || false,
    printDoubleFaced: elements.printDoubleFaced?.checked || false,
    backFaceType: elements.backFaceType?.value || "standard",
    smartFill: elements.smartFill?.value || "none",
    // Cor das guias
    guideColor: elements.guideColor?.value || "#FFFFFF",
    // Campos removidos do HTML (mantidos para compatibilidade futura)
    printDecklist: elements.printDecklist?.checked || false,
    playtestWatermark: elements.playtestWatermark?.checked || false,
  };
}

// ================================================================================
// FUNÇÕES DE UPLOAD DE IMAGENS PERSONALIZADAS
// ================================================================================

// Funções de upload movidas para ./js/upload/image-upload.js

/**
 * Atualiza a imagem da carta no grid principal
 */
function updateCardImage(cardIndex, imageUrl) {
  const cardElements = document.querySelectorAll(".card-item");
  if (cardElements[cardIndex]) {
    const imgElement = cardElements[cardIndex].querySelector("img");
    if (imgElement) {
      imgElement.src = imageUrl;

      // Adicionar indicador visual de imagem personalizada
      cardElements[cardIndex].classList.add("custom-image");

      // Adicionar borda roxa para indicar imagem personalizada
      imgElement.classList.add("border-2", "border-purple-500");
    }
  }
}

/**
 * Restaura a imagem original da carta
 */
function restoreOriginalImage(cardIndex) {
  const cardElements = document.querySelectorAll(".card-item");
  if (cardElements[cardIndex] && AppState.currentCards[cardIndex]) {
    const imgElement = cardElements[cardIndex].querySelector("img");
    if (imgElement) {
      const originalUrl =
        AppState.currentCards[cardIndex].image_uri_png ||
        AppState.currentCards[cardIndex].image_uri_normal;
      imgElement.src = originalUrl;

      // Remover indicadores de imagem personalizada
      cardElements[cardIndex].classList.remove("custom-image");
      imgElement.classList.remove("border-2", "border-purple-500");
    }
  }
}

/**
 * Obtém a URL da imagem para usar no PDF (prioriza imagem personalizada)
 */
function getCardImageUrl(cardIndex, card) {
  // Se existe imagem personalizada, usar ela
  if (AppState.customImages.has(cardIndex)) {
    const customImagesData = AppState.customImages.get(cardIndex);
    console.log(
      `📸 Usando imagem personalizada para carta ${cardIndex}:`,
      customImagesData,
    );
    return (
      customImagesData.front || card.image_uri_png || card.image_uri_normal
    );
  }

  // Senão, usar imagem original
  return card.image_uri_png || card.image_uri_normal;
}

/**
 * Lida com o upload da imagem do verso global
 */
function handleGlobalBackUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("🔍 Upload do verso global iniciado!");

  // Validar tipo de arquivo
  if (!file.type.startsWith("image/")) {
    alert("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;

    // Salvar no estado global
    AppState.setGlobalCustomBackImage(imageUrl);
    console.log("✅ Verso global armazenado no AppState");

    // Mostrar preview
    const previewContainer = document.getElementById("global-back-preview");
    const imgElement = document.getElementById("global-back-preview-img");

    if (previewContainer && imgElement) {
      previewContainer.classList.remove("hidden");
      imgElement.src = imageUrl;
    }
  };

  reader.readAsDataURL(file);
}

/**
 * Limpa a imagem do verso global
 */
function clearGlobalBackImage() {
  // Limpar do estado
  AppState.setGlobalCustomBackImage(null);
  console.log("✅ Verso global removido do AppState");

  // Limpar preview
  const previewContainer = document.getElementById("global-back-preview");
  const imgElement = document.getElementById("global-back-preview-img");
  const fileInput = document.getElementById("global-back-upload");

  if (previewContainer) previewContainer.classList.add("hidden");
  if (imgElement) imgElement.src = "";
  if (fileInput) fileInput.value = "";
}

/**
 * Two-Way Data Binding: Atualiza o textarea do decklist com base nas cartas atuais
 */
function updateDecklistTextarea() {
  const cardCounts = {};

  // Agrupa as cartas e ignora os versos (para não duplicar no texto)
  AppState.currentCards.forEach((card) => {
    if (card.name.endsWith(" (Verso)")) return;

    const key = `${card.name} (${card.set_name || card.set_code} #${card.collector_number})`;
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
  console.log("🔍 Abrindo modal de verso global");
  elements.globalBackModal.classList.remove("hidden");
  updateGlobalBackButton();
}

/**
 * Fecha o modal de verso global
 */
function closeGlobalBackModal() {
  console.log("🔍 Fechando modal de verso global");
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
      "bg-slate-600",
      "hover:bg-slate-500",
      "text-slate-300",
    );
    buttonText.classList.add(
      "bg-emerald-600",
      "hover:bg-emerald-500",
      "text-white",
      "border-2",
      "border-emerald-400",
    );
  } else {
    buttonText.textContent = "Padrão";
    buttonText.classList.remove(
      "bg-emerald-600",
      "hover:bg-emerald-500",
      "text-white",
      "border-2",
      "border-emerald-400",
    );
    buttonText.classList.add(
      "bg-slate-600",
      "hover:bg-slate-500",
      "text-slate-300",
    );
  }
}

/**
 * Lida com o upload da imagem do verso global
 */
function handleGlobalBackUploadModal(event) {
  const file = event.target.files[0];
  if (!file) return;

  console.log("🔍 Upload do verso global iniciado!");

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
        opt.classList.remove("border-purple-500");
        opt.classList.add("border-transparent");
        // Hide all selected overlays
        const overlay = opt.querySelector(".selected-overlay");
        if (overlay) overlay.classList.add("hidden");
      });

      // Highlight the custom slot
      customSlot.classList.remove("border-transparent");
      customSlot.classList.add("border-purple-500");

      // Show selected overlay
      const overlay = customSlot.querySelector(".selected-overlay");
      if (overlay) overlay.classList.remove("hidden");
    }
  };

  reader.onerror = function (error) {
    console.error("❌ Erro ao ler arquivo:", error);
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
  console.log("✅ Verso global removido do AppState");

  // Limpar preview
  const imgElement = elements.globalBackPreviewLarge;

  imgElement.src = window.AppConfig.MTG_BACK_URL;

  // Atualizar botão
  updateGlobalBackButton();
}

// Função toggleCardFace movida para ./js/deck/card-renderer.js

// Exportar funções para debug (console)
// Nota: Várias funções movidas para módulos especializados:
// - showProgressModal, hideProgressModal, updateProgress → ./js/ui/notifications.js
// - openArtModal, closeArtModal, togglePrintSettings → ./js/ui/modal-manager.js
// - handleCustomImageUpload, clearCustomImage → ./js/upload/image-upload.js
// - processDecklist, clearDecklist, loadSampleDecklist → ./js/deck/deck-processor.js
// - renderResults, createCardElement, toggleCardFace → ./js/deck/card-renderer.js
// - generatePDF, blobToDataUrl → ./js/pdf/pdf-engine.js
// - checkApiHealth → ./js/api/api-client.js

window.deckFillApp = {
  // Funções movidas para módulos especializados - mantendo apenas estado e configuração
  currentCards: AppState.currentCards,
  showProgressMock, // Função de teste
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
        opt.classList.remove("border-purple-500");
        opt.classList.add("border-transparent");
        // Hide all selected overlays
        const overlay = opt.querySelector(".selected-overlay");
        if (overlay) overlay.classList.add("hidden");
      });

      // Highlight selected option
      this.classList.remove("border-transparent");
      this.classList.add("border-purple-500");

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
        ".back-option-card.border-purple-500",
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
          const originalText = copyPixBtn.textContent;
          copyPixBtn.textContent = "Copiado!";
          copyPixBtn.classList.add("bg-green-600");

          setTimeout(() => {
            copyPixBtn.textContent = originalText;
            copyPixBtn.classList.remove("bg-green-600");
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

console.log("Deck Fill App initialized");
