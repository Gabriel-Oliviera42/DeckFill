/**
 * Deck Fill - Card Renderer Module
 * Handles card rendering and UI display
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseJsonArray(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function getCardFaces(card) {
  return parseJsonArray(card.card_faces || card.card_faces_json);
}

/**
 * Renderiza os resultados.
 */
function renderResults(data) {
  const { cards, total_cards, processing_time_ms, errors } = data;

  elements.resultsSummary.textContent = `${total_cards} cartas encontradas em ${processing_time_ms}ms`;
  elements.cardsGrid.innerHTML = "";

  cards.forEach((card, index) => {
    const cardElement = createCardElement(card, index);
    elements.cardsGrid.appendChild(cardElement);
  });

  addCardClickHandlers();
  updateFaceWarningBadges();
  AppConfig.refreshIcons?.();

  if (errors && errors.length > 0) {
    showErrors(errors);
  }

  elements.resultsSection.classList.remove("hidden");
  elements.resultsSection.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/**
 * Cria um elemento de card com a aparencia antiga em Tailwind.
 */
function createCardElement(card, index) {
  const cardDiv = document.createElement("div");
  cardDiv.className =
    "card-item bg-gray-800 rounded-lg shadow-md overflow-hidden fade-in group cursor-pointer transition-none transform-none hover:shadow-md";
  cardDiv.dataset.cardIndex = index;

  const frontUrl =
    CardImageResolver.getResolvedFrontImageUrl(card, index) ||
    card.image_uri_png ||
    card.image_uri_normal;
  const backUrl = CardImageResolver.getResolvedBackImageUrl(card, index) || "";
  const frontDisplayUrl = AppConfig.getDisplayImageUrl
    ? AppConfig.getDisplayImageUrl(frontUrl)
    : frontUrl;
  const backDisplayUrl = AppConfig.getDisplayImageUrl
    ? AppConfig.getDisplayImageUrl(backUrl)
    : backUrl;
  const isDFC = CardImageResolver.isDoubleFacedCard(card) || Boolean(backUrl);
  const hasRelevantSecondaryFace =
    CardImageResolver.hasRelevantSecondaryFace?.(card) || false;
  const cardText = getCardText(card);
  const infoBadges = [];

  if (card.is_related_token) {
    infoBadges.push({
      label: "Token",
      title: card.parent_card_name
        ? `Token relacionado a ${card.parent_card_name}`
        : "Token relacionado",
      className: "border-emerald-500/70 bg-emerald-950/90 text-emerald-100",
    });
  }

  if (card.has_related_tokens && !card.is_related_token) {
    const relatedTokenNames = Array.isArray(card.related_token_names)
      ? card.related_token_names.filter(Boolean)
      : [];
    const tokenList = relatedTokenNames.length
      ? relatedTokenNames.join(", ")
      : "tokens relacionados";
    const tokenStatus = card.related_tokens_included
      ? "adicionados ao fluxo"
      : "disponiveis, mas nao adicionados";

    infoBadges.push({
      label: "Tokens",
      title: `Tokens encontrados (${tokenStatus}): ${tokenList}`,
      className: card.related_tokens_included
        ? "border-emerald-500/70 bg-emerald-950/90 text-emerald-100"
        : "border-amber-500/70 bg-amber-950/90 text-amber-100",
    });
  }

  if (card.is_auto_completed) {
    infoBadges.push({
      label: "Extra",
      title: card.auto_complete_category
        ? `Adicionada por auto completar: ${card.auto_complete_category}`
        : "Adicionada por auto completar pagina",
      className: "border-sky-500/70 bg-sky-950/90 text-sky-100",
    });
  }

  if (card.language_fallback) {
    infoBadges.push({
      label: "EN",
      title:
        "Esta carta nao foi encontrada no idioma preferido e usou ingles como fallback.",
      className: "border-amber-500/70 bg-amber-950/90 text-amber-100",
    });
  }

  const infoBadgesHtml = infoBadges.length
    ? `
      <div class="absolute right-2 top-2 z-30 flex flex-col items-end gap-1">
        ${infoBadges
          .map(
            (badge) => `
              <span
                class="rounded-full border px-2 py-1 text-[11px] font-semibold shadow ${badge.className}"
                title="${escapeHtml(badge.title)}"
              >
                ${escapeHtml(badge.label)}
              </span>
            `,
          )
          .join("")}
      </div>
    `
    : "";

  if (frontUrl) {
    cardDiv.innerHTML = `
      <div class="relative aspect-[2.5/3.5]">
        <img
          src="${escapeHtml(frontDisplayUrl)}"
          alt="${escapeHtml(card.name)}"
          class="w-full h-full object-contain transition-none transform-none hover:transform-none"
          data-role="primary-card-image"
          data-current-face="front"
          data-original-src="${escapeHtml(frontUrl)}"
          loading="lazy"
          onerror="AppConfig.handleImageLoadError(this)"
        />

        ${
          hasRelevantSecondaryFace
            ? `
              <div
                class="relevant-face-included absolute left-2 top-2 z-30 rounded-full border border-df-primary/70 bg-slate-950/90 px-2 py-1 text-[11px] font-semibold text-df-primary shadow"
                title="Esta carta possui outra face relevante e ela entrara como carta separada no PDF."
              >
                2 faces
              </div>
              <div
                class="relevant-face-warning hidden absolute left-2 top-2 z-30 rounded-full border border-red-500/70 bg-red-950/90 px-2 py-1 text-[11px] font-semibold text-red-200 shadow"
                title="Esta carta possui outra face relevante. Ative 'frente e verso como cartas separadas' para não perder a arte/texto do verso."
              >
                Face extra
              </div>
            `
            : ""
        }

        ${infoBadgesHtml}

        <div class="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10">
          ${
            isDFC
              ? `
                <button
                  class="absolute top-2 right-2 w-10 h-10 rounded-full bg-slate-800 text-white flex items-center justify-center hover:bg-slate-600 shadow-md z-20 cursor-pointer pointer-events-auto"
                  title="Virar Carta"
                  data-front-url="${escapeHtml(frontDisplayUrl)}"
                  data-back-url="${escapeHtml(backDisplayUrl)}"
                  onmousedown="event.stopPropagation()"
                  onclick="event.stopPropagation(); toggleCardFace(this)"
                >
                  <i data-lucide="rotate-cw" class="df-icon-lg" aria-hidden="true"></i>
                </button>
              `
              : ""
          }

          <div
            class="absolute bottom-2 left-2 right-2 bg-slate-900/80 p-3 max-h-[50%] overflow-y-auto pointer-events-auto z-20"
            onclick="event.stopPropagation()"
            onmousedown="event.stopPropagation()"
          >
            <h4 class="text-white font-semibold text-sm mb-1">${escapeHtml(card.name)}</h4>
            <p class="text-gray-300 font-medium text-xs mb-2">(${escapeHtml(card.set_name || card.set_code || "SET")} #${escapeHtml(card.collector_number || "-")})</p>
            <div class="text-gray-200 font-medium text-xs leading-relaxed whitespace-pre-line">
              ${escapeHtml(cardText)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  return cardDiv;
}

/**
 * Obtem o texto da carta, tratando cartas DFC.
 */
function getCardText(card) {
  const cardFaces = getCardFaces(card);

  if (cardFaces.length > 0) {
    const faceTexts = cardFaces
      .map((face) => face.oracle_text || face.printed_text || "")
      .filter((text) => text.trim() !== "");

    if (faceTexts.length > 0) {
      return faceTexts.join("\n\n---\n\n");
    }
  }

  const text = card.oracle_text || card.printed_text || "";
  return text.trim() !== "" ? text : "";
}

/**
 * Funcao global para alternar entre frente e verso da carta.
 */
function toggleCardFace(button, frontUrlArg, backUrlArg) {
  const cardContainer = button.closest(".card-item");
  const img =
    cardContainer.querySelector('[data-role="primary-card-image"]') ||
    cardContainer.querySelector("img");

  if (!img) return;

  const frontUrl = frontUrlArg || button.dataset.frontUrl;
  const backUrl = backUrlArg || button.dataset.backUrl;
  const isCurrentlyFront = img.dataset.currentFace !== "back";

  if (isCurrentlyFront && backUrl) {
    img.src = backUrl;
    img.dataset.currentFace = "back";
    button.innerHTML = '<i data-lucide="rotate-ccw" class="df-icon-lg" aria-hidden="true"></i>';
    button.title = "Mostrar Frente";
  } else {
    img.src = frontUrl;
    img.dataset.currentFace = "front";
    button.innerHTML = '<i data-lucide="rotate-cw" class="df-icon-lg" aria-hidden="true"></i>';
    button.title = "Virar Carta";
  }
  AppConfig.refreshIcons?.();
}

function updateFaceWarningBadges() {
  const shouldPrintRelevantFaces = elements.printRelevantFaces?.checked !== false;

  document.querySelectorAll(".relevant-face-warning").forEach((warning) => {
    warning.classList.toggle("hidden", shouldPrintRelevantFaces);
  });

  document.querySelectorAll(".relevant-face-included").forEach((badge) => {
    badge.classList.toggle("hidden", !shouldPrintRelevantFaces);
  });
}
