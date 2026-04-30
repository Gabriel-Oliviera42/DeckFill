/**
 * Deck Fill - Modal Manager Module
 * Handles modal operations and print settings
 */

/**
 * Abre o modal de escolha de artes
 */
async function openArtModal(card, cardIndex) {
  console.log("🔍 openArtModal chamado com:", { card: card.name, cardIndex });
  AppState.currentModalCardIndex = cardIndex;
  console.log(
    "✅ AppState.currentModalCardIndex definido como:",
    AppState.currentModalCardIndex,
  );

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
      `${AppConfig.API_BASE}/printings/${encodeURIComponent(card.name)}`,
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
  AppState.currentCards[AppState.currentModalCardIndex] = {
    ...AppState.currentCards[AppState.currentModalCardIndex],
    image_uri_normal: newPrinting.image_uri_normal,
    image_uri_png: newPrinting.image_uri_png,
    image_uri_back_normal: newPrinting.image_uri_back_normal || null,
    image_uri_back_png: newPrinting.image_uri_back_png || null,
    set_code: newPrinting.set_code,
    collector_number: newPrinting.collector_number,
  };

  // Atualizar apenas o elemento específico no DOM
  updateCardElement(AppState.currentModalCardIndex);

  // === TWO-WAY DATA BINDING ===
  updateDecklistTextarea();

  // Fechar modal
  closeArtModal();
}

/**
 * Fecha o modal de artes
 */
function closeArtModal() {
  // Validação de DFC: OBRIGA a ter as duas imagens antes de fechar.
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
  AppState.currentModalCardIndex = null;
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
