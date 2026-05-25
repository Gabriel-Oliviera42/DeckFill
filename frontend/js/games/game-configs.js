/**
 * Deck Fill - Game Configs
 * Configurações por TCG.
 *
 * Magic usa base local.
 * Pokémon e Yu-Gi-Oh estão em suporte inicial usando busca externa.
 */

const GAME_CONFIGS = {
  magic: {
    id: "magic",
    label: "Magic: The Gathering",
    shortLabel: "Magic",
    status: "active",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: window.AppConfig.MTG_BACK_URL,
    sampleDecklist: window.AppConfig.SAMPLE_DECKLIST,
    decklistPlaceholder: `4x Lightning Bolt
2 Island
1 Tovolar, Dire Overlord
3 Black Lotus
4 Force of Will`,
    backendGameKey: "magic",
  },

  pokemon: {
    id: "pokemon",
    label: "Pokémon TCG",
    shortLabel: "Pokémon",
    status: "active",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: `4 Pikachu
2 Charizard
10 Basic Fire Energy`,
    decklistPlaceholder: `4 Pikachu
2 Charizard
10 Basic Fire Energy`,
    backendGameKey: "pokemon",
  },

  yugioh: {
    id: "yugioh",
    label: "Yu-Gi-Oh!",
    shortLabel: "Yu-Gi-Oh!",
    status: "active",
    cardWidthMm: 59,
    cardHeightMm: 86,
    defaultBackUrl:
        "https://images.ygoprodeck.com/images/assets/CardBack.jpg",
    sampleDecklist: `3 Blue-Eyes White Dragon
1 Dark Magician
1 Monster Reborn`,
    decklistPlaceholder: `3 Blue-Eyes White Dragon
1 Dark Magician
1 Monster Reborn`,
    backendGameKey: "yugioh",
  },
};

function getGameConfig(gameId) {
  return GAME_CONFIGS[gameId] || GAME_CONFIGS.magic;
}

window.GameConfigs = {
  all: GAME_CONFIGS,
  getGameConfig,
};