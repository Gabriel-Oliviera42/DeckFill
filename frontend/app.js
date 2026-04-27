/**
 * Deck Fill - Frontend Application
 * JavaScript para processar decklists e renderizar cartas
 */

// Configuração da API
const API_BASE = 'http://localhost:8000';

// Estado da aplicação
let currentCards = [];
let isProcessing = false;
let currentModalCardIndex = null;

// Elementos DOM
const elements = {
    decklistInput: document.getElementById('decklist-input'),
    processBtn: document.getElementById('process-btn'),
    clearBtn: document.getElementById('clear-btn'),
    loadSampleBtn: document.getElementById('load-sample-btn'),
    generatePdfBtn: document.getElementById('generate-pdf-btn'),
    loadingSection: document.getElementById('loading-section'),
    resultsSection: document.getElementById('results-section'),
    cardsGrid: document.getElementById('cards-grid'),
    resultsSummary: document.getElementById('results-summary'),
    statusBadge: document.getElementById('status-badge'),
    errorsSection: document.getElementById('errors-section'),
    errorsList: document.getElementById('errors-list'),
    // Modal elements
    artModal: document.getElementById('art-modal'),
    modalCardName: document.getElementById('modal-card-name'),
    closeModalBtn: document.getElementById('close-modal-btn'),
    modalLoading: document.getElementById('modal-loading'),
    modalArtGrid: document.getElementById('modal-art-grid'),
    modalError: document.getElementById('modal-error')
};

// Decklist de exemplo
const SAMPLE_DECKLIST = `4x Lightning Bolt
4x Chain Lightning
4x Lava Dart
4x Rift Bolt
4x Flame Rift
4x Price of Progress
4x Fireblast
4x Searing Blaze
4x Lightning Helix
4x Swords to Plowshares
4x Force of Will
4x Daze
4x Brainstorm
4x Ponder
4x Preordain
4x Volcanic Island
4x Plateau
4x Tropical Island
2x Island
1x Mountain
1x Plains`;

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('Deck Fill Application started');
    initializeEventListeners();
    checkApiHealth();
});

/**
 * Inicializa os event listeners
 */
function initializeEventListeners() {
    // Botão Processar Deck
    elements.processBtn.addEventListener('click', processDecklist);
    
    // Botão Limpar
    elements.clearBtn.addEventListener('click', clearDecklist);
    
    // Botão Carregar Exemplo
    elements.loadSampleBtn.addEventListener('click', loadSampleDecklist);
    
    // Botão Gerar PDF
    elements.generatePdfBtn.addEventListener('click', generatePDF);
    
    // Modal events
    elements.closeModalBtn.addEventListener('click', closeArtModal);
    
    // Fechar modal clicando no backdrop
    elements.artModal.addEventListener('click', (e) => {
        if (e.target === elements.artModal) {
            closeArtModal();
        }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !elements.artModal.classList.contains('hidden')) {
            closeArtModal();
        }
    });
    
    // Inicializa delegação de eventos para cliques nas cartas
    initializeCardClickDelegation();
    
    // Atalho de teclado: Ctrl+Enter para processar
    elements.decklistInput.addEventListener('keydown', (e) => {
        if (e.ctrlKey && e.key === 'Enter') {
            processDecklist();
        }
    });
    
    // Auto-resize do textarea
    elements.decklistInput.addEventListener('input', () => {
        elements.decklistInput.style.height = 'auto';
        elements.decklistInput.style.height = elements.decklistInput.scrollHeight + 'px';
    });
    
    // Fechar seção de erros
    elements.errorsSection.addEventListener('click', (e) => {
        if (e.target === elements.errorsSection) {
            hideErrors();
        }
    });
}

/**
 * Verifica se a API está online
 */
