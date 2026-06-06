/**
 * Deck Fill - API Client Module
 * Handles all API communication with the backend
 */

/**
 * Verifica se a API está online
 */
async function checkApiHealth() {
  try {
    const response = await fetch(`${AppConfig.API_BASE}/health`);
    const data = await response.json();

    if (data.status === "healthy") {
      elements.statusBadge.innerHTML = `
        <i data-lucide="wifi" class="df-icon-sm" aria-hidden="true"></i>
        <span>API Online</span>
      `;
      elements.statusBadge.className =
        "df-status-badge bg-df-success text-df-bg px-3 py-1 rounded-full text-sm font-medium";
      AppConfig.refreshIcons?.();
    } else {
      throw new Error("API not healthy");
    }
  } catch (error) {
    elements.statusBadge.innerHTML = `
      <i data-lucide="wifi-off" class="df-icon-sm" aria-hidden="true"></i>
      <span>API Offline</span>
    `;
    elements.statusBadge.className =
      "df-status-badge bg-df-danger text-df-bg px-3 py-1 rounded-full text-sm font-medium";
    AppConfig.refreshIcons?.();
    console.error("API Health Check failed:", error);
    showError("API está offline. Inicie o servidor backend: python main.py");
  }
}
