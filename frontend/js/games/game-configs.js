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
1 Crown of Providence (ANQ #ANQ005)
1 Arcanite Skullcap (ARC #ARC150)
1 Mask of Momentum (FAB #FAB005)
1 Braveforge Bracers (FAB #FAB006)
1 Snapdragon Scalers (ARA #ARA006)
1 Nullrune Robe (FAB #FAB069)
1 Art of War (ARC #ARC160)
1 Tome of Fyendal (WTR #WTR160)
1 Heart of Fyendal (ANQ #ANQ001)
1 Fyendal's Spring Tunic (FAB #FAB001)
1 Dawnblade (FAB #FAB062)
1 Rosetta Thorn (BRI #BRI004)
1 Channel Mount Heroic (ELE #ELE117)
1 Warmonger's Diplomacy (DTD #DTD230)
1 This Round's on Me (ANQ #ANQ024)`,
};

const GAME_AUTOCOMPLETE_CATEGORIES = {
  magic: [
    { id: "basic-lands", label: "Terrenos basicos", aliases: ["equivalents"], cards: ["Plains", "Island", "Swamp", "Mountain", "Forest", "Wastes", "Snow-Covered Plains", "Snow-Covered Island", "Snow-Covered Swamp", "Snow-Covered Mountain", "Snow-Covered Forest"] },
    { id: "commander-staples", label: "Staples Commander", aliases: ["staples"], cards: ["Sol Ring", "Arcane Signet", "Command Tower", "Swords to Plowshares", "Counterspell", "Cyclonic Rift", "Lightning Greaves", "Swiftfoot Boots", "Path to Exile", "Beast Within", "Chaos Warp", "Generous Gift", "Rhystic Study", "Mystic Remora", "Smothering Tithe", "Dockside Extortionist", "Esper Sentinel", "Teferi's Protection", "Demonic Tutor", "Vampiric Tutor"] },
    { id: "common-tokens", label: "Tokens comuns", cards: ["Treasure Token", "Clue Token", "Food Token", "Blood Token", "Map Token", "Powerstone Token", "Gold Token", "Zombie Token", "Goblin Token", "Soldier Token", "Spirit Token", "Saproling Token", "Thopter Token", "Servo Token", "Construct Token", "Beast Token", "Dragon Token", "Angel Token", "Vampire Token", "Human Token"] },
    { id: "iconic", label: "Cartas iconicas", cards: ["Black Lotus", "Lightning Bolt", "Birds of Paradise", "Serra Angel", "Shivan Dragon", "Sol Ring", "Counterspell", "Dark Ritual", "Llanowar Elves", "Swords to Plowshares", "Demonic Tutor", "Wrath of God", "Force of Will", "Jace, the Mind Sculptor", "Nicol Bolas, the Ravager", "Tiamat", "Avacyn, Angel of Hope", "Ragavan, Nimble Pilferer", "Mana Crypt", "Smothering Tithe"] },
    { id: "removal", label: "Remocoes uteis", cards: ["Swords to Plowshares", "Path to Exile", "Beast Within", "Chaos Warp", "Generous Gift", "Anguished Unmaking", "Vindicate", "Assassin's Trophy", "Abrupt Decay", "Terminate", "Go for the Throat", "Infernal Grasp", "Reality Shift", "Pongify", "Rapid Hybridization", "Vandalblast", "Wear // Tear", "Cyclonic Rift", "Toxic Deluge", "Austere Command"] },
    { id: "ramp", label: "Ramp", cards: ["Sol Ring", "Arcane Signet", "Cultivate", "Kodama's Reach", "Farseek", "Nature's Lore", "Three Visits", "Rampant Growth", "Skyshroud Claim", "Sakura-Tribe Elder", "Birds of Paradise", "Llanowar Elves", "Elvish Mystic", "Fyndhorn Elves", "Bloom Tender", "Smothering Tithe", "Dockside Extortionist", "Mana Crypt", "Fellwar Stone", "Talisman of Progress"] },
    { id: "draw", label: "Draw", cards: ["Rhystic Study", "Mystic Remora", "Harmonize", "Night's Whisper", "Fact or Fiction", "Esper Sentinel", "Phyrexian Arena", "Necropotence", "Guardian Project", "Beast Whisperer", "Skullclamp", "Wheel of Fortune", "Windfall", "Return of the Wildspeaker", "Rishkar's Expertise", "Blue Sun's Zenith", "Read the Bones", "Sign in Blood", "Toski, Bearer of Secrets", "The Great Henge"] },
  ],

  pokemon: [
    { id: "basic-energy", label: "Energias basicas", aliases: ["equivalents"], cards: ["Fire Energy", "Water Energy", "Lightning Energy", "Psychic Energy", "Grass Energy", "Fighting Energy", "Darkness Energy", "Metal Energy", "Fairy Energy", "Basic Energy"] },
    { id: "trainers", label: "Trainers uteis", aliases: ["staples"], cards: ["Rare Candy", "Switch", "Professor's Research", "Ultra Ball", "Nest Ball", "Boss's Orders", "Iono", "Arven", "Buddy-Buddy Poffin", "Earthen Vessel", "Super Rod", "Energy Retrieval", "Escape Rope", "Battle VIP Pass", "Judge", "Colress's Experiment", "Pal Pad", "Forest Seal Stone", "Technical Machine: Evolution", "Professor's Letter"] },
    { id: "iconic", label: "Cartas iconicas", cards: ["Pikachu", "Charizard", "Mewtwo", "Lugia V", "Gardevoir ex", "Mew", "Lucario", "Gengar", "Snorlax", "Eevee", "Umbreon VMAX", "Rayquaza VMAX", "Arceus VSTAR", "Giratina VSTAR", "Greninja ex", "Dragonite V", "Blastoise ex", "Venusaur ex", "Miraidon ex", "Koraidon ex"] },
  ],

  yugioh: [
    { id: "staples", label: "Staples", cards: ["Pot of Greed", "Monster Reborn", "Raigeki", "Harpie's Feather Duster", "Called by the Grave", "Forbidden Droplet", "Triple Tactics Talent", "Crossout Designator", "Infinite Impermanence", "Evenly Matched", "Lightning Storm", "Book of Moon", "Cosmic Cyclone", "Twin Twisters", "Dark Ruler No More", "Nibiru, the Primal Being", "Effect Veiler", "Ash Blossom & Joyous Spring", "Ghost Belle & Haunted Mansion", "Droll & Lock Bird"] },
    { id: "hand-traps", label: "Hand traps", cards: ["Ash Blossom & Joyous Spring", "Ghost Ogre & Snow Rabbit", "Effect Veiler", "Droll & Lock Bird", "Ghost Belle & Haunted Mansion", "Nibiru, the Primal Being", "PSY-Framegear Gamma", "D.D. Crow", "Dimension Shifter", "Artifact Lancea", "Ghost Mourner & Moonlit Chill", "Ghost Reaper & Winter Cherries", "Skull Meister", "Token Collector", "Contact C", "Retaliating C", "Maxx C", "Fantastical Dragon Phantazmay", "Herald of Orange Light", "Battle Fader"] },
    { id: "classic-spells", label: "Magias classicas", cards: ["Pot of Greed", "Monster Reborn", "Raigeki", "Dark Hole", "Change of Heart", "Harpie's Feather Duster", "Mystical Space Typhoon", "Heavy Storm", "Graceful Charity", "Delinquent Duo", "Premature Burial", "Snatch Steal", "Book of Moon", "Scapegoat", "Polymerization", "Fusion Deployment", "Reinforcement of the Army", "Foolish Burial", "Terraforming", "Card Destruction"] },
    { id: "classic-traps", label: "Armadilhas classicas", cards: ["Mirror Force", "Torrential Tribute", "Solemn Judgment", "Magic Cylinder", "Trap Hole", "Bottomless Trap Hole", "Compulsory Evacuation Device", "Call of the Haunted", "Ring of Destruction", "Imperial Order", "Skill Drain", "Royal Decree", "Dust Tornado", "Waboku", "Threatening Roar", "Sakuretsu Armor", "Dimensional Prison", "Solemn Warning", "Solemn Strike", "Infinite Impermanence"] },
    { id: "iconic", label: "Cartas iconicas", cards: ["Blue-Eyes White Dragon", "Dark Magician", "Exodia the Forbidden One", "Stardust Dragon", "Red-Eyes Black Dragon", "Dark Magician Girl", "Blue-Eyes Alternative White Dragon", "Blue-Eyes Ultimate Dragon", "Black Luster Soldier", "Number 39: Utopia", "Borreload Dragon", "Accesscode Talker", "Elemental HERO Neos", "Cyber Dragon", "Jinzo", "Kuriboh", "Summoned Skull", "Slifer the Sky Dragon", "Obelisk the Tormentor", "The Winged Dragon of Ra"] },
  ],

  lorcana: [
    { id: "iconic", label: "Cartas iconicas", cards: ["Mickey Mouse - Brave Little Prince", "Elsa - Ice Artisan", "Stitch - Experiment 626", "Maleficent - Monstrous Dragon", "Belle - Accomplished Mystic", "Rapunzel - Gifted with Healing", "Tinker Bell - Giant Fairy", "Simba - King in the Making", "Ursula - Sea Witch Queen", "Hades - Infernal Schemer", "Maui - Hero to All", "Aladdin - Barreling Through", "Ariel - Ethereal Voice", "Beast - Gracious Prince", "Cinderella - Dream Come True", "Goofy - Galumphing Gumshoe", "Donald Duck - Flustered Sorcerer", "Madam Mim - Purple Dragon", "Merlin - Completing His Research", "Be Prepared"] },
    { id: "staples", label: "Staples", cards: ["Be Prepared", "Maui - Hero to All", "Tinker Bell - Giant Fairy", "A Whole New World", "Friends on the Other Side", "Grab Your Sword", "Let It Go", "Dragon Fire", "Fishbone Quill", "Madam Mim - Fox", "Madam Mim - Snake", "Merlin - Goat", "Merlin - Rabbit", "Hiram Flaversham - Toymaker", "Bucky - Squirrel Squeak Tutor", "Ursula - Deceiver of All", "Sisu - Empowered Sibling", "Robin Hood - Champion of Sherwood", "Ariel - Spectacular Singer", "The Queen - Commanding Presence"] },
    { id: "popular-characters", label: "Personagens populares", cards: ["Simba - King in the Making", "Ariel - Ethereal Voice", "Belle - Accomplished Mystic", "Donald Duck - Flustered Sorcerer", "Mickey Mouse - Brave Little Prince", "Minnie Mouse - Stylish Surfer", "Stitch - Rock Star", "Stitch - Carefree Surfer", "Elsa - Snow Queen", "Elsa - Spirit of Winter", "Maleficent - Biding Her Time", "Maleficent - Monstrous Dragon", "Ursula - Sea Witch", "Ursula - Sea Witch Queen", "Mulan - Imperial Soldier", "Rapunzel - Gifted with Healing", "Peter Pan - Never Landing", "Tinker Bell - Tiny Tactician", "Goofy - Daredevil", "Hades - Lord of the Underworld"] },
  ],

  onepiece: [
    { id: "don", label: "DON!! cards", aliases: ["equivalents"], cards: ["DON!!"] },
    { id: "leaders", label: "Lideres", cards: ["Monkey.D.Luffy", "Roronoa Zoro", "Trafalgar Law", "Yamato", "Shanks", "Portgas.D.Ace", "Donquixote Doflamingo", "Boa Hancock", "Charlotte Katakuri", "Kaido", "Big Mom", "Monkey.D.Garp", "Sabo", "Dracule Mihawk", "Nico Robin", "Eustass Captain Kid", "Nami", "Sanji", "Tony Tony.Chopper", "Uta"] },
    { id: "staples", label: "Staples", cards: ["Nami", "Sanji", "Tony Tony.Chopper", "Gum-Gum Jet Pistol", "Radical Beam!!", "Guard Point", "Love-Love Mellow", "Paradise Waterfall", "Blast Breath", "Jet Pistol", "Red Roc", "Thunder Bagua", "Donquixote Doflamingo", "Trafalgar Law", "Marco", "Rebecca", "Brook", "Borsalino", "Rob Lucci", "Sabo"] },
    { id: "iconic", label: "Cartas iconicas", cards: ["Monkey.D.Luffy", "Shanks", "Portgas.D.Ace", "Boa Hancock", "Roronoa Zoro", "Nami", "Sanji", "Tony Tony.Chopper", "Trafalgar Law", "Eustass Captain Kid", "Yamato", "Donquixote Doflamingo", "Charlotte Katakuri", "Kaido", "Big Mom", "Monkey.D.Garp", "Sabo", "Dracule Mihawk", "Nico Robin", "Gum-Gum Jet Pistol"] },
  ],

  fab: [
    { id: "common-equipment", label: "Equipamentos comuns", aliases: ["equivalents"], cards: ["Nullrune Robe", "Nullrune Hood", "Nullrune Gloves", "Nullrune Boots", "Snapdragon Scalers", "Braveforge Bracers", "Arcanite Skullcap", "Crown of Providence", "Fyendal's Spring Tunic", "Ironrot Helm", "Ironrot Plate", "Ironrot Gauntlet", "Ironrot Legs", "Goliath Gauntlet", "Mage Master Boots", "Talismanic Lens", "Hope Merchant's Hood", "Flick Knives", "Mask of Momentum", "Teklo Foundry Heart"] },
    { id: "staples", label: "Staples", cards: ["Sink Below", "Command and Conquer", "Enlightened Strike", "Art of War", "Tome of Fyendal", "Warmonger's Diplomacy", "This Round's on Me", "Fate Foreseen", "Oasis Respite", "Razor Reflex", "Pummel", "Sigil of Solace", "Scar for a Scar", "Ravenous Rabble", "Snatch", "Fyendal's Spring Tunic", "Crown of Providence", "Arcanite Skullcap", "Channel Mount Heroic", "Remembrance"] },
    { id: "heroes", label: "Herois", cards: ["Bravo", "Dorinthea", "Katsu", "Dash", "Rhinar", "Kano", "Viserai", "Azalea", "Boltyn", "Chane", "Lexi", "Prism", "Oldhim", "Briar", "Iyslander", "Fai", "Dromai", "Arakni", "Uzuri", "Kayo"] },
    { id: "iconic", label: "Cartas iconicas", cards: ["Fyendal's Spring Tunic", "Command and Conquer", "Enlightened Strike", "Heart of Fyendal", "Art of War", "Tome of Fyendal", "Crown of Providence", "Arcanite Skullcap", "Mask of Momentum", "Braveforge Bracers", "Dawnblade", "Rosetta Thorn", "Channel Mount Heroic", "Warmonger's Diplomacy", "This Round's on Me", "Sink Below", "Fyendal's Fighting Spirit", "Bloodrush Bellow", "Crippling Crush", "Teklo Plasma Pistol"] },
  ],
};
const LANGUAGE_OPTIONS = [
  { id: "en", label: "Inglês" },
  { id: "pt", label: "Português" },
  { id: "ja", label: "Japonês" },
  { id: "es", label: "Espanhol" },
  { id: "fr", label: "Francês" },
  { id: "de", label: "Alemão" },
  { id: "it", label: "Italiano" },
];

const GAME_CONFIGS = {
  magic: {
    id: "magic",
    label: "Magic: The Gathering",
    shortLabel: "Magic",
    status: "active",
    statusLabel: "Estável",
    sourceLabel: "Scryfall",
    sourceBaseLabel: "Scryfall/base local sincronizada",
    supportsRelatedTokens: true,
    languages: {
      supported: true,
      default: "en",
      fallback: "en",
      options: LANGUAGE_OPTIONS,
      partialNotice: "Português e outros idiomas dependem da existência daquela impressão no Scryfall.",
    },
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
    statusLabel: "Estável",
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
    statusLabel: "Estável",
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
    statusLabel: "Estável",
    sourceLabel: "Lorcast",
    sourceBaseLabel: "Lorcast/base local sincronizada",
    technicalNotice:
      "Disney Lorcana usa imagens vindas da fonte Lorcast/base local. Algumas imagens podem falhar na conversão usada pelo PDF; se isso acontecer, teste outra arte/versão ou gere o PDF sem essa carta até ajustarmos o pipeline de imagem.",
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
    statusLabel: "Parcial",
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
    statusLabel: "Estável",
    sourceLabel: "GoAgain",
    sourceBaseLabel: "GoAgain/base local sincronizada",
    technicalNotice:
      "Algumas imagens de Flesh and Blood chegam com borda branca na própria fonte. Ao trocar a arte, prefira versões/prints sem essa borda; a Borda Preta do PDF não remove bordas que já fazem parte da imagem original.",
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
  return `Aviso técnico de ${getGameDisplayLabel(gameConfig)}`;
}

function getGameSupportDescription(gameConfig) {
  return gameConfig.technicalNotice || "";
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
  autocompleteCategories: GAME_AUTOCOMPLETE_CATEGORIES,
  languages: LANGUAGE_OPTIONS,
  getGameConfig,
  getGameDisplayLabel,
  getGameShortLabel,
  getGameSupportTitle,
  getGameSupportDescription,
  getGameLoadingCopy,
};
