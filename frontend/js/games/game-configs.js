/**
 * Deck Fill - Game Configs
 * Configuracoes centralizadas por TCG.
 */

const GAME_SAMPLE_DECKLISTS = {
  magic: `1 Black Lotus (YDMU) 35
1 Tiamat (AFR) 298
1 Tovolar, Dire Overlord // Tovolar, the Midnight Scourge (SLD) 1612
1 Westvale Abbey // Ormendahl, Profane Prince (SLD) 1212
1 Nicol Bolas, the Ravager // Nicol Bolas, the Arisen (SLD) 1211
1 Esika, God of the Tree // The Prismatic Bridge (SLD) 1208
1 Valki, God of Lies // Tibalt, Cosmic Impostor (KHM) 308
1 Murderous Rider // Swift End (SLD) 1981
1 Reidane, God of the Worthy // Valkmira, Protector's Shield (KHM) 300
1 Avabruck Caretaker // Hollowhenge Huntmaster (SLD) 1608
1 Ragavan, Nimble Pilferer (MH2) 315
1 Avacyn, Angel of Hope (INR) 482
1 Mana Crypt (2XM) 361
1 Swords to Plowshares (SLD) 2167
1 Demonic Tutor (CMM) 696
1 Smothering Tithe (2X2) 342
1 Bloom Tender (ECL) 324
1 Chalice of the Void (LCC) 105
1 Plains (SLD) 2540
1 Rin and Seri, Inseparable (SLD) 1230`,

  pokemon: `1 Charizard ex (SV4PT5 #234)
1 Pikachu VMAX (LOR #TG17)
1 Mewtwo & Mew-GX (UNM #71)
1 Arceus VSTAR (CRZ #GG70)
1 Giratina VSTAR (CRZ #GG69)
1 Lugia V (SIT #138)
1 Umbreon VMAX (EVS #95)
1 Gardevoir ex (SV1 #245)
1 Miraidon ex (SV1 #244)
1 Koraidon ex (SV1 #247)
1 Pikachu (SV3PT5 #173)
1 Origin Forme Palkia VSTAR (CRZ #GG67)
1 Origin Forme Dialga VSTAR (CRZ #GG68)
1 Hisuian Zoroark VSTAR (CRZ #GG56)
1 Roaring Moon ex (PRE #162)
1 Iron Valiant ex (PRE #157)
1 Professor's Research (PGO #78)
1 Rare Candy (GRI #165)
1 Switch (SUM #160)
1 Charizard (LOR #TG03)`,

  yugioh: `1 Blue-Eyes White Dragon
1 Dark Magician
1 Red-Eyes Black Dragon
1 Exodia the Forbidden One
1 Left Arm of the Forbidden One
1 Right Arm of the Forbidden One
1 Left Leg of the Forbidden One
1 Right Leg of the Forbidden One
1 Dark Magician Girl
1 Blue-Eyes Alternative White Dragon
1 Blue-Eyes Ultimate Dragon
1 Black Luster Soldier
1 Stardust Dragon
1 Number 39: Utopia
1 Borreload Dragon
1 Accesscode Talker
1 Ash Blossom & Joyous Spring
1 Ghost Ogre & Snow Rabbit
1 Pot of Greed
1 Monster Reborn`,

  lorcana: `1 Mickey Mouse - Brave Little Prince (9 #242)
1 Elsa - Ice Artisan (11 #233)
1 Stitch - Experiment 626 (8 #220)
1 Maleficent - Monstrous Dragon (P3 #5)
1 Belle - Accomplished Mystic (9 #226)
1 Rapunzel - Gifted with Healing (CP #43)
1 Tinker Bell - Giant Fairy (1 #216)
1 Simba - King in the Making (10 #224)
1 Ursula - Sea Witch Queen (P1 #38)
1 Hades - Infernal Schemer (9 #237)
1 Maui - Hero to All (1 #212)
1 Aladdin - Barreling Through (10 #216)
1 Ariel - Ethereal Voice (10 #241)
1 Beast - Gracious Prince (9 #224)
1 Cinderella - Dream Come True (10 #236)
1 Goofy - Galumphing Gumshoe (10 #223)
1 Donald Duck - Flustered Sorcerer (7 #209)
1 Madam Mim - Purple Dragon (2 #208)
1 Merlin - Completing His Research (10 #209)
1 Be Prepared (1 #128)`,

  onepiece: `1 Monkey.D.Luffy
1 Roronoa Zoro
1 Nami
1 Sanji
1 Tony Tony.Chopper
1 Trafalgar Law
1 Eustass"Captain"Kid
1 Shanks
1 Portgas.D.Ace
1 Yamato
1 Donquixote Doflamingo
1 Boa Hancock
1 Charlotte Katakuri
1 Kaido
1 Big Mom
1 Monkey.D.Garp
1 Sabo
1 Dracule Mihawk
1 Nico Robin
1 Gum-Gum Jet Pistol`,

  fab: `1 Enlightened Strike (ANQ #ANQ000)
1 Rosetta Thorn (ROS #ROS256)
1 Fyendal's Spring Tunic (ANQ #ANQ006)
1 Command and Conquer (ANQ #ANQ009)
1 Sink Below (FAB #FAB359)
1 Crown of Providence
1 Arcanite Skullcap
1 Mask of Momentum
1 Braveforge Bracers
1 Snapdragon Scalers
1 Nullrune Robe
1 Art of War
1 Tome of Fyendal
1 Heart of Fyendal
1 Tunic of Fyendal
1 Dawnblade
1 Rosetta
1 Channel Mount Heroic
1 Warmonger's Diplomacy
1 This Round's on Me`,
};

