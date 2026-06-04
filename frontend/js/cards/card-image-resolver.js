/**
 * Deck Fill - Card Image Resolver
 * Centraliza decisões sobre frente, verso, DFC, impressão escolhida e imagens customizadas.
 */

function isDoubleFacedCard(card) {
  return Boolean(card?.image_uri_back_normal || card?.image_uri_back_png);
}

function getDefaultFrontImageUrl(card) {
  return card?.image_uri_png || card?.image_uri_normal || null;
}

function getDefaultBackImageUrl(card) {
  return card?.image_uri_back_png || card?.image_uri_back_normal || null;
}

function getCustomImageData(cardIndex) {
  if (!window.AppState || !AppState.customImages) return null;
  return AppState.customImages.get(cardIndex) || null;
}

function getResolvedFrontImageUrl(card, cardIndex) {
  const customData = getCustomImageData(cardIndex);

  if (customData?.front) {
    return customData.front;
  }

  return getDefaultFrontImageUrl(card);
}

function getResolvedBackImageUrl(card, cardIndex) {
  const customData = getCustomImageData(cardIndex);

  if (customData?.back) {
    return customData.back;
  }

  return getDefaultBackImageUrl(card);
}

function applyPrintingToCard(card, printing) {
  const isMpcArt = printing.art_source === "mpc";
  const originalDeckName = card.decklist_name || card.name;
  const originalDeckSetCode = card.decklist_set_code || card.set_code || null;
  const originalDeckCollectorNumber =
    card.decklist_collector_number || card.collector_number || null;

  return {
    ...card,

    id: printing.id,
    oracle_id: printing.oracle_id,

    name: printing.name,
    printed_name: printing.printed_name || null,
    lang: printing.lang || "en",
    layout: printing.layout || null,

    set_code: printing.set_code,
    set_name: printing.set_name || null,
    collector_number: printing.collector_number,
    released_at: printing.released_at || null,
    rarity: printing.rarity || null,

    type_line: printing.type_line || null,
    printed_type_line: printing.printed_type_line || null,
    oracle_text: printing.oracle_text || null,
    printed_text: printing.printed_text || null,

    image_uri_normal: printing.image_uri_normal || null,
    image_uri_png: printing.image_uri_png || null,
    image_uri_art_crop: printing.image_uri_art_crop || null,
    download_url: printing.download_url || card.download_url || null,

    image_uri_back_normal: printing.image_uri_back_normal || null,
    image_uri_back_png: printing.image_uri_back_png || null,
    image_uri_back_art_crop: printing.image_uri_back_art_crop || null,

    back_name: printing.back_name || null,
    back_printed_name: printing.back_printed_name || null,
    back_type_line: printing.back_type_line || null,
    back_oracle_text: printing.back_oracle_text || null,
    back_printed_text: printing.back_printed_text || null,

    all_parts_json: printing.all_parts_json || null,
    card_faces_json: printing.card_faces_json || null,
    art_source: printing.art_source || card.art_source || "local",
    decklist_name: isMpcArt ? originalDeckName : printing.name,
    decklist_set_code: isMpcArt
      ? originalDeckSetCode
      : printing.set_code || null,
    decklist_collector_number: isMpcArt
      ? originalDeckCollectorNumber
      : printing.collector_number || null,
  };
}

function setCustomFrontImage(cardIndex, imageUrl) {
  const existingImages = AppState.customImages.get(cardIndex) || {};

  AppState.customImages.set(cardIndex, {
    ...existingImages,
    front: imageUrl,
  });

  const currentCard = AppState.currentCards[cardIndex];

  AppState.currentCards[cardIndex] = {
    ...currentCard,
    image_uri_normal: imageUrl,
    image_uri_png: imageUrl,
  };
}

function setCustomBackImage(cardIndex, imageUrl) {
  const existingImages = AppState.customImages.get(cardIndex) || {};

  AppState.customImages.set(cardIndex, {
    ...existingImages,
    back: imageUrl,
  });

  const currentCard = AppState.currentCards[cardIndex];

  AppState.currentCards[cardIndex] = {
    ...currentCard,
    image_uri_back_normal: imageUrl,
    image_uri_back_png: imageUrl,
  };
}

function clearCustomFrontImage(cardIndex) {
  const existingImages = AppState.customImages.get(cardIndex) || {};

  AppState.customImages.set(cardIndex, {
    ...existingImages,
    front: null,
  });
}

function clearCustomBackImageForCard(cardIndex) {
  const existingImages = AppState.customImages.get(cardIndex) || {};

  AppState.customImages.set(cardIndex, {
    ...existingImages,
    back: null,
  });
}

window.CardImageResolver = {
  isDoubleFacedCard,
  getDefaultFrontImageUrl,
  getDefaultBackImageUrl,
  getResolvedFrontImageUrl,
  getResolvedBackImageUrl,
  applyPrintingToCard,
  setCustomFrontImage,
  setCustomBackImage,
  clearCustomFrontImage,
  clearCustomBackImageForCard,
};
