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
  const message = GameConfigs.getGameLoadingCopy(gameConfig);

  if (elements.loadingTitle) {
    elements.loadingTitle.textContent = message.title;
  }

  if (elements.loadingDescription) {
    elements.loadingDescription.textContent = message.description;
  }

  if (elements.loadingHint) {
    elements.loadingHint.textContent = message.hint || "";

    if (message.hint) {
      elements.loadingHint.classList.remove("hidden");
    } else {
      elements.loadingHint.classList.add("hidden");
    }
  }

  console.log(
    `Loading de processamento: ${GameConfigs.getGameDisplayLabel(gameConfig)}`,
  );
}

function getCurrentResolvedPrintSettings() {
  if (window.PrintSettingsResolver?.getResolvedPrintSettings) {
    return window.PrintSettingsResolver.getResolvedPrintSettings();
  }

  return {
    outputMode: "normal",
    spacing: { gapMm: 2 },
    content: {
      includeRelatedTokens: false,
      printRelevantFaces: true,
      autoCompleteCategory: "off",
      preferredLanguage: "en",
    },
  };
}

async function requestDeckParse(decklist, selectedGame, resolvedSettings) {
  const response = await fetch(`${AppConfig.API_BASE}/parse-deck`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      game: selectedGame,
      decklist,
      preferred_language: resolvedSettings?.content?.preferredLanguage || "en",
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

function normalizeCardNameForDeckTools(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function getCardIdentitySet(cards) {
  const identities = new Set();

  cards.forEach((card) => {
    if (card?.id) {
      identities.add(`id:${card.id}`);
    }

    const normalizedName = normalizeCardNameForDeckTools(
      card?.decklist_name || card?.name,
    );

    if (normalizedName) {
      identities.add(`name:${normalizedName}`);
    }
  });

  return identities;
}

function hasCardIdentity(identities, card) {
  const normalizedName = normalizeCardNameForDeckTools(
    card?.decklist_name || card?.name,
  );

  return (
    (card?.id && identities.has(`id:${card.id}`)) ||
    (normalizedName && identities.has(`name:${normalizedName}`))
  );
}

function rememberCardIdentity(identities, card) {
  if (card?.id) {
    identities.add(`id:${card.id}`);
  }

  const normalizedName = normalizeCardNameForDeckTools(
    card?.decklist_name || card?.name,
  );

  if (normalizedName) {
    identities.add(`name:${normalizedName}`);
  }
}

function cardLooksLikeRelatedToken(card) {
  const component = normalizeCardNameForDeckTools(card?.related_component);
  const typeLine = normalizeCardNameForDeckTools(card?.type_line);

  return component === "token" || typeLine.includes("token");
}

async function fetchRelatedTokensForCard(card) {
  if (!card?.id) {
    return [];
  }

  const response = await fetch(
    `${AppConfig.API_BASE}/cards/${encodeURIComponent(card.id)}/related`,
  );

  if (!response.ok) {
    return [];
  }

  const payload = await response.json();
  return Array.isArray(payload.results) ? payload.results : [];
}

async function appendRelatedTokens(cards, selectedGame, resolvedSettings) {
  const shouldIncludeTokens =
    selectedGame === "magic" &&
    Boolean(resolvedSettings?.content?.includeRelatedTokens);

  if (!shouldIncludeTokens || !cards.length) {
    return cards;
  }

  const identities = getCardIdentitySet(cards);
  const processedIds = new Set();
  const relatedTokens = [];

  for (const card of cards) {
    if (!card?.id || processedIds.has(card.id)) {
      continue;
    }

    processedIds.add(card.id);

    try {
      const relatedCards = await fetchRelatedTokensForCard(card);

      relatedCards
        .filter((relatedCard) => cardLooksLikeRelatedToken(relatedCard))
        .filter(
          (relatedCard) =>
            relatedCard.image_uri_normal || relatedCard.image_uri_png,
        )
        .forEach((relatedCard) => {
          if (hasCardIdentity(identities, relatedCard)) {
            return;
          }

          const tokenCard = {
            ...relatedCard,
            is_related_token: true,
            parent_card_id: card.id,
            parent_card_name: card.name,
            has_relevant_secondary_face:
              CardImageResolver.hasRelevantSecondaryFace?.(relatedCard) || false,
          };

          rememberCardIdentity(identities, tokenCard);
          relatedTokens.push(tokenCard);
        });
    } catch (error) {
      console.warn("Nao foi possivel buscar tokens relacionados:", card.name, error);
    }
  }

  return [...cards, ...relatedTokens];
}

function getAutoCompleteCategory(selectedGame, categoryId) {
  const categories = GameConfigs.autocompleteCategories?.[selectedGame] || [];

  return categories.find(
    (category) =>
      category.id === categoryId ||
      (Array.isArray(category.aliases) && category.aliases.includes(categoryId)),
  );
}

function getAutoCompleteCandidates(selectedGame, categoryId) {
  const categories = GameConfigs.autocompleteCategories?.[selectedGame] || [];
  const selectedCategory = getAutoCompleteCategory(selectedGame, categoryId);
  const orderedCategories = [
    ...(selectedCategory ? [selectedCategory] : []),
    ...categories.filter((category) => category.id !== selectedCategory?.id),
  ];
  const names = [];
  const seen = new Set();

  orderedCategories.forEach((category) => {
    (category.cards || []).forEach((name) => {
      const normalizedName = normalizeCardNameForDeckTools(name);

      if (!normalizedName || seen.has(normalizedName)) {
        return;
      }

      seen.add(normalizedName);
      names.push(name);
    });
  });

  return names;
}

function calculateOpenSlotsOnLastPage(cards, resolvedSettings) {
  if (
    !cards.length ||
    !window.PdfLayout?.calculatePdfLayout ||
    !window.PdfCardList?.buildPrintableCardList
  ) {
    return 0;
  }

  const rawSettings =
    typeof getPrintSettings === "function"
      ? getPrintSettings()
      : window.PrintSettingsReader?.readRawPrintSettings?.() || {
          pageSize: "a4",
          gapSpacing: 2,
          scale: "normal",
        };
  const layout = PdfLayout.calculatePdfLayout(rawSettings, resolvedSettings);
  const cardsPerPage = Math.max(1, layout.cardsPerPage || 9);
  const printableCount = PdfCardList.buildPrintableCardList(
    cards,
    resolvedSettings,
  ).length;
  const remainder = printableCount % cardsPerPage;

  if (remainder === 0) {
    return 0;
  }

  return cardsPerPage - remainder;
}

async function appendAutoCompleteCards(cards, selectedGame, resolvedSettings) {
  const categoryId = resolvedSettings?.content?.autoCompleteCategory || "off";

  if (!categoryId || categoryId === "off") {
    return { cards, errors: [] };
  }

  const openSlots = calculateOpenSlotsOnLastPage(cards, resolvedSettings);

  if (openSlots <= 0) {
    return { cards, errors: [] };
  }

  const identities = getCardIdentitySet(cards);
  const candidates = getAutoCompleteCandidates(selectedGame, categoryId)
    .filter((name) => !identities.has(`name:${normalizeCardNameForDeckTools(name)}`))
    .slice(0, openSlots);

  if (!candidates.length) {
    return { cards, errors: [] };
  }

  const category = getAutoCompleteCategory(selectedGame, categoryId);
  const fillerDecklist = candidates.map((name) => `1 ${name}`).join("\n");
  const autoData = await requestDeckParse(
    fillerDecklist,
    selectedGame,
    resolvedSettings,
  );
  const initialPrintableCount = PdfCardList.buildPrintableCardList(
    cards,
    resolvedSettings,
  ).length;
  const maxPrintableCount = initialPrintableCount + openSlots;
  const autoCards = [];

  for (const card of autoData.cards || []) {
    const candidate = {
      ...card,
      is_auto_completed: true,
      auto_complete_category: category?.label || categoryId,
    };
    const candidatePrintableCount = PdfCardList.buildPrintableCardList(
      [...cards, ...autoCards, candidate],
      resolvedSettings,
    ).length;

    if (candidatePrintableCount > maxPrintableCount) {
      continue;
    }

    autoCards.push(candidate);

    if (candidatePrintableCount === maxPrintableCount) {
      break;
    }
  }

  return {
    cards: [...cards, ...autoCards],
    errors: autoData.errors || [],
  };
}

async function enrichDeckData(data, selectedGame, resolvedSettings) {
  let cards = Array.isArray(data.cards) ? data.cards : [];

  cards = await appendRelatedTokens(cards, selectedGame, resolvedSettings);

  const autoCompleteResult = await appendAutoCompleteCards(
    cards,
    selectedGame,
    resolvedSettings,
  );

  cards = autoCompleteResult.cards;

  return {
    ...data,
    cards,
    total_cards: cards.length,
    errors: [...(data.errors || []), ...(autoCompleteResult.errors || [])],
  };
}

async function processDecklist() {
  const decklist = elements.decklistInput.value.trim();

  // === VALIDACAO ===
  if (!decklist) {
    showError("Por favor, cole um decklist para processar.");
    return;
  }

  // === PREVENCAO DE RACE CONDITIONS ===
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
    const selectedGame = AppState.getSelectedGame();
    const resolvedSettings = getCurrentResolvedPrintSettings();
    const processingStartedAt = performance.now();

    // === COMUNICACAO COM API ===
    const data = await requestDeckParse(
      decklist,
      selectedGame,
      resolvedSettings,
    );
    const enrichedData = await enrichDeckData(
      data,
      selectedGame,
      resolvedSettings,
    );
    enrichedData.processing_time_ms = Math.round(
      (performance.now() - processingStartedAt) * 100,
    ) / 100;
    console.log("Resposta da API:", data);

    // === ATUALIZACAO DE ESTADO ===
    AppState.currentCards = enrichedData.cards; // Armazena cartas processadas globalmente

    // === TWO-WAY DATA BINDING ===
    updateDecklistTextarea();

    // === RENDERIZACAO ===
    renderResults(enrichedData);
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