const GAME_CONFIGS = {
  magic: {
    id: "magic",
    label: "Magic: The Gathering",
    shortLabel: "Magic",
    status: "active",
    statusLabel: "Estável",
    sourceLabel: "Scryfall",
    sourceBaseLabel: "Scryfall/base local sincronizada",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: window.AppConfig.MTG_BACK_URL,
    sampleDecklist: GAME_SAMPLE_DECKLISTS.magic,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.magic,
    backendGameKey: "magic",
  },

  pokemon: {
    id: "pokemon",
    label: "Pokémon TCG",
    displayLabel: "Pokémon TCG",
    shortLabel: "Pokémon",
    displayShortLabel: "Pokémon",
    status: "active",
    statusLabel: "Inicial",
    sourceLabel: "Pokémon TCG",
    sourceBaseLabel: "Pokémon TCG/base local sincronizada",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: GAME_SAMPLE_DECKLISTS.pokemon,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.pokemon,
    backendGameKey: "pokemon",
  },

  yugioh: {
    id: "yugioh",
    label: "Yu-Gi-Oh!",
    shortLabel: "Yu-Gi-Oh!",
    status: "active",
    statusLabel: "Inicial",
    sourceLabel: "YGOPRODeck",
    sourceBaseLabel: "YGOPRODeck/base local sincronizada",
    cardWidthMm: 59,
    cardHeightMm: 86,
    defaultBackUrl:
      "https://images.ygoprodeck.com/images/assets/CardBack.jpg",
    sampleDecklist: GAME_SAMPLE_DECKLISTS.yugioh,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.yugioh,
    backendGameKey: "yugioh",
  },

  lorcana: {
    id: "lorcana",
    label: "Disney Lorcana",
    shortLabel: "Lorcana",
    status: "active",
    statusLabel: "Novo",
    sourceLabel: "Lorcast",
    sourceBaseLabel: "Lorcast/base local sincronizada",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: GAME_SAMPLE_DECKLISTS.lorcana,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.lorcana,
    backendGameKey: "lorcana",
  },

  onepiece: {
    id: "onepiece",
    label: "One Piece Card Game",
    shortLabel: "One Piece",
    status: "active",
    statusLabel: "Novo",
    sourceLabel: "OPTCG",
    sourceBaseLabel: "OPTCG/base local sincronizada",
    technicalNotice:
      "As imagens públicas de One Piece podem conter watermark SAMPLE na própria fonte oficial/pública disponível.",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: GAME_SAMPLE_DECKLISTS.onepiece,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.onepiece,
    backendGameKey: "onepiece",
  },

  fab: {
    id: "fab",
    label: "Flesh and Blood",
    shortLabel: "FAB",
    status: "active",
    statusLabel: "Novo",
    sourceLabel: "GoAgain",
    sourceBaseLabel: "GoAgain/base local sincronizada",
    cardWidthMm: 63,
    cardHeightMm: 88,
    defaultBackUrl: null,
    sampleDecklist: GAME_SAMPLE_DECKLISTS.fab,
    decklistPlaceholder: GAME_SAMPLE_DECKLISTS.fab,
    backendGameKey: "fab",
  },
};

function getGameConfig(gameId) {
  return GAME_CONFIGS[gameId] || GAME_CONFIGS.magic;
}

function getGameDisplayLabel(gameConfig) {
  return gameConfig.displayLabel || gameConfig.label;
}

function getGameShortLabel(gameConfig) {
  return gameConfig.displayShortLabel || gameConfig.shortLabel || getGameDisplayLabel(gameConfig);
}

function getGameSupportTitle(gameConfig) {
  return `${getGameDisplayLabel(gameConfig)} usa base local sincronizada`;
}

function getGameSupportDescription(gameConfig) {
  const baseText = `Fonte/base: ${gameConfig.sourceBaseLabel}. Clique em uma carta para trocar versões ou artes alternativas quando houver dados disponíveis.`;

  if (gameConfig.technicalNotice) {
    return `${baseText} Aviso técnico: ${gameConfig.technicalNotice}`;
  }

  return baseText;
}

function getGameLoadingCopy(gameConfig) {
  return {
    title: `Buscando cartas de ${getGameShortLabel(gameConfig)}...`,
    description: `Consultando ${gameConfig.sourceBaseLabel}.`,
    hint: gameConfig.technicalNotice || "",
  };
}

window.GameConfigs = {
  all: GAME_CONFIGS,
  samples: GAME_SAMPLE_DECKLISTS,
  getGameConfig,
  getGameDisplayLabel,
  getGameShortLabel,
  getGameSupportTitle,
  getGameSupportDescription,
  getGameLoadingCopy,
};
