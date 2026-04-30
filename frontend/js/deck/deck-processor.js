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
      body: JSON.stringify({ decklist }),
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
  elements.decklistInput.value = AppConfig.SAMPLE_DECKLIST;
  elements.decklistInput.style.height = "auto";
  elements.decklistInput.style.height =
    elements.decklistInput.scrollHeight + "px";

  // Destacar o botão
  elements.loadSampleBtn.classList.add("bg-green-700");
  setTimeout(() => {
    elements.loadSampleBtn.classList.remove("bg-green-700");
  }, 200);

  // Auto-processar o deck de exemplo
  setTimeout(() => {
    processDecklist();
  }, 300);
}
