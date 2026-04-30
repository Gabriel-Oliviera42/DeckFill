/**
 * Deck Fill - Card Renderer Module
 * Handles card rendering and UI display
 */

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
    "card-item bg-gray-800 rounded-lg shadow-md overflow-hidden fade-in group cursor-pointer transition-none transform-none hover:shadow-md";

  if (card.image_uri_normal) {
    // Lógica de DFC (Botão Flip)
    const isDFC = card.image_uri_back_normal || card.image_uri_back_png;
    const frontUrl = card.image_uri_normal;
    const backUrl = card.image_uri_back_normal || card.image_uri_back_png || "";

    cardDiv.innerHTML = `
            <div class="relative aspect-[2.5/3.5]">
                <img 
                    src="${frontUrl}" 
                    alt="${card.name}"
                    class="w-full h-full object-contain transition-none transform-none hover:transform-none"
                    data-current-face="front"
                    loading="lazy"
                />
                
                <!-- Hover Overlay -->
                <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
                    <!-- Botão de virar no topo (aparece no hover) -->
                    ${
                      isDFC
                        ? `
                        <button class="absolute top-2 right-2 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-600 shadow-md z-20 cursor-pointer pointer-events-auto" 
                                title="Virar Carta" 
                                onmousedown="event.stopPropagation()"
                                onclick="event.stopPropagation(); toggleCardFace(this, '${frontUrl}', '${backUrl}')">
                            &#x21bb;
                        </button>
                    `
                        : ""
                    }
                    
                    <!-- Caixa de Texto Inferior -->
                    <div class="absolute bottom-2 left-2 right-2 bg-slate-900/80 p-3 max-h-[50%] overflow-y-auto pointer-events-auto z-20" 
                         onclick="event.stopPropagation()" 
                         onmousedown="event.stopPropagation()">
                        <h4 class="text-white font-semibold text-sm mb-1">${card.name}</h4>
                        <p class="text-gray-300 font-medium text-xs mb-2">(${card.set_name || card.set_code} #${card.collector_number})</p>
                        <div class="text-gray-200 font-medium text-xs leading-relaxed">
                            ${getCardText(card)}
                        </div>
                    </div>
                </div>
            </div>
        `;

    // Amarra o evento de clique na div para abrir o Modal
    cardDiv.addEventListener("click", () => {
      if (typeof openArtModal === "function") {
        openArtModal(card, index);
      }
    });

    // Impede que clicar no botão de Flip abra o modal sem querer
    const flipBtn = cardDiv.querySelector(".flip-btn");
    if (flipBtn) {
      flipBtn.addEventListener("click", (e) => e.stopPropagation());
    }
  }

  return cardDiv;
}

/**
 * Obtém o texto da carta, tratando cartas DFC (dupla-face)
 */
function getCardText(card) {
  // Se for carta DFC, extrai texto das faces
  if (card.card_faces && Array.isArray(card.card_faces)) {
    const faceTexts = card.card_faces
      .map((face) => face.oracle_text || face.printed_text || "")
      .filter((text) => text.trim() !== "");

    if (faceTexts.length > 0) {
      return faceTexts.join("\n\n---\n\n");
    }
  }

  // Para cartas normais, usa o texto direto
  const text = card.oracle_text || card.printed_text || "";
  return text.trim() !== "" ? text : "";
}

/**
 * Função global para alternar entre frente e verso da carta
 */
function toggleCardFace(button, frontUrl, backUrl) {
  const cardContainer = button.closest(".card-item");
  const img = cardContainer.querySelector("img");

  if (!img) return;

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
