/**
 * Deck Fill - Deck Processor Module
 * Handles decklist processing and user actions
 */

/**
 * Processa o decklist enviado pelo usuário
 *
 * Fluxo de execução:
 * 1. Validação do input
 * 2. Prevenção de race conditions
 * 3. Estado da interface (loading)
 * 4. Comunicação com API
 * 5. Atualização de estado global
 * 6. Two-way data binding
 * 7. Renderização dos resultados
 *
 * @returns {Promise<void>}
 */

function updateDeckProcessingLoading() {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  const loadingMessages = {
    magic: {
      title: "Processando deck de Magic...",
      description: "Consultando a base local de cartas.",
      hint: "",
    },
    yugioh: {
      title: "Buscando cartas de Yu-Gi-Oh!...",
      description: "Consultando o banco local YGOPRODeck.",
      hint: "",
    },
    pokemon: {
      title: "Buscando cartas de Pokémon TCG...",
      description: "Consultando o banco local Pokemon TCG.",
      hint: "",
    },
  };

  const extraLoadingMessages = {
    lorcana: {
      title: "Buscando cartas de Disney Lorcana...",
      description: "Consultando o banco local Lorcast.",
      hint: "",
    },
    onepiece: {
      title: "Buscando cartas de One Piece...",
      description: "Consultando o banco local OPTCG.",
      hint: "",
    },
    fab: {
      title: "Buscando cartas de Flesh and Blood...",
      description: "Consultando o banco local GoAgain.",
      hint: "",
    },
  };

  const message =
    extraLoadingMessages[selectedGame] ||
    loadingMessages[selectedGame] ||
    loadingMessages.magic;

  if (elements.loadingTitle) {
    elements.loadingTitle.textContent = message.title;
  }

  if (elements.loadingDescription) {
    elements.loadingDescription.textContent = message.description;
  }

  if (elements.loadingHint) {
    elements.loadingHint.textContent = message.hint;

    if (message.hint) {
      elements.loadingHint.classList.remove("hidden");
    } else {
      elements.loadingHint.classList.add("hidden");
    }
  }

  console.log(`⏳ Loading de processamento: ${gameConfig.label}`);
}

async function processDecklist() {
  const decklist = elements.decklistInput.value.trim();

  // === VALIDAÇÃO ===
  if (!decklist) {
    showError("Por favor, cole um decklist para processar.");
    return;
  }

  // === PREVENÇÃO DE RACE CONDITIONS ===
  if (AppState.isProcessing) {
    console.log("Já está processando...");
    return;
  }

  // === ESTADO DA INTERFACE ===
  AppState.isProcessing = true;
  updateDeckProcessingLoading();
  showLoading();
  hideErrors();

  try {
    console.log("Enviando decklist para API...");

    // === COMUNICAÇÃO COM API ===
    const response = await fetch(`${AppConfig.API_BASE}/parse-deck`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        game: AppState.getSelectedGame(),
        decklist,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Resposta da API:", data);

    // === ATUALIZAÇÃO DE ESTADO ===
    AppState.currentCards = data.cards; // Armazena cartas processadas globalmente

    // === TWO-WAY DATA BINDING ===
    updateDecklistTextarea();

    // === RENDERIZAÇÃO ===
    renderResults(data);
  } catch (error) {
    console.error("Erro ao processar decklist:", error);
    showError("Erro ao processar decklist. Verifique se a API está online.");
  } finally {
    AppState.isProcessing = false;
    hideLoading();
  }
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
  AppState.currentCards = [];
}

/**
 * Carrega o decklist de exemplo
 */
function loadSampleDecklist() {
  // Limpar campo antes de inserir novo deck
  elements.decklistInput.value = "";
  elements.decklistInput.style.height = "auto";

  // Inserir novo deck
  const selectedGame = AppState.getSelectedGame();
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  elements.decklistInput.value = gameConfig.sampleDecklist;
  elements.decklistInput.style.height = "auto";
  elements.decklistInput.style.height =
    elements.decklistInput.scrollHeight + "px";

  // Destacar o botão
  elements.loadSampleBtn.classList.add("bg-df-success-dark");
  setTimeout(() => {
    elements.loadSampleBtn.classList.remove("bg-df-success-dark");
  }, 200);

  // Auto-processar o deck de exemplo
  setTimeout(() => {
    processDecklist();
  }, 300);
}
