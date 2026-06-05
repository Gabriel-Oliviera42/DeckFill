/**
 * Deck Fill - PDF Card List
 * Monta uma lista estável de cartas imprimíveis antes da renderização do PDF.
 *
 * O objetivo é evitar bugs de índice quando:
 * - terrenos básicos são omitidos
 * - DFCs são tratadas de forma especial
 * - imagens customizadas são usadas
 * - verso genérico ou verso real são aplicados
 */

const PDF_BASIC_LANDS = new Set([
  "plains",
  "island",
  "swamp",
  "mountain",
  "forest",
  "wastes",
  "snow-covered plains",
  "snow-covered island",
  "snow-covered swamp",
  "snow-covered mountain",
  "snow-covered forest",
]);

function isBasicLandForPdf(card) {
  return PDF_BASIC_LANDS.has((card?.name || "").trim().toLowerCase());
}

function shouldIncludeCardInPdf(card, resolvedSettings) {
  if (!card) return false;

  if (
    resolvedSettings?.content?.skipBasicLands &&
    isBasicLandForPdf(card)
  ) {
    return false;
  }

  return true;
}

function buildPrintableCardItem(card, originalIndex) {
  const isDoubleFaced = CardImageResolver.isDoubleFacedCard(card);

  return {
    originalIndex,
    card,
    isDoubleFaced,
    frontImageUrl: CardImageResolver.getResolvedFrontImageUrl(
      card,
      originalIndex,
    ),
    backImageUrl: CardImageResolver.getResolvedBackImageUrl(
      card,
      originalIndex,
    ),
  };
}

function buildRelevantBackFaceItem(card, originalIndex) {
  const backImageUrl = CardImageResolver.getResolvedBackImageUrl(
    card,
    originalIndex,
  );

  if (!backImageUrl) {
    return null;
  }

  const backCard = {
    ...card,
    id: `${card.id || originalIndex}::back-face`,
    name: card.back_name || `${card.name} - verso`,
    printed_name: card.back_printed_name || card.back_name || null,
    type_line: card.back_type_line || card.type_line || null,
    oracle_text: card.back_oracle_text || card.printed_text || null,
    printed_text: card.back_printed_text || null,
    image_uri_normal: backImageUrl,
    image_uri_png: backImageUrl,
    image_uri_back_normal: null,
    image_uri_back_png: null,
    is_generated_relevant_face: true,
    parent_card_id: card.id || null,
    parent_card_name: card.name || null,
  };

  return {
    originalIndex,
    card: backCard,
    isDoubleFaced: false,
    isGeneratedRelevantFace: true,
    frontImageUrl: backImageUrl,
    backImageUrl: null,
  };
}

function buildPrintableCardList(cards, resolvedSettings) {
  if (!Array.isArray(cards)) {
    return [];
  }

  const printableCards = [];
  const shouldPrintRelevantFaces =
    resolvedSettings?.content?.printRelevantFaces !== false;

  cards.forEach((card, originalIndex) => {
    if (!shouldIncludeCardInPdf(card, resolvedSettings)) {
      return;
    }

    const frontItem = buildPrintableCardItem(card, originalIndex);
    printableCards.push(frontItem);

    if (
      shouldPrintRelevantFaces &&
      CardImageResolver.hasRelevantSecondaryFace?.(card)
    ) {
      const backFaceItem = buildRelevantBackFaceItem(card, originalIndex);

      if (backFaceItem) {
        printableCards.push(backFaceItem);
      }
    }
  });

  return printableCards;
}

window.PdfCardList = {
  buildPrintableCardList,
  isBasicLandForPdf,
  shouldIncludeCardInPdf,
};
