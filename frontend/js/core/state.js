/**
 * Deck Fill - Global State Management
 * Centralized state for the application
 */

// Estado da aplicação (variáveis globais compartilhadas)
window.AppState = {
  // Array de cartas processadas pela API
  currentCards: [],
  
  // Flag para cancelar geração de PDF
  isGenerationCancelled: false,
  
  // Flag para evitar múltiplos processamentos simultâneos
  isProcessing: false,
  
  // Índice da carta atualmente selecionada no modal de artes
  currentModalCardIndex: null,
  
  // Armazena imagens personalizadas (cardIndex -> {front: url, back: url})
  customImages: new Map(),
  
  // Armazena o DataURL do verso global personalizado
  globalCustomBackImage: null,
  
  // Métodos para atualizar estado de forma controlada
  setCurrentCards: function(cards) {
    this.currentCards = cards;
  },
  
  getCurrentCards: function() {
    return this.currentCards;
  },
  
  setProcessing: function(processing) {
    this.isProcessing = processing;
  },
  
  setGenerationCancelled: function(cancelled) {
    this.isGenerationCancelled = cancelled;
  },
  
  setCustomImage: function(cardIndex, imageData) {
    this.customImages.set(cardIndex, imageData);
  },
  
  getCustomImage: function(cardIndex) {
    return this.customImages.get(cardIndex);
  },
  
  clearCustomImages: function() {
    this.customImages.clear();
  },
  
  setGlobalCustomBackImage: function(imageData) {
    this.globalCustomBackImage = imageData;
  },
  
  getGlobalCustomBackImage: function() {
    return this.globalCustomBackImage;
  }
};