async function checkApiHealth() {
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (data.status === 'healthy') {
            elements.statusBadge.innerHTML = '🟢 API Online';
            elements.statusBadge.className = 'bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium';
            console.log('API Health Check:', data);
        } else {
            throw new Error('API not healthy');
        }
    } catch (error) {
        elements.statusBadge.innerHTML = '🔴 API Offline';
        elements.statusBadge.className = 'bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium';
        console.error('API Health Check failed:', error);
        showError('API está offline. Inicie o servidor backend: python main.py');
    }
}

/**
 * Processa o decklist
 */
async function processDecklist() {
    const decklist = elements.decklistInput.value.trim();
    
    // Validação básica
    if (!decklist) {
        showError('Por favor, cole um decklist para processar.');
        return;
    }
    
    if (isProcessing) {
        console.log('Já está processando...');
        return;
    }
    
    isProcessing = true;
    showLoading();
    hideErrors();
    
    try {
        console.log('Enviando decklist para API...');
        
        const response = await fetch(`${API_BASE}/parse-deck`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ decklist })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Resposta da API:', data);
        
        // Atualizar estado
        currentCards = data.cards;
        
        // Renderizar resultados
        renderResults(data);
        
    } catch (error) {
        console.error('Erro ao processar decklist:', error);
        showError('Erro ao processar decklist. Verifique se a API está online.');
    } finally {
        isProcessing = false;
        hideLoading();
    }
}

/**
 * Renderiza os resultados
 */
function renderResults(data) {
    const { cards, total_cards, processing_time_ms, errors } = data;
    
    // Atualizar summary
    elements.resultsSummary.textContent = 
        `${total_cards} cartas encontradas em ${processing_time_ms}ms`;
    
    // Limpar grid
    elements.cardsGrid.innerHTML = '';
    
    // Renderizar cards
    cards.forEach((card, index) => {
        const cardElement = createCardElement(card, index);
        elements.cardsGrid.appendChild(cardElement);
    });
    
    // Adicionar handlers de clique para abrir modal
    addCardClickHandlers();
    
    // Mostrar errors se houver
    if (errors && errors.length > 0) {
        showErrors(errors);
    }
    
    // Mostrar seção de resultados
    elements.resultsSection.classList.remove('hidden');
    
    // Scroll para resultados
    elements.resultsSection.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'start' 
    });
}

/**
 * Cria um elemento de card
 */
function createCardElement(card, index) {
    const cardDiv = document.createElement('div');
    cardDiv.className = 'card-item bg-white rounded-xl shadow-lg overflow-hidden fade-in';
    cardDiv.style.animationDelay = `${index * 50}ms`;
    
    // Verificar se tem imagem
    if (card.image_uri_normal) {
        cardDiv.innerHTML = `
            <div class="relative aspect-[2.5/3.5]">
                <img 
                    src="${card.image_uri_normal}" 
                    alt="${card.name}"
                    class="w-full h-full object-contain"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwiPsOJbWFnZW0gbmFvIGRpc3BvbsOtdmVsPC90ZXh0Pgo8L3N2Zz4K'"
                />
                <div class="absolute top-2 right-2 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">
                    ${card.set_code}
                </div>
            </div>
            <div class="p-3">
                <h3 class="font-bold text-gray-800 text-sm truncate" title="${card.name}">
                    ${card.name}
                </h3>
                <div class="flex items-center justify-between mt-1">
                    <span class="text-xs text-gray-600">
                        #${card.collector_number}
                    </span>
                    <span class="text-xs text-gray-500">
                        ${card.lang.toUpperCase()}
                    </span>
                </div>
            </div>
        `;
    } else {
        // Card sem imagem
        cardDiv.innerHTML = `
            <div class="aspect-[2.5/3.5] flex flex-col justify-center items-center bg-gray-100">
                <div class="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center mb-3">
                    <svg class="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                    </svg>
                </div>
                <h3 class="font-bold text-gray-800 text-center text-sm">
                    ${card.name}
                </h3>
                <p class="text-xs text-gray-600 mt-1">
                    ${card.set_code} #${card.collector_number}
                </p>
            </div>
        `;
    }
    
    return cardDiv;
}

/**
 * Mostra a tela de loading
 */
function showLoading() {
    elements.loadingSection.classList.remove('hidden');
    elements.resultsSection.classList.add('hidden');
    elements.processBtn.disabled = true;
    elements.processBtn.innerHTML = `
        <svg class="animate-spin w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Processando...</span>
    `;
}

/**
 * Esconde a tela de loading
 */
function hideLoading() {
    elements.loadingSection.classList.add('hidden');
    elements.processBtn.disabled = false;
    elements.processBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span>Processar Deck</span>
    `;
}

/**
 * Limpa o decklist
 */
function clearDecklist() {
    elements.decklistInput.value = '';
    elements.decklistInput.style.height = 'auto';
    elements.resultsSection.classList.add('hidden');
    elements.loadingSection.classList.add('hidden');
    hideErrors();
    currentCards = [];
}

/**
 * Carrega o decklist de exemplo
 */
function loadSampleDecklist() {
    elements.decklistInput.value = SAMPLE_DECKLIST;
    elements.decklistInput.style.height = 'auto';
    elements.decklistInput.style.height = elements.decklistInput.scrollHeight + 'px';
    
    // Destacar o botão
    elements.loadSampleBtn.classList.add('bg-green-700');
    setTimeout(() => {
        elements.loadSampleBtn.classList.remove('bg-green-700');
    }, 200);
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in';
    errorDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(errorDiv);
    
    // Auto-remove após 5 segundos
    setTimeout(() => {
        errorDiv.remove();
    }, 5000);
}

/**
 * Mostra erros da API
 */
function showErrors(errors) {
    elements.errorsList.innerHTML = '';
    errors.forEach(error => {
        const li = document.createElement('li');
        li.textContent = error;
        elements.errorsList.appendChild(li);
    });
    elements.errorsSection.classList.remove('hidden');
}

/**
 * Esconde seção de erros
 */
function hideErrors() {
    elements.errorsSection.classList.add('hidden');
}

/**
 * Gera PDF com as cartas processadas
 * 
 * Implementação Phase 4: Layout 3x3 em A4 com dimensões MTG oficiais (63x88mm)
 * Usa jsPDF v2.5.1 com conversão segura para Base64 para evitar CORS
 */
async function generatePDF() {
    if (!currentCards || currentCards.length === 0) {
        showError('Nenhuma carta para gerar PDF. Processe um decklist primeiro.');
        return;
    }
    
    // Atualizar estado do botão
    const originalText = elements.generatePdfBtn.innerHTML;
    elements.generatePdfBtn.disabled = true;
    elements.generatePdfBtn.innerHTML = `
        <svg class="animate-spin w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
        </svg>
        <span>Gerando PDF...</span>
    `;
    
    try {
        console.log('Iniciando geração de PDF...');
        
        // Inicializar jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // Dimensões
        const pageWidth = 210; // A4 width in mm
        const pageHeight = 297; // A4 height in mm
        const cardWidth = 63; // Magic card width in mm
        const cardHeight = 88; // Magic card height in mm
        
        // Calcular layout 3x3
        const cols = 3;
        const rows = 3;
        const cardsPerPage = cols * rows;
        
        // Margens para centralizar
        const totalCardsWidth = cols * cardWidth;
        const totalCardsHeight = rows * cardHeight;
        const marginX = (pageWidth - totalCardsWidth) / 2;
        const marginY = (pageHeight - totalCardsHeight) / 2;
        
        // Espaçamento entre cartas
        const spacingX = 0;
        const spacingY = 0;
        
        console.log(`Layout: ${cols}x${rows}, ${cardsPerPage} cartas/página`);
        console.log(`Margens: X=${marginX.toFixed(1)}mm, Y=${marginY.toFixed(1)}mm`);
        console.log(`Processando ${currentCards.length} cartas...`);
        
        // Processar cada carta
        for (let i = 0; i < currentCards.length; i++) {
            const card = currentCards[i];
            
            // Calcular posição na página
            const cardIndex = i;
            const pageIndex = Math.floor(cardIndex / cardsPerPage);
            const cardIndexInPage = cardIndex % cardsPerPage;
            
            // Adicionar nova página se necessário (exceto primeira)
            if (pageIndex > 0 && cardIndexInPage === 0) {
                doc.addPage();
                console.log(`Adicionando página ${pageIndex + 1}`);
            }
            
            // Calcular coordenadas
            const col = cardIndexInPage % cols;
            const row = Math.floor(cardIndexInPage / cols);
            const x = marginX + (col * (cardWidth + spacingX));
            const y = marginY + (row * (cardHeight + spacingY));
            
            // Buscar imagem
            try {
                const imageUrl = card.image_uri_png || card.image_uri_normal;
                if (!imageUrl) {
                    console.warn(`Carta sem imagem: ${card.name}`);
                    continue;
                }
                
                console.log(`Processando carta ${i + 1}/${currentCards.length}: ${card.name}`);
                
                // Fazer fetch da imagem
                const response = await fetch(imageUrl);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                
                // Converter para Blob e depois para DataURL
                const blob = await response.blob();
                const dataUrl = await blobToDataUrl(blob);
                
                // Adicionar imagem ao PDF
                doc.addImage(dataUrl, 'JPEG', x, y, cardWidth, cardHeight);
                
            } catch (error) {
                console.error(`Erro ao processar carta ${card.name}:`, error);
                // Continuar com as próximas cartas mesmo se esta falhar
            }
        }
        
        // Salvar PDF
        console.log('Salvando PDF...');
        doc.save('decklist.pdf');
        
        console.log('PDF gerado com sucesso!');
        
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        showError('Erro ao gerar PDF. Tente novamente.');
    } finally {
        // Restaurar estado do botão
        elements.generatePdfBtn.disabled = false;
        elements.generatePdfBtn.innerHTML = originalText;
    }
}

/**
 * Converte Blob para DataURL
 */
function blobToDataUrl(blob) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
    });
}

/**
 * Abre o modal de escolha de artes
 */
async function openArtModal(card, cardIndex) {
    currentModalCardIndex = cardIndex;
    
    // Configurar modal
    elements.modalCardName.textContent = card.name;
    elements.artModal.classList.remove('hidden');
    elements.modalLoading.classList.remove('hidden');
    elements.modalArtGrid.classList.add('hidden');
    elements.modalError.classList.add('hidden');
    
    try {
        console.log(`Buscando artes para: ${card.name}`);
        
        // Buscar todas as impressões da carta
        const response = await fetch(`${API_BASE}/printings/${encodeURIComponent(card.name)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const printings = await response.json();
        
        if (!printings || printings.length === 0) {
            throw new Error('Nenhuma arte encontrada');
        }
        
        console.log(`Encontradas ${printings.length} artes para ${card.name}`);
        
        // Renderizar artes no grid
        renderArtOptions(printings, card);
        
    } catch (error) {
        console.error('Erro ao buscar artes:', error);
        elements.modalLoading.classList.add('hidden');
        elements.modalError.classList.remove('hidden');
    }
}

/**
 * Renderiza as opções de arte no modal
 */
function renderArtOptions(printings, currentCard) {
    elements.modalArtGrid.innerHTML = '';
    elements.modalLoading.classList.add('hidden');
    elements.modalArtGrid.classList.remove('hidden');
    
    printings.forEach((printing, index) => {
        const artOption = document.createElement('div');
        artOption.className = 'relative cursor-pointer group';
        
        // Destacar a arte atualmente selecionada
        const isCurrentArt = printing.image_uri_normal === currentCard.image_uri_normal;
        
        artOption.innerHTML = `
            <div class="relative aspect-[2.5/3.5] rounded-lg overflow-hidden border-2 ${isCurrentArt ? 'border-mtg-blue' : 'border-gray-300'} group-hover:border-mtg-blue transition-colors">
                <img 
                    src="${printing.image_uri_normal}" 
                    alt="${printing.name} - ${printing.set_code}"
                    class="w-full h-full object-contain"
                    loading="lazy"
                    onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjRjVGNUY1Ii8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTQwIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjOTk5OTk5IiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwiPsOJbWFnZW0gbmFvIGRpc3BvbsOtdmVsPC90ZXh0Pgo8L3N2Zz4K'"
                />
                <div class="absolute top-1 right-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    ${printing.set_code}
                </div>
                <div class="absolute bottom-1 left-1 bg-black bg-opacity-70 text-white px-2 py-1 rounded text-xs">
                    #${printing.collector_number}
                </div>
                ${isCurrentArt ? '<div class="absolute top-1 left-1 bg-mtg-blue text-white px-2 py-1 rounded text-xs">Atual</div>' : ''}
            </div>
            <div class="mt-1 text-center">
                <p class="text-xs font-medium text-gray-700">${printing.set_code}</p>
                <p class="text-xs text-gray-500">#${printing.collector_number}</p>
            </div>
        `;
        
        // Adicionar evento de clique
        artOption.addEventListener('click', () => selectArt(printing, currentCard));
        
        elements.modalArtGrid.appendChild(artOption);
    });
}

/**
 * Seleciona uma nova arte para a carta
 */
function selectArt(newPrinting, currentCard) {
    console.log(`Selecionando nova arte: ${newPrinting.set_code} #${newPrinting.collector_number}`);
    
    // Atualizar o objeto da carta no array principal
    currentCards[currentModalCardIndex] = {
        ...currentCards[currentModalCardIndex],
        image_uri_normal: newPrinting.image_uri_normal,
        image_uri_png: newPrinting.image_uri_png,
        set_code: newPrinting.set_code,
        collector_number: newPrinting.collector_number
    };
    
    // Atualizar apenas o elemento específico no DOM
    updateCardElement(currentModalCardIndex);
    
    // Fechar modal
    closeArtModal();
}

/**
 * Atualiza apenas o elemento de carta específico no DOM
 */
function updateCardElement(cardIndex) {
    const card = currentCards[cardIndex];
    const cardElements = elements.cardsGrid.children;
    
    if (cardElements[cardIndex]) {
        const newCardElement = createCardElement(card, cardIndex);
        // Garante que o novo elemento tenha cursor pointer
        newCardElement.style.cursor = 'pointer';
        cardElements[cardIndex].replaceWith(newCardElement);
    }
}

/**
 * Fecha o modal de artes
 */
function closeArtModal() {
    elements.artModal.classList.add('hidden');
    currentModalCardIndex = null;
}

/**
 * Inicializa delegação de eventos para cliques nas cartas
 * (Abordagem 1 - Recomendada: Delegação de Eventos)
 */
function initializeCardClickDelegation() {
    // Adiciona um único listener no container pai
    elements.cardsGrid.addEventListener('click', (e) => {
        // Encontra o elemento .card-item mais próximo do clique
        const cardElement = e.target.closest('.card-item');
        
        if (cardElement) {
            // Encontra o índice da carta no container
            const cardElements = Array.from(elements.cardsGrid.children);
            const cardIndex = cardElements.indexOf(cardElement);
            
            if (cardIndex !== -1 && currentCards[cardIndex]) {
                openArtModal(currentCards[cardIndex], cardIndex);
            }
        }
    });
}

/**
 * Adiciona evento de clique às cartas para abrir o modal
 * (Mantido para compatibilidade, mas usa delegação)
 */
function addCardClickHandlers() {
    // Apenas garante que as cartas tenham cursor pointer
    const cardElements = elements.cardsGrid.querySelectorAll('.card-item');
    cardElements.forEach(cardElement => {
        cardElement.style.cursor = 'pointer';
    });
}

// Exportar funções para debug (console)
window.deckFillApp = {
    processDecklist,
    clearDecklist,
    loadSampleDecklist,
    generatePDF,
    openArtModal,
    currentCards,
    checkApiHealth
};

console.log('Deck Fill App initialized');
