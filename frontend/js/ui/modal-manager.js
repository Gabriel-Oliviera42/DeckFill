/**
 * Deck Fill - Modal Manager Module
 * Handles artwork selection and print settings.
 */

let activeArtModalCard = null;
let activeArtSources = [];

async function openArtModal(card, cardIndex) {
  AppState.currentModalCardIndex = cardIndex;
  activeArtModalCard = card;

  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);

  elements.modalCardName.textContent = card.name;

  if (elements.modalGameLabel) {
    elements.modalGameLabel.textContent =
      `${GameConfigs.getGameDisplayLabel(gameConfig)} artes - ${gameConfig.sourceLabel}`;
  }

  if (elements.artSearchInput) {
    elements.artSearchInput.value = "";
    elements.artSearchInput.placeholder = `Buscar outra carta em ${GameConfigs.getGameShortLabel(gameConfig)}...`;
  }

  setArtResultCount(0);
  elements.artModal.classList.remove("hidden");
  elements.modalLoading.classList.remove("hidden");
  elements.modalArtGrid.classList.add("hidden");
  elements.modalError.classList.add("hidden");

  resetUploadSection();

  const isDFC = CardImageResolver.isDoubleFacedCard(card);
  if (elements.uploadBackSection) {
    elements.uploadBackSection.classList.toggle("hidden", !isDFC);
  }

  await configureArtSources(card);
  await loadArtOptions(card);
}

function getLocalArtSourceLabel(game) {
  const gameConfig = GameConfigs.getGameConfig(game);
  return gameConfig.sourceLabel || "Base local";
}

function getFallbackArtSources(game) {
  if (game === "magic") {
    return [
      { id: "scryfall", label: "Scryfall", available: true, is_default: true },
      { id: "mpc", label: "MPC Autofill", available: false },
    ];
  }

  return [
    {
      id: "local",
      label: getLocalArtSourceLabel(game),
      available: true,
      is_default: true,
    },
  ];
}

async function fetchArtSources(game) {
  let sources = getFallbackArtSources(game);

  try {
    const response = await fetch(
      `${AppConfig.API_BASE}/art-sources?game=${encodeURIComponent(game)}`,
    );

    if (response.ok) {
      const data = await response.json();
      if (Array.isArray(data.sources) && data.sources.length > 0) {
        sources = data.sources;
      }
    }
  } catch (error) {
    console.warn("Não foi possível carregar fontes de arte:", error);
  }

  return sources;
}

async function configureArtSources(card) {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  activeArtSources = await fetchArtSources(selectedGame);

  const availableSources = activeArtSources.filter(
    (source) => source.available !== false,
  );
  const preferredSource =
    activeArtSources.find(
      (source) => source.is_default && source.available !== false,
    ) ||
    availableSources[0] ||
    activeArtSources[0] ||
    getFallbackArtSources(selectedGame)[0];

  setSelectedArtSource(preferredSource?.id || "local");
  renderArtSourceTabs(card);
  updateArtSourceNotice();
}

function setSelectedArtSource(sourceId) {
  if (elements.artSourceSelect) {
    const hasOption = Array.from(elements.artSourceSelect.options).some(
      (option) => option.value === sourceId,
    );

    if (!hasOption) {
      const option = document.createElement("option");
      option.value = sourceId;
      option.textContent = sourceId;
      elements.artSourceSelect.appendChild(option);
    }

    elements.artSourceSelect.value = sourceId;
  }
}

function getSelectedArtSource() {
  const selectedGame = AppState.getSelectedGame?.() || "magic";

  if (selectedGame !== "magic") {
    return "local";
  }

  return elements.artSourceSelect?.value || "scryfall";
}

function renderArtSourceTabs(card) {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const showSourceTabs = selectedGame === "magic" && activeArtSources.length > 1;

  if (elements.artSourceControls) {
    elements.artSourceControls.classList.toggle("hidden", !showSourceTabs);
  }

  if (!elements.artSourceTabs) return;

  elements.artSourceTabs.innerHTML = "";

  activeArtSources.forEach((source) => {
    const isSelected = source.id === getSelectedArtSource();
    const isAvailable = source.available !== false;
    const sourceIcon =
      source.id === "mpc"
        ? "images"
        : source.id === "scryfall"
          ? "sparkles"
          : "database";
    const button = document.createElement("button");
    button.type = "button";
    button.disabled = !isAvailable;
    button.innerHTML = `
      <i data-lucide="${sourceIcon}" class="df-icon" aria-hidden="true"></i>
      <span>${isAvailable ? escapeHtml(source.label) : `${escapeHtml(source.label)} indisponível`}</span>
    `;
    button.className = [
      "rounded-lg px-4 py-3 text-sm font-semibold transition-colors inline-flex items-center gap-2",
      isSelected
        ? "bg-df-primary text-df-bg"
        : "bg-df-bg text-df-soft hover:bg-df-raised",
      !isAvailable ? "opacity-50 cursor-not-allowed" : "",
    ].join(" ");

    if (!isAvailable) {
      button.title = "Fonte configurada, mas indisponível agora.";
    }

    button.addEventListener("click", () => {
      if (!isAvailable) return;
      setSelectedArtSource(source.id);
      renderArtSourceTabs(card);
      loadArtOptions(card);
    });

    elements.artSourceTabs.appendChild(button);
  });

  AppConfig.refreshIcons?.();
}

