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
        <i data-lucide="loader-circle" class="animate-spin df-icon-lg" aria-hidden="true"></i>
        <span>Processando...</span>
    `;
  AppConfig.refreshIcons?.();
}

/**
 * Esconde a tela de loading
 */
function hideLoading() {
  elements.loadingSection.classList.add("hidden");
  elements.processBtn.disabled = false;
  elements.processBtn.innerHTML = `
        <i data-lucide="wand-sparkles" class="df-icon-lg" aria-hidden="true"></i>
        <span>Processar Deck</span>
    `;
  AppConfig.refreshIcons?.();
}

/**
 * Mostra mensagem de erro
 */
function showError(message) {
  const errorDiv = document.createElement("div");
  errorDiv.className =
    "fixed top-4 right-4 bg-df-danger text-df-bg px-6 py-3 rounded-lg shadow-lg z-50 fade-in";
  errorDiv.innerHTML = `
        <div class="flex items-center space-x-2">
            <i data-lucide="circle-alert" class="df-icon-lg" aria-hidden="true"></i>
            <span>${message}</span>
        </div>
    `;

  document.body.appendChild(errorDiv);
  AppConfig.refreshIcons?.();

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
