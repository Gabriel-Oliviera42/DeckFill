/**
 * Deck Fill - Configuration Constants
 * Centralized configuration for the application
 */

// Constante do verso padrão do Magic
const MTG_BACK_URL =
  "https://i.postimg.cc/8zG5xDLY/Magic-the-gathering-card-back.jpg";

// Configuração da API
const IS_LOCAL_FRONTEND =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const LOCAL_API_HOST =
  window.location.hostname === "127.0.0.1" ? "127.0.0.1" : "localhost";

const API_BASE = window.DECKFILL_API_BASE || localStorage.getItem("deckfill_api_base") || (IS_LOCAL_FRONTEND
  ? `http://${LOCAL_API_HOST}:8000`
  : "https://deck-fill-api.onrender.com");

const DISPLAY_IMAGE_PROXY_HOSTS = new Set([
  "cards.lorcast.io",
  "images.scrydex.com",
  "optcgapi.com",
  "en.onepiece-cardgame.com",
  "asia-en.onepiece-cardgame.com",
  "www.onepiece-cardgame.com",
  "onepiece-cardgame.com",
  "storage.googleapis.com",
  "dhhim4ltzu1pj.cloudfront.net",
  "d2wlb52bya4y8z.cloudfront.net",
  "legendstory-production-s3-public.s3.amazonaws.com",
  "fabtcg.com",
  "www.fabtcg.com",
  "drive.google.com",
  "drive.usercontent.google.com",
  "docs.google.com",
  "lh3.googleusercontent.com",
]);
const IMAGE_UNAVAILABLE_DATA_URL =
  "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjI4MCIgdmlld0JveD0iMCAwIDIwMCAyODAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+CjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iMjgwIiBmaWxsPSIjMTAxMjBGIi8+Cjx0ZXh0IHg9IjEwMCIgeT0iMTMyIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjRDhDRkMwIiBmb250LXNpemU9IjE0IiBmb250LWZhbWlseT0iQXJpYWwiPkltYWdlbTwvdGV4dD4KPHRleHQgeD0iMTAwIiB5PSIxNTIiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiNBOEIzQzAiIGZvbnQtc2l6ZT0iMTIiIGZvbnQtZmFtaWx5PSJBcmlhbCI+aW5kaXNwb25pdmVsPC90ZXh0Pgo8L3N2Zz4K";

function isDataOrBlobImage(imageUrl) {
  return (
    typeof imageUrl === "string" &&
    (imageUrl.startsWith("data:") || imageUrl.startsWith("blob:"))
  );
}

function isAlreadyProxiedImage(imageUrl) {
  return (
    typeof imageUrl === "string" &&
    imageUrl.includes("/image-proxy?url=")
  );
}

function shouldProxyDisplayImage(imageUrl) {
  if (!imageUrl || isDataOrBlobImage(imageUrl) || isAlreadyProxiedImage(imageUrl)) {
    return false;
  }

  try {
    const parsedUrl = new URL(imageUrl, window.location.href);
    return (
      DISPLAY_IMAGE_PROXY_HOSTS.has(parsedUrl.hostname) ||
      parsedUrl.hostname.endsWith(".googleusercontent.com")
    );
  } catch {
    return false;
  }
}

function getDisplayImageUrl(imageUrl) {
  if (!shouldProxyDisplayImage(imageUrl)) {
    return imageUrl;
  }

  return `${API_BASE}/image-proxy?url=${encodeURIComponent(imageUrl)}`;
}

function handleImageLoadError(imageElement) {
  if (!imageElement) {
    return;
  }

  const originalSrc = imageElement.dataset?.originalSrc;

  if (
    !imageElement.dataset.triedOriginal &&
    originalSrc &&
    imageElement.src !== originalSrc
  ) {
    imageElement.dataset.triedOriginal = "true";
    imageElement.src = originalSrc;
    return;
  }

  imageElement.onerror = null;
  imageElement.src = IMAGE_UNAVAILABLE_DATA_URL;
}

function refreshIcons() {
  if (!window.lucide || typeof window.lucide.createIcons !== "function") {
    return;
  }

  try {
    window.lucide.createIcons({
      attrs: {
        "stroke-width": 2.1,
        "aria-hidden": "true",
      },
    });
  } catch (error) {
    console.warn("Falha ao renderizar icones Lucide:", error);
  }
}

// Decklist de exemplo para demonstração e testes
const SAMPLE_DECKLIST = `1 Black Lotus (YDMU) 35
1 Lukamina, Moon Druid (HBG) 17
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
  getDisplayImageUrl,
  handleImageLoadError,
  refreshIcons,
  IMAGE_UNAVAILABLE_DATA_URL,
};