function isNativeCardArtSource(source) {
  return source === "local" || source === "scryfall";
}

function getPrintingsUrl(card, searchTerm = "") {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const source = getSelectedArtSource();
  const cardName = searchTerm || card.name || "";
  const params = new URLSearchParams({
    game: selectedGame,
    source,
    name: card.name || "",
    limit: "120",
  });

  if (searchTerm) {
    return `${AppConfig.API_BASE}/printings/${encodeURIComponent(cardName)}?${params}`;
  }

  const cardId = String(card.id || "");
  const hasNativeLocalId =
    cardId && isNativeCardArtSource(source) && !cardId.startsWith("mpc-");

  if (hasNativeLocalId) {
    return `${AppConfig.API_BASE}/cards/${encodeURIComponent(cardId)}/printings?${params}`;
  }

  return `${AppConfig.API_BASE}/printings/${encodeURIComponent(cardName)}?${params}`;
}

function setArtResultCount(count, sourceLabel = "") {
  if (!elements.artResultCount) return;

  const suffix = sourceLabel ? ` - ${sourceLabel}` : "";
  elements.artResultCount.innerHTML = `
    <i data-lucide="image" class="df-icon-sm text-df-primary" aria-hidden="true"></i>
    <span>${count} arte${count === 1 ? "" : "s"}${escapeHtml(suffix)}</span>
  `;
  AppConfig.refreshIcons?.();
}

function getSelectedSourceLabel() {
  const sourceId = getSelectedArtSource();
  const source = activeArtSources.find((item) => item.id === sourceId);
  return source?.label || getLocalArtSourceLabel(AppState.getSelectedGame?.());
}

function getSelectedSourceNotice() {
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);
  const sourceId = getSelectedArtSource();
  const source = activeArtSources.find((item) => item.id === sourceId);

  return source?.notice || gameConfig.technicalNotice || "";
}

function updateArtSourceNotice() {
  if (!elements.artSourceNotice) return;

  const notice = getSelectedSourceNotice();
  elements.artSourceNotice.textContent = notice ? `Aviso técnico: ${notice}` : "";
  elements.artSourceNotice.classList.toggle("hidden", !notice);
}

async function loadArtOptions(card, searchTerm = "") {
  elements.modalLoading.classList.remove("hidden");
  elements.modalArtGrid.classList.add("hidden");
  elements.modalError.classList.add("hidden");
  elements.modalError.textContent = "Não foi possível buscar artes para esta carta.";
  updateArtSourceNotice();
  setArtResultCount(0, getSelectedSourceLabel());

  try {
    const response = await fetch(getPrintingsUrl(card, searchTerm));

    if (!response.ok) {
      let detail = "";

      try {
        const errorData = await response.json();
        detail = errorData?.detail ? ` - ${errorData.detail}` : "";
      } catch {
        detail = "";
      }

      throw new Error(`HTTP ${response.status}${detail}`);
    }

    const data = await response.json();
    const printings = Array.isArray(data) ? data : data.results;

    if (!printings || printings.length === 0) {
      throw new Error(`Nenhuma arte encontrada em ${getSelectedSourceLabel()}`);
    }

    renderArtOptions(printings, card);
  } catch (error) {
    console.error("Erro ao buscar artes:", error);
    elements.modalLoading.classList.add("hidden");
    elements.modalArtGrid.classList.add("hidden");
    elements.modalError.classList.remove("hidden");
    elements.modalError.textContent =
      error?.message || "Não foi possível buscar artes para esta carta.";
    setArtResultCount(0, getSelectedSourceLabel());
  }
}

