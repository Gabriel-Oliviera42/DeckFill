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

// Constante do verso padrão do Magic
const MTG_BACK_URL =
  "https://cards.scryfall.io/normal/back/0/a/0aeebaf5-8c7d-4636-9e82-8c27447861f7.jpg";

// Configuração da API
const API_BASE = "http://localhost:8000";

// Estado da aplicação (variáveis globais compartilhadas)
let currentCards = []; // Array de cartas processadas pela API
let isGenerationCancelled = false; // Flag para cancelar geração de PDF
let isProcessing = false; // Flag para evitar múltiplos processamentos simultâneos
let currentModalCardIndex = null; // Índice da carta atualmente selecionada no modal de artes
let customImages = new Map(); // Armazena imagens personalizadas (cardIndex -> {front: url, back: url})
let globalCustomBackImage = null; // Armazena o DataURL do verso global personalizado

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
  smartFill: document.getElementById("smart-fill"), // Preenchimento inteligente

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

// ================================================================================
// DADOS DE EXEMPLO
// ================================================================================

// Decklist de exemplo para demonstração e testes
const SAMPLE_DECKLIST = `4x Lightning Bolt
4x Chain Lightning
4x Lava Dart
4x Rift Bolt
4x Flame Rift
4x Price of Progress
4x Fireblast
4x Searing Blaze
4x Lightning Helix
4x Swords to Plowshares
4x Force of Will
4x Daze
4x Brainstorm
4x Ponder
4x Preordain
4x Volcanic Island
4x Plateau
4x Tropical Island
2x Island
1x Mountain
1x Plains`;

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
    isGenerationCancelled = true;
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

  // Inicializa delegação de eventos para cliques nas cartas
  initializeCardClickDelegation();

  // Listener para switch de impressão dupla face
  const printDoubleFacedCheckbox =
    document.getElementById("print-double-faced");
  const doubleFaceSettings = document.getElementById("double-face-settings");
  const globalBackType = document.getElementById("global-back-type");
  const globalBackUploadSection = document.getElementById(
    "global-back-upload-section",
  );
  const globalBackUpload = document.getElementById("global-back-upload");
  const globalBackFilename = document.getElementById("global-back-filename");

  if (printDoubleFacedCheckbox && doubleFaceSettings) {
    printDoubleFacedCheckbox.addEventListener("change", (e) => {
      if (e.target.checked) {
        doubleFaceSettings.classList.remove("hidden");
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
            globalCustomBackImage = event.target.result;
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
}

/**
 * Verifica se a API está online
 */
async function checkApiHealth() {
  try {
    const response = await fetch(`${API_BASE}/health`);
    const data = await response.json();

    if (data.status === "healthy") {
      elements.statusBadge.innerHTML = "🟢 API Online";
      elements.statusBadge.className =
        "bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium";
      console.log("API Health Check:", data);
    } else {
      throw new Error("API not healthy");
    }
  } catch (error) {
    elements.statusBadge.innerHTML = "🔴 API Offline";
    elements.statusBadge.className =
      "bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium";
    console.error("API Health Check failed:", error);
    showError("API está offline. Inicie o servidor backend: python main.py");
  }
}

// ================================================================================
// FUNÇÕES PRINCIPAIS DA APLICAÇÃO
// ================================================================================

/**
 * Processa o decklist enviado pelo usuário
 *
 * Fluxo de execução:
 * 1. Validação do input
 * 2. Prevenção de processamento duplicado
 * 3. Envio para API FastAPI (/parse-deck)
 * 4. Processamento da resposta
 * 5. Renderização dos resultados
 *
 * @returns {Promise<void>}
 */
async function processDecklist() {
  const decklist = elements.decklistInput.value.trim();

  // === VALIDAÇÃO ===
  if (!decklist) {
    showError("Por favor, cole um decklist para processar.");
    return;
  }

  // === PREVENÇÃO DE RACE CONDITIONS ===
  if (isProcessing) {
    console.log("Já está processando...");
    return;
  }

  // === ESTADO DA INTERFACE ===
  isProcessing = true;
  showLoading();
  hideErrors();

  try {
    console.log("Enviando decklist para API...");

    // === COMUNICAÇÃO COM API ===
    const response = await fetch(`${API_BASE}/parse-deck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ decklist }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta da API:", data);

    // === ATUALIZAÇÃO DE ESTADO ===
    currentCards = data.cards; // Armazena cartas processadas globalmente

    // === TWO-WAY DATA BINDING ===
    updateDecklistTextarea();

    // === RENDERIZAÇÃO ===
    renderResults(data);
  } catch (error) {
    console.error("Erro ao processar decklist:", error);
    showError("Erro ao processar decklist. Verifique se a API está online.");
  } finally {
    isProcessing = false;
    hideLoading();
  }
}

/**
 * Renderiza os resultados
 */
function renderResults(data) {
  const { cards, total_cards, processing_time_ms, errors } = data;

  // Atualizar summary
  elements.resultsSummary.textContent = `${total_cards} cartas encontradas em ${processing_time_ms}ms`;

  // Limpar grid
  elements.cardsGrid.innerHTML = "";

  // Renderizar cards
  cards.forEach((card, index) => {
    const cardElement = createCardElement(card, index);
    elements.cardsGrid.appendChild(cardElement);
  });

  // Adicionar handlers de clique para abrir modal
  addCardClickHandlers();

  // Mostrar errors se houver
  if (errors && errors.length > 0) {
    showErrors(errors);
  }

  // Mostrar seção de resultados
  elements.resultsSection.classList.remove("hidden");

  // Scroll para resultados
  elements.resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/**
 * Cria um elemento de card
 */
function createCardElement(card, index) {
  const cardDiv = document.createElement("div");
  cardDiv.className =
    "card-item bg-white rounded-xl shadow-lg overflow-hidden fade-in";

  if (card.image_uri_normal) {
    // Lógica de DFC (Botão Flip)
    const isDFC = card.image_uri_back_normal || card.image_uri_back_png;
    const frontUrl = card.image_uri_normal;
    const backUrl = card.image_uri_back_normal || card.image_uri_back_png || "";

    const flipButton = isDFC
      ? `
            <button class="flip-btn absolute top-2 left-2 bg-gray-800 bg-opacity-60 text-white p-1 rounded-full hover:bg-opacity-80 transition z-10" 
                    title="Virar Carta" 
                    onclick="toggleCardFace(this, '${frontUrl}', '${backUrl}')">
                ↻
            </button>
        `
      : "";

    cardDiv.innerHTML = `
            <div class="relative aspect-[2.5/3.5]">
                ${flipButton}
                <img 
                    src="${frontUrl}" 
                    alt="${card.name}"
                    class="w-full h-full object-contain cursor-pointer transition-transform hover:scale-105"
                    data-current-face="front"
                    loading="lazy"
                />
                <div class="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs z-10">
                    ${card.set_code}
                </div>
            </div>
            <div class="p-3">
                <h3 class="font-bold text-gray-800 text-sm truncate">${card.name}</h3>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-600">#${card.collector_number}</span>
                    <span class="text-xs text-gray-500">${(card.lang || "EN").toUpperCase()}</span>
                </div>
            </div>
        `;

    // Amarra o evento de clique na imagem para abrir o Modal
    const cardImage = cardDiv.querySelector("img");
    if (cardImage) {
      cardImage.addEventListener("click", () => {
        if (typeof openArtModal === "function") {
          openArtModal(card, index);
        }
      });
    }

    // Impede que clicar no botão de Flip abra o modal sem querer
    const flipBtn = cardDiv.querySelector(".flip-btn");
    if (flipBtn) {
      flipBtn.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  return cardDiv;
}

/**
 * Mostra a tela de loading
 */
function showLoading() {
  elements.loadingSection.classList.remove("hidden");
  elements.resultsSection.classList.add("hidden");
  elements.processBtn.disabled = true;
  elements.processBtn.innerHTML = `
        <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Processando...</span>
    `;
}

/**
 * Esconde a tela de loading
 */
function hideLoading() {
  elements.loadingSection.classList.add("hidden");
  elements.processBtn.disabled = false;
  elements.processBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span>Processar Deck</span>
    `;
}

/**
 * Limpa o decklist
 */
function clearDecklist() {
  elements.decklistInput.value = "";
  elements.decklistInput.style.height = "auto";
  elements.resultsSection.classList.add("hidden");
  elements.loadingSection.classList.add("hidden");
  hideErrors();
  currentCards = [];
}

/**
 * Carrega o decklist de exemplo
 */
function loadSampleDecklist() {
  elements.decklistInput.value = SAMPLE_DECKLIST;
  elements.decklistInput.style.height = "auto";
  elements.decklistInput.style.height =
    elements.decklistInput.scrollHeight + "px";

  // Destacar o botão
  elements.loadSampleBtn.classList.add("bg-green-700");
  setTimeout(() => {
    elements.loadSampleBtn.classList.remove("bg-green-700");
  }, 200);
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in";
  errorDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;

  document.body.appendChild(errorDiv);

  // Auto-remove após 5 segundos
  setTimeout(() => {
    errorDiv.remove();
  }, 5000);
}

/**
 * Mostra erros da API
 */
function showErrors(errors) {
  elements.errorsList.innerHTML = "";
  errors.forEach((error) => {
    const li = document.createElement("li");
    li.textContent = error;
    elements.errorsList.appendChild(li);
  });
  elements.errorsSection.classList.remove("hidden");
}

/**
 * Esconde seção de erros
 */
function hideErrors() {
  elements.errorsSection.classList.add("hidden");
}

/**
 * Processa imagem com Sangria (Bleed) usando técnica de Edge Smearing
 * Estende apenas os pixels das bordas mantendo o centro intacto
 */
async function processImageWithBleed(blob, bleedSizeInMm) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Calcular pixels de sangria proporcionais ao tamanho real da carta (63x88mm)
        const bleedPxX = Math.floor(img.width * (bleedSizeInMm / 63));
        const bleedPxY = Math.floor(img.height * (bleedSizeInMm / 88));

        // Criar canvas com dimensões totais incluindo sangria
        const canvas = document.createElement("canvas");
        canvas.width = img.width + bleedPxX * 2;
        canvas.height = img.height + bleedPxY * 2;
        const ctx = canvas.getContext("2d");

        // Desenhar imagem original perfeitamente no centro
        ctx.drawImage(img, bleedPxX, bleedPxY, img.width, img.height);

        // Esticar as 4 bordas copiando fatias de 1 pixel da imagem original
        // Topo
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          1,
          bleedPxX,
          0,
          img.width,
          bleedPxY,
        );
        // Base
        ctx.drawImage(
          img,
          0,
          img.height - 1,
          img.width,
          1,
          bleedPxX,
          bleedPxY + img.height,
          img.width,
          bleedPxY,
        );
        // Esquerda
        ctx.drawImage(
          img,
          0,
          0,
          1,
          img.height,
          0,
          bleedPxY,
          bleedPxX,
          img.height,
        );
        // Direita
        ctx.drawImage(
          img,
          img.width - 1,
          0,
          1,
          img.height,
          bleedPxX + img.width,
          bleedPxY,
          bleedPxX,
          img.height,
        );

        // Esticar os 4 cantos pegando o pixel 1x1 das extremidades
        // Canto Superior Esquerdo
        ctx.drawImage(img, 0, 0, 1, 1, 0, 0, bleedPxX, bleedPxY);
        // Canto Superior Direito
        ctx.drawImage(
          img,
          img.width - 1,
          0,
          1,
          1,
          bleedPxX + img.width,
          0,
          bleedPxX,
          bleedPxY,
        );
        // Canto Inferior Esquerdo
        ctx.drawImage(
          img,
          0,
          img.height - 1,
          1,
          1,
          0,
          bleedPxY + img.height,
          bleedPxX,
          bleedPxY,
        );
        // Canto Inferior Direito
        ctx.drawImage(
          img,
          img.width - 1,
          img.height - 1,
          1,
          1,
          bleedPxX + img.width,
          bleedPxY + img.height,
          bleedPxX,
          bleedPxY,
        );

        // Limpar URL e retornar base64 do canvas
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}

// ================================================================================
// GERAÇÃO DE PDF - FUNÇÃO PRINCIPAL
// ================================================================================

/**
 * Gera PDF com layout 3x3 em A4 usando dimensões MTG oficiais (63x88mm)
 *
 * Arquitetura de geração:
 * - Sistema de DUAS PASSADAS para otimizar desenho de marcas de corte
 * - Passada 1: Coleta de coordenadas e desenho de linhas de fundo (Background Lines)
 * - Passada 2: Desenho de cartas, bordas e cruzes de sobreposição (Foreground Crosses)
 * - Usa jsPDF v2.5.1 com conversão Base64 para evitar CORS
 *
 * Fluxo de execução:
 * 1. Validação e setup inicial
 * 2. Captura de configurações do usuário
 * 3. Inicialização do jsPDF
 * 4. Cálculo de layout e dimensões
 * 5. Passada 1: Desenhar linhas de fundo (se cropMarks ativado)
 * 6. Passada 2: Desenhar cartas e elementos visuais
 * 7. Salvamento do PDF
 *
 * @returns {Promise<void>}
 */
async function generatePDF() {
  // === VALIDAÇÃO INICIAL ===
  if (!currentCards || currentCards.length === 0) {
    showError("Nenhuma carta para gerar PDF. Processe um decklist primeiro.");
    return;
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
    console.log(`🃏 Processando ${currentCards.length} cartas...`);

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

    if (isDoubleFacedPrint) {
      // MODO DUPLO: Não duplicar DFCs, usar apenas as cartas originais
      cardsToPrint.push(...currentCards);
      console.log(
        `📊 Modo Duplo Face: ${cardsToPrint.length} cartas (sem duplicação)`,
      );
    } else {
      // MODO NORMAL: Duplicar DFCs como versos separados
      for (let i = 0; i < currentCards.length; i++) {
        const card = currentCards[i];
        cardsToPrint.push(card);

        // Se for DFC, duplicar para o verso
        if (card.image_uri_back_normal || card.image_uri_back_png) {
          console.log(`🔄 Duplicando DFC: ${card.name}`);
          const backCard = { ...card };
          backCard.image_uri_normal =
            card.image_uri_back_normal || card.image_uri_png;
          backCard.image_uri_png =
            card.image_uri_back_png || card.image_uri_normal;
          cardsToPrint.push(backCard);
        }
      }
      console.log(
        `📊 Modo Normal: ${cardsToPrint.length} cartas (com duplicação)`,
      );
    }
    console.groupEnd();

    // ================================================================================
    // PASSADA 1: COLETA DE COORDENADAS PARA BACKGROUND LINES
    // ================================================================================
    // PASSADA 1: COLETA DE COORDENADAS PARA BACKGROUND LINES
    // ================================================================================
    console.group("🔍 Passada 1: Coleta de Coordenadas para Background Lines");

    // Coleta de coordenadas por página para desenhar linhas de fundo
    const pageCoordinates = new Map(); // pageIndex -> {xCoords: Set, yCoords: Set}

    for (let i = 0; i < cardsToPrint.length; i++) {
      if (isGenerationCancelled) {
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

    for (
      let pageIndex = 0;
      pageIndex < Math.ceil(currentCards.length / cardsPerPage);
      pageIndex++
    ) {
      if (isGenerationCancelled) {
        break;
      }

      console.log(
        `📄 Processando Página ${pageIndex + 1}/${Math.ceil(currentCards.length / cardsPerPage)}`,
      );

      // === NAVEGAÇÃO DE PÁGINAS ===
      if (pageIndex > 0) {
        doc.addPage();
        console.log(`➕ Adicionando nova página: ${pageIndex + 1}`);
      }
      doc.setPage(pageIndex + 1);
      console.log(`🎯 Página ativa: ${pageIndex + 1}`);

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

      for (let i = startCardIndex; i < endCardIndex; i++) {
        if (isGenerationCancelled) {
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
          cardsToPrint.length,
          currentPage,
        );

        // === CÁLCULO DE POSIÇÃO ===
        const cardIndexInPage = i % cardsPerPage;
        const col = cardIndexInPage % cols;
        const row = Math.floor(cardIndexInPage / cols);
        const x = marginX + col * (cardWidth + spacingX);
        const y = marginY + row * (cardHeight + spacingY);

        console.log(
          `📍 Carta ${i + 1}: Coords (${x.toFixed(1)}, ${y.toFixed(1)})`,
        );

        // === BUSCA E PROCESSAMENTO DE IMAGEM ===
        try {
          // Obter URL da imagem (prioriza imagem personalizada)
          const imageUrl = getCardImageUrl(i, card);
          if (!imageUrl) {
            console.warn(`⚠️ Carta sem imagem: ${card.name}`);
            continue;
          }

          // Verificar se é imagem personalizada para log apropriado
          const isCustom = customImages.has(i);
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
    }

    console.groupEnd(); // Fecha o grupo da Passada 2

    // === SALVAMENTO DO PDF ===
    console.log("💾 Salvando PDF...");
    updateProgress(
      100,
      "Concluído!",
      currentCards.length,
      currentCards.length,
      Math.ceil(currentCards.length / cardsPerPage),
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

/**
 * Abre o modal de escolha de artes
 */
async function openArtModal(card, cardIndex) {
  console.log("🔍 openArtModal chamado com:", { card: card.name, cardIndex });
  currentModalCardIndex = cardIndex;
  console.log("✅ currentModalCardIndex definido como:", currentModalCardIndex);

  // Configurar modal
  elements.modalCardName.textContent = card.name;
  elements.artModal.classList.remove("hidden");
  elements.modalLoading.classList.remove("hidden");
  elements.modalArtGrid.classList.add("hidden");
  elements.modalError.classList.add("hidden");

  // Resetar upload ao abrir modal
  resetUploadSection();

  // Verificar se é DFC para mostrar upload do verso
  const isDFC = card.image_uri_back_normal || card.image_uri_back_png;
  if (isDFC) {
    console.log("🔄 Carta é DFC, mostrando upload do verso");
    elements.uploadBackSection.classList.remove("hidden");
  } else {
    console.log("📄 Carta não é DFC, escondendo upload do verso");
    elements.uploadBackSection.classList.add("hidden");
  }

  try {
    console.log(`Buscando artes para: ${card.name}`);

    // Buscar todas as impressões da carta
    const response = await fetch(
      `${API_BASE}/printings/${encodeURIComponent(card.name)}`,
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const printings = await response.json();

    if (!printings || printings.length === 0) {
      throw new Error("Nenhuma arte encontrada");
    }

    console.log(`Encontradas ${printings.length} artes para ${card.name}`);

    // Renderizar artes no grid
    renderArtOptions(printings, card);
  } catch (error) {
    console.error("Erro ao buscar artes:", error);
    elements.modalLoading.classList.add("hidden");
    elements.modalError.classList.remove("hidden");
  }
}

/**
 * Renderiza as opções de arte no modal
 */
function renderArtOptions(printings, currentCard) {
  elements.modalArtGrid.innerHTML = "";
  elements.modalLoading.classList.add("hidden");
  elements.modalArtGrid.classList.remove("hidden");

  printings.forEach((printing, index) => {
    const artOption = document.createElement("div");
    artOption.className = "relative cursor-pointer group";

    // Destacar a arte atualmente selecionada
    const isCurrentArt =
      printing.image_uri_normal === currentCard.image_uri_normal;

    artOption.innerHTML = `
            <div class="relative aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 ${isCurrentArt ? "border-mtg-blue" : "border-gray-300"} group-hover:border-mtg-blue transition-colors">
                <img 
                    src="${printing.image_uri_normal}" 
                    alt="${printing.name} - ${printing.set_code}"
                    class="w-full h-full object-contain"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwiPsOJbWFnZW0gbmFvIGRpc3BvbsOtdmVsPC90ZXh0Pgo8L3N2Zz4K'"
                />
                <div class="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    ${printing.set_code}
                </div>
                <div class="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    #${printing.collector_number}
                </div>
                ${isCurrentArt ? '<div class="absolute top-1 left-1 bg-mtg-blue text-white px-2 py-1 rounded text-xs">Atual</div>' : ""}
            </div>
            <div class="mt-1 text-center">
                <p class="text-xs font-medium text-gray-700">${printing.set_code}</p>
                <p class="text-xs text-gray-500">#${printing.collector_number}</p>
            </div>
        `;

    // Adicionar evento de clique
    artOption.addEventListener("click", () => selectArt(printing, currentCard));

    elements.modalArtGrid.appendChild(artOption);
  });
}

/**
 * Seleciona uma nova arte para a carta
 */
function selectArt(newPrinting, currentCard) {
  console.log(
    `Selecionando nova arte: ${newPrinting.set_code} #${newPrinting.collector_number}`,
  );

  // Atualizar o objeto da carta no array principal
  currentCards[currentModalCardIndex] = {
    ...currentCards[currentModalCardIndex],
    image_uri_normal: newPrinting.image_uri_normal,
    image_uri_png: newPrinting.image_uri_png,
    image_uri_back_normal: newPrinting.image_uri_back_normal || null,
    image_uri_back_png: newPrinting.image_uri_back_png || null,
    set_code: newPrinting.set_code,
    collector_number: newPrinting.collector_number,
  };

  // Atualizar apenas o elemento específico no DOM
  updateCardElement(currentModalCardIndex);

  // === TWO-WAY DATA BINDING ===
  updateDecklistTextarea();

  // Fechar modal
  closeArtModal();
}

/**
 * Atualiza apenas o elemento de carta específico no DOM
 */
function updateCardElement(cardIndex) {
  const card = currentCards[cardIndex];
  const cardElements = elements.cardsGrid.children;

  if (cardElements[cardIndex]) {
    const newCardElement = createCardElement(card, cardIndex);
    // Garante que o novo elemento tenha cursor pointer
    newCardElement.style.cursor = "pointer";
    cardElements[cardIndex].replaceWith(newCardElement);
  }
}

/**
 * Fecha o modal de artes
 */
function closeArtModal() {
  // Validação de DFC: OBRIGA a ter as duas imagens antes de fechar.
  if (currentModalCardIndex !== null && typeof currentCards !== "undefined") {
    const card = currentCards[currentModalCardIndex];
    const isDFC = card.image_uri_back_normal || card.image_uri_back_png;
    const customData = customImages.get(currentModalCardIndex);

    if (isDFC && customData) {
      const hasFront = !!customData.front;
      const hasBack = !!customData.back;

      // Se enviou apenas uma das faces, bloqueia o fechamento
      if ((hasFront && !hasBack) || (!hasFront && hasBack)) {
        alert(
          '⚠️ Para Cartas Dupla-Face, você deve enviar as duas artes (Frente e Verso) ou remover a arte personalizada atual usando o botão "Remover".',
        );
        return; // Impede o fechamento do modal
      }
    }
  }

  const artModal = document.getElementById("art-modal");
  if (artModal) {
    artModal.classList.add("hidden");
  }
  currentModalCardIndex = null;
}

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

      if (cardIndex !== -1 && currentCards[cardIndex]) {
        openArtModal(currentCards[cardIndex], cardIndex);
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

/**
 * Toggle do Painel de Configurações de Impressão
 */
function togglePrintSettings() {
  const isHidden = elements.printSettingsContent.classList.contains("hidden");

  if (isHidden) {
    elements.printSettingsContent.classList.remove("hidden");
    elements.printSettingsChevron.classList.add("rotate-180");
  } else {
    elements.printSettingsContent.classList.add("hidden");
    elements.printSettingsChevron.classList.remove("rotate-180");
  }
}

/**
 * Atualiza o valor exibido do slider Gap
 */
function updateGapValue() {
  const value = parseFloat(elements.gapSpacing.value);
  elements.gapValue.textContent = `${value.toFixed(1)} mm`;
}

/**
 * Mostra o Modal de Progresso
 */
function showProgressModal() {
  elements.progressModal.classList.remove("hidden");
  updateProgress(0, "Iniciando...", 0, 0);
}

/**
 * Esconde o Modal de Progresso
 */
function hideProgressModal() {
  elements.progressModal.classList.add("hidden");
}

/**
 * Atualiza a barra de progresso e status
 */
function updateProgress(
  percentage,
  status,
  currentCard,
  totalCards,
  currentPage = 0,
) {
  const roundedPercentage = Math.round(percentage);
  elements.progressBar.style.width = `${roundedPercentage}%`;
  elements.progressPercentage.textContent = `${roundedPercentage}%`;
  elements.progressStatus.textContent = `Status: ${status}`;
  elements.progressCards.textContent = `Carta: ${currentCard} de ${totalCards}`;
  elements.progressPages.textContent = `Página atual: ${currentPage}`;
}

/**
 * Função Mock para Testar o Modal de Progresso
 */
function showProgressMock() {
  showProgressModal();

  let progress = 0;
  const totalCards = currentCards.length || 21;
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

/**
 * Lida com o upload de imagem personalizada (frente)
 */
function handleCustomImageUpload(event) {
  console.log("🔍 handleCustomImageUpload disparado!");
  console.log("🔍 currentModalCardIndex:", currentModalCardIndex);

  const file = event.target.files[0];
  console.log("🔍 Arquivo selecionado:", file);

  if (!file) {
    console.log("⚠️ Nenhum arquivo selecionado");
    return;
  }

  // Validar se é uma imagem
  if (!file.type.startsWith("image/")) {
    console.error("❌ Arquivo não é uma imagem:", file.type);
    showError("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  // Validar tamanho (máximo 10MB)
  if (file.size > 10 * 1024 * 1024) {
    console.error("❌ Arquivo muito grande:", file.size);
    showError("A imagem deve ter no máximo 10MB.");
    return;
  }

  console.log("✅ Arquivo validado, iniciando leitura...");

  // Ler e converter a imagem
  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;
    console.log("✅ Imagem carregada, tamanho:", imageUrl.length);

    // Armazenar a imagem personalizada
    if (currentModalCardIndex !== null) {
      // Obter imagens existentes ou criar novo objeto
      const existingImages = customImages.get(currentModalCardIndex) || {};
      customImages.set(currentModalCardIndex, {
        ...existingImages,
        front: imageUrl,
      });
      console.log("✅ Imagem da frente armazenada no Map customImages");

      // Atualizar a carta no array principal
      currentCards[currentModalCardIndex] = {
        ...currentCards[currentModalCardIndex],
        image_uri_normal: imageUrl,
        image_uri_png: imageUrl,
      };

      // Mostrar preview
      showUploadPreview(imageUrl);

      // Atualizar a imagem da carta no grid principal
      updateCardElement(currentModalCardIndex);
    }
  };
  reader.onerror = function (e) {
    console.error("❌ Erro ao ler arquivo:", e);
    showError("Erro ao ler o arquivo de imagem.");
  };
  reader.readAsDataURL(file);
}

function handleCustomImageUploadBack(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    console.error("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;

    if (currentModalCardIndex !== null) {
      // Pega o estado atual (se houver imagem da frente já salva)
      const existingImages = customImages.get(currentModalCardIndex) || {
        front: null,
        back: null,
      };

      // Salva a nova imagem do verso
      customImages.set(currentModalCardIndex, {
        ...existingImages,
        back: imageUrl,
      });

      // Atualizar a carta no array principal
      currentCards[currentModalCardIndex] = {
        ...currentCards[currentModalCardIndex],
        image_uri_back_normal: imageUrl,
        image_uri_back_png: imageUrl,
      };

      // Mostra o preview visual
      if (typeof showUploadPreviewBack === "function") {
        showUploadPreviewBack(imageUrl);
      } else {
        const previewContainer = document.getElementById("upload-preview-back");
        const imgElement = document.getElementById("upload-preview-img-back");
        if (previewContainer && imgElement) {
          imgElement.src = imageUrl;
          previewContainer.classList.remove("hidden");
        }
      }

      console.log(
        `📸 Imagem de verso personalizada carregada para carta ${currentModalCardIndex}`,
      );

      // Atualizar a carta no grid principal
      updateCardElement(currentModalCardIndex);
    }
  };
  reader.readAsDataURL(file);
}

function clearCustomImageBack() {
  if (currentModalCardIndex !== null) {
    const existingImages = customImages.get(currentModalCardIndex);
    if (existingImages) {
      customImages.set(currentModalCardIndex, {
        ...existingImages,
        back: null,
      });
    }

    const previewContainer = document.getElementById("upload-preview-back");
    const imgElement = document.getElementById("upload-preview-img-back");
    const fileInput = document.getElementById("custom-image-upload-back");

    if (previewContainer) previewContainer.classList.add("hidden");
    if (imgElement) imgElement.src = "";
    if (fileInput) fileInput.value = "";

    console.log(
      `🗑️ Imagem de verso removida para carta ${currentModalCardIndex}`,
    );
  }
}

/**
 * Mostra o preview da imagem carregada
 */
function showUploadPreview(imageUrl) {
  elements.uploadPreview.classList.remove("hidden");
  elements.uploadPreviewImg.src = imageUrl;
  console.log("✅ Preview atualizado");
}

/**
 * Reseta a seção de upload ao abrir o modal
 */
function resetUploadSection() {
  // Reset da frente
  elements.uploadPreview.classList.add("hidden");
  elements.uploadPreviewImg.src = "";
  elements.customImageUpload.value = "";

  // Reset do verso
  elements.uploadPreviewBack.classList.add("hidden");
  elements.uploadPreviewImgBack.src = "";
  elements.customImageUploadBack.value = "";

  console.log("✅ Seção de upload resetada");
}

/**
 * Limpa a imagem personalizada
 */
function clearCustomImage() {
  if (currentModalCardIndex !== null) {
    const existingImages = customImages.get(currentModalCardIndex) || {};
    customImages.set(currentModalCardIndex, {
      ...existingImages,
      front: null,
    });

    // Restaurar imagem original
    restoreOriginalImage(currentModalCardIndex);

    console.log(
      `🗑️ Imagem personalizada removida da carta ${currentModalCardIndex}`,
    );
  }
}

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
  if (cardElements[cardIndex] && currentCards[cardIndex]) {
    const imgElement = cardElements[cardIndex].querySelector("img");
    if (imgElement) {
      const originalUrl =
        currentCards[cardIndex].image_uri_png ||
        currentCards[cardIndex].image_uri_normal;
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
  if (customImages.has(cardIndex)) {
    const customImagesData = customImages.get(cardIndex);
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
 * Two-Way Data Binding: Atualiza o textarea do decklist com base nas cartas atuais
 */
function updateDecklistTextarea() {
  const cardCounts = {};

  // Agrupa as cartas e ignora os versos (para não duplicar no texto)
  currentCards.forEach((card) => {
    if (card.name.endsWith(" (Verso)")) return;

    const key = `${card.name} (${card.set_code}) ${card.collector_number}`;
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
 * Função global para alternar entre frente e verso da carta
 */
function toggleCardFace(button, frontUrl, backUrl) {
  const img = button.parentElement.querySelector("img");
  const isCurrentlyFront = img.dataset.currentFace !== "back";

  if (isCurrentlyFront && backUrl) {
    // Mostra o verso
    img.src = backUrl;
    img.dataset.currentFace = "back";
    button.innerHTML = "↺";
    button.title = "Mostrar Frente";
  } else {
    // Mostra a frente
    img.src = frontUrl;
    img.dataset.currentFace = "front";
    button.innerHTML = "↻";
    button.title = "Virar Carta";
  }
}

// Exportar funções para debug (console)
window.deckFillApp = {
  processDecklist,
  clearDecklist,
  loadSampleDecklist,
  generatePDF,
  openArtModal,
  currentCards,
  checkApiHealth,
  showProgressMock, // Função de teste
  getPrintSettings,
  togglePrintSettings,
  showProgressModal,
  hideProgressModal,
  updateProgress,
};

console.log("Deck Fill App initialized");
