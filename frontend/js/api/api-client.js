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
      elements.statusBadge.innerHTML = "🟢 API Online";
      elements.statusBadge.className =
        "bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium";
      console.log("API Health Check:", data);
    } else {
      throw new Error("API not healthy");
    }
  } catch (error) {
    elements.statusBadge.innerHTML = "🔴 API Offline";
    elements.statusBadge.className =
      "bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium";
    console.error("API Health Check failed:", error);
    showError("API está offline. Inicie o servidor backend: python main.py");
  }
}