function handleArtSearchSubmit() {
  if (!activeArtModalCard) return;

  const searchTerm = (elements.artSearchInput?.value || "").trim();
  loadArtOptions(activeArtModalCard, searchTerm);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function getPrintingImageUrl(printing) {
  return printing.image_uri_png || printing.image_uri_normal || null;
}

function getDisplayImageUrl(imageUrl) {
  return AppConfig.getDisplayImageUrl
    ? AppConfig.getDisplayImageUrl(imageUrl)
    : imageUrl;
}

function isCurrentPrinting(printing, currentCard) {
  const imageUrl = getPrintingImageUrl(printing);

  return (
    printing.id === currentCard.id ||
    imageUrl === currentCard.image_uri_normal ||
    imageUrl === currentCard.image_uri_png ||
    printing.image_uri_png === currentCard.image_uri_png
  );
}

function renderArtOptions(printings, currentCard) {
  elements.modalArtGrid.innerHTML = "";
  elements.modalLoading.classList.add("hidden");
  elements.modalArtGrid.classList.remove("hidden");

  const options = printings.filter((printing) => getPrintingImageUrl(printing));

  if (options.length === 0) {
    elements.modalArtGrid.classList.add("hidden");
    elements.modalError.classList.remove("hidden");
    elements.modalError.textContent =
      "As opções encontradas não tinham imagem disponível.";
    setArtResultCount(0, getSelectedSourceLabel());
    return;
  }

  setArtResultCount(options.length, getSelectedSourceLabel());

  options.forEach((printing) => {
    const artOption = document.createElement("button");
    artOption.type = "button";
    artOption.className =
      "group text-left rounded-lg border border-df-line bg-df-bg/80 p-2 transition-colors hover:border-df-primary focus:outline-none focus:ring-2 focus:ring-df-primary";

    const imageUrl = getPrintingImageUrl(printing);
    const displayImageUrl = getDisplayImageUrl(imageUrl);
    const setCode =
      printing.set_code || (printing.art_source === "mpc" ? "MPC" : "ART");
    const collectorNumber = printing.collector_number || "-";
    const setName = printing.set_name || "";
    const isCurrentArt = isCurrentPrinting(printing, currentCard);
    const badge = printing.art_source === "mpc" ? "MPC" : setCode;

    artOption.innerHTML = `
      <div class="relative aspect-[2.5/3.5] overflow-hidden rounded-md bg-black">
        <img
          src="${escapeHtml(displayImageUrl)}"
          data-original-src="${escapeHtml(imageUrl)}"
          alt="${escapeHtml(printing.name)} - ${escapeHtml(setCode)}"
          class="h-full w-full object-contain"
          loading="lazy"
          onerror="AppConfig.handleImageLoadError(this)"
        />
        <div class="absolute right-2 top-2 rounded bg-black/75 px-2 py-1 text-xs font-semibold text-white">
          ${escapeHtml(badge)}
        </div>
        ${
          isCurrentArt
            ? '<div class="absolute left-2 top-2 rounded bg-df-primary px-2 py-1 text-xs font-semibold text-df-bg inline-flex items-center gap-1"><i data-lucide="check" class="df-icon-sm" aria-hidden="true"></i><span>Atual</span></div>'
            : ""
        }
      </div>
      <div class="mt-2 min-h-[4.25rem]">
        <p class="truncate text-sm font-semibold text-slate-100">${escapeHtml(printing.name)}</p>
        <p class="text-xs text-slate-300">${escapeHtml(setCode)} #${escapeHtml(collectorNumber)}</p>
        ${
          setName
            ? `<p class="mt-1 truncate text-xs text-slate-500">${escapeHtml(setName)}</p>`
            : ""
        }
      </div>
    `;

    artOption.addEventListener("click", () => selectArt(printing));
    elements.modalArtGrid.appendChild(artOption);
  });

  AppConfig.refreshIcons?.();
}

function selectArt(newPrinting) {
  const cardIndex = AppState.currentModalCardIndex;

  if (cardIndex === null || cardIndex === undefined) {
    return;
  }

  if (AppState.customImages?.has(cardIndex)) {
    AppState.customImages.delete(cardIndex);
  }

  AppState.currentCards[cardIndex] = CardImageResolver.applyPrintingToCard(
    AppState.currentCards[cardIndex],
    newPrinting,
  );

  updateCardElement(cardIndex);
  updateDecklistTextarea();
  closeArtModal();
}

function closeArtModal() {
  if (
    AppState.currentModalCardIndex !== null &&
    typeof AppState.currentCards !== "undefined"
  ) {
    const card = AppState.currentCards[AppState.currentModalCardIndex];
    const isDFC = card.image_uri_back_normal || card.image_uri_back_png;
    const customData = AppState.customImages.get(
      AppState.currentModalCardIndex,
    );

    if (isDFC && customData) {
      const hasFront = !!customData.front;
      const hasBack = !!customData.back;

      if ((hasFront && !hasBack) || (!hasFront && hasBack)) {
        alert(
          'Para cartas dupla-face, envie frente e verso ou remova a arte personalizada atual usando o botao "Remover".',
        );
        return;
      }
    }
  }

  if (elements.artModal) {
    elements.artModal.classList.add("hidden");
  }

  activeArtModalCard = null;
  AppState.currentModalCardIndex = null;
}

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

function updateGapValue() {
  const activeGapControl = elements.outputModeProfessional?.checked
    ? elements.gapSpacingProfessional
    : elements.gapSpacing;
  const value = parseFloat(activeGapControl?.value || elements.gapSpacing?.value || "2");
  const formattedValue = `${value.toFixed(1)} mm`;

  if (elements.gapSpacing && elements.gapSpacing.value !== String(value)) {
    elements.gapSpacing.value = String(value);
  }

  if (
    elements.gapSpacingProfessional &&
    elements.gapSpacingProfessional.value !== String(value)
  ) {
    elements.gapSpacingProfessional.value = String(value);
  }

  if (elements.gapValue) {
    elements.gapValue.textContent = formattedValue;
  }

  if (elements.gapValueProfessional) {
    elements.gapValueProfessional.textContent = formattedValue;
  }
}
