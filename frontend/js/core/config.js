/**
 * Deck Fill - Configuration Constants
 * Centralized configuration for the application
 */

// Constante do verso padrão do Magic
const MTG_BACK_URL =
  "https://upload.wikimedia.org/wikipedia/en/a/aa/Magic_the_gathering-card_back.jpg";

// Configuração da API
const API_BASE = "http://localhost:8000";

// Decklist de exemplo para demonstração e testes
const SAMPLE_DECKLIST = `1 Black Lotus (YDMU) 35
1 Tiamat (AFR) 298
1 Tovolar, Dire Overlord // Tovolar, the Midnight Scourge (SLD) 1612
1 Westvale Abbey // Ormendahl, Profane Prince (SLD) 1212
1 Ragavan, Nimble Pilferer (MH2) 315
1 Nicol Bolas, the Ravager // Nicol Bolas, the Arisen (SLD) 1211
1 Esika, God of the Tree // The Prismatic Bridge (SLD) 1208
1 Valki, God of Lies // Tibalt, Cosmic Impostor (KHM) 308
1 Murderous Rider // Swift End (SLD) 1981
1 Avacyn, Angel of Hope (INR) 482
1 Mana Crypt (2XM) 361
1 Reidane, God of the Worthy // Valkmira, Protector's Shield (KHM) 300
1 Swords to Plowshares (SLD) 2167
1 Demonic Tutor (CMM) 696
1 Avabruck Caretaker // Hollowhenge Huntmaster (SLD) 1608
1 Smothering Tithe (2X2) 342
1 Bloom Tender (ECL) 324
1 Chalice of the Void (LCC) 105
1 Plains (SLD) 2540
1 Rin and Seri, Inseparable (SLD) 1230`;

// Exportar para uso global
window.AppConfig = {
  MTG_BACK_URL,
  API_BASE,
  SAMPLE_DECKLIST,
};
