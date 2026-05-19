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

function buildPrintableCardList(cards, resolvedSettings) {
  if (!Array.isArray(cards)) {
    return [];
  }

  const printableCards = [];

  cards.forEach((card, originalIndex) => {
    if (!shouldIncludeCardInPdf(card, resolvedSettings)) {
      return;
    }

    printableCards.push(buildPrintableCardItem(card, originalIndex));
  });

  return printableCards;
}

window.PdfCardList = {
  buildPrintableCardList,
  isBasicLandForPdf,
  shouldIncludeCardInPdf,
};