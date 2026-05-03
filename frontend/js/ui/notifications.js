/**
 * Deck Fill - UI Notifications Module
 * Centralized notification and loading management
 */

/**
 * Mostra a tela de loading
 */
function showLoading() {
  elements.loadingSection.classList.remove("hidden");
  elements.resultsSection.classList.add("hidden");
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
  elements.loadingSection.classList.add("hidden");
  elements.processBtn.disabled = false;
  elements.processBtn.innerHTML = `
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
        </svg>
        <span>Processar Deck</span>
    `;
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className =
    "fixed top-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg z-50 fade-in";
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
  elements.errorsList.innerHTML = "";
  errors.forEach((error) => {
    const li = document.createElement("li");
    li.textContent = error;
    elements.errorsList.appendChild(li);
  });
  elements.errorsSection.classList.remove("hidden");
}

/**
 * Esconde seção de erros
 */
function hideErrors() {
  elements.errorsSection.classList.add("hidden");
}

/**
 * Mostra o Modal de Progresso
 */
function showProgressModal() {
  elements.progressModal.classList.remove("hidden");
  updateProgress(0, "Iniciando...", 0, 0);
}

/**
 * Esconde o Modal de Progresso
 */
function hideProgressModal() {
  elements.progressModal.classList.add("hidden");
}

/**
 * Atualiza a barra de progresso e status
 */
function updateProgress(
  percentage,
  status,
  currentCard,
  totalCards,
  currentPage = 0,
) {
  const roundedPercentage = Math.round(percentage);
  elements.progressBar.style.width = `${roundedPercentage}%`;
  elements.progressPercentage.textContent = `${roundedPercentage}%`;
  elements.progressStatus.textContent = `Status: ${status}`;
  elements.progressCards.textContent = `Carta: ${currentCard} de ${totalCards}`;

  // Calcular página atual usando Math.ceil(cartasProcessadas / 9)
  // Se não tiver cartas processadas, mostra página 1
  const calculatedPage = currentCard === 0 ? 1 : Math.ceil(currentCard / 9);
  elements.progressPages.textContent = `Página atual: ${calculatedPage}`;
}
