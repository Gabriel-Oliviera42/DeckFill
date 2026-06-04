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
1 Lukamina, Moon Druid
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
    sampleDecklist: `1 Charizard ex (PAF #54)
1 Pikachu
1 Professor's Research
1 Rare Candy
1 Basic Fire Energy`,
    decklistPlaceholder: `1 Charizard ex (PAF #54)
1 Pikachu
1 Professor's Research
1 Rare Candy
1 Basic Fire Energy`,
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
    sampleDecklist: `1 Blue-Eyes White Dragon LOB-001
2 Blue-Eyes White Dragon
1 Dark Magician
1 Monster Reborn`,
    decklistPlaceholder: `1 Blue-Eyes White Dragon LOB-001
2 Blue-Eyes White Dragon
1 Dark Magician
1 Monster Reborn`,
    backendGameKey: "yugioh",
  },

  lorcana: {
    id: "lorcana",
    label: "Disney Lorcana",
    shortLabel: "Lorcana",
    status: "active",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: `1 Mickey Mouse - Brave Little Tailor
1 Elsa - Snow Queen
1 Stitch - Rock Star`,
    decklistPlaceholder: `1 Mickey Mouse - Brave Little Tailor
1 Elsa - Snow Queen
1 Stitch - Rock Star`,
    backendGameKey: "lorcana",
  },

  onepiece: {
    id: "onepiece",
    label: "One Piece Card Game",
    shortLabel: "One Piece",
    status: "active",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: `1 Monkey.D.Luffy
1 Roronoa Zoro
1 Nami`,
    decklistPlaceholder: `1 Monkey.D.Luffy
1 Roronoa Zoro
1 Nami`,
    backendGameKey: "onepiece",
  },

  fab: {
    id: "fab",
    label: "Flesh and Blood",
    shortLabel: "FAB",
    status: "active",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: `1 Fyendal's Spring Tunic
1 Command and Conquer
1 Enlightened Strike`,
    decklistPlaceholder: `1 Fyendal's Spring Tunic
1 Command and Conquer
1 Enlightened Strike`,
    backendGameKey: "fab",
  },
};

function getGameConfig(gameId) {
  return GAME_CONFIGS[gameId] || GAME_CONFIGS.magic;
}

window.GameConfigs = {
  all: GAME_CONFIGS,
  getGameConfig,
};
