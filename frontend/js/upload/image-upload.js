/**
 * Deck Fill - Image Upload Module
 * Handles custom image uploads for cards
 */

/**
 * Lida com o upload de imagem personalizada (frente)
 */
function handleCustomImageUpload(event) {
  console.log("🔍 handleCustomImageUpload disparado!");
  console.log(
    "🔍 AppState.currentModalCardIndex:",
    AppState.currentModalCardIndex,
  );

  const file = event.target.files[0];
  console.log("🔍 Arquivo selecionado:", file);

  if (!file) {
    console.log("⚠️ Nenhum arquivo selecionado");
    return;
  }

  // Validar se é uma imagem
  if (!file.type.startsWith("image/")) {
    console.error("❌ Arquivo não é uma imagem:", file.type);
    showError("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  // Validar tamanho (máximo 10MB)
  if (file.size > 10 * 1024 * 1024) {
    console.error("❌ Arquivo muito grande:", file.size);
    showError("A imagem deve ter no máximo 10MB.");
    return;
  }

  console.log("✅ Arquivo validado, iniciando leitura...");

  // Ler e converter a imagem
  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;
    console.log("✅ Imagem carregada, tamanho:", imageUrl.length);

    // Armazenar a imagem personalizada
    if (AppState.currentModalCardIndex !== null) {
      // Obter imagens existentes ou criar novo objeto
      const existingImages =
        AppState.customImages.get(AppState.currentModalCardIndex) || {};
      AppState.customImages.set(AppState.currentModalCardIndex, {
        ...existingImages,
        front: imageUrl,
      });
      console.log(
        "✅ Imagem da frente armazenada no Map AppState.customImages",
      );

      // Atualizar a carta no array principal
      AppState.currentCards[AppState.currentModalCardIndex] = {
        ...AppState.currentCards[AppState.currentModalCardIndex],
        image_uri_normal: imageUrl,
        image_uri_png: imageUrl,
      };

      // Mostrar preview
      showUploadPreview(imageUrl);

      // Atualizar a imagem da carta no grid principal
      updateCardElement(AppState.currentModalCardIndex);
    }
  };
  reader.onerror = function (e) {
    console.error("❌ Erro ao ler arquivo:", e);
    showError("Erro ao ler o arquivo de imagem.");
  };
  reader.readAsDataURL(file);
}

function handleCustomImageUploadBack(event) {
  const file = event.target.files[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    console.error("Por favor, selecione um arquivo de imagem válido.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const imageUrl = e.target.result;

    if (AppState.currentModalCardIndex !== null) {
      // Pega o estado atual (se houver imagem da frente já salva)
      const existingImages = AppState.customImages.get(
        AppState.currentModalCardIndex,
      ) || {
        front: null,
        back: null,
      };

      // Salva a nova imagem do verso
      AppState.customImages.set(AppState.currentModalCardIndex, {
        ...existingImages,
        back: imageUrl,
      });

      // Atualizar a carta no array principal
      AppState.currentCards[AppState.currentModalCardIndex] = {
        ...AppState.currentCards[AppState.currentModalCardIndex],
        image_uri_back_normal: imageUrl,
        image_uri_back_png: imageUrl,
      };

      // Mostra o preview visual
      if (typeof showUploadPreviewBack === "function") {
        showUploadPreviewBack(imageUrl);
      } else {
        const previewContainer = document.getElementById("upload-preview-back");
        const imgElement = document.getElementById("upload-preview-img-back");
        if (previewContainer && imgElement) {
          imgElement.src = imageUrl;
          previewContainer.classList.remove("hidden");
        }
      }

      console.log(
        `📸 Imagem de verso personalizada carregada para carta ${AppState.currentModalCardIndex}`,
      );

      // Atualizar a carta no grid principal
      updateCardElement(AppState.currentModalCardIndex);
    }
  };
  reader.readAsDataURL(file);
}

function clearCustomImageBack() {
  if (AppState.currentModalCardIndex !== null) {
    const existingImages = AppState.customImages.get(
      AppState.currentModalCardIndex,
    );
    if (existingImages) {
      AppState.customImages.set(AppState.currentModalCardIndex, {
        ...existingImages,
        back: null,
      });
    }

    const previewContainer = document.getElementById("upload-preview-back");
    const imgElement = document.getElementById("upload-preview-img-back");
    const fileInput = document.getElementById("custom-image-upload-back");

    if (previewContainer) previewContainer.classList.add("hidden");
    if (imgElement) imgElement.src = "";
    if (fileInput) fileInput.value = "";

    console.log(
      `🗑️ Imagem de verso removida para carta ${AppState.currentModalCardIndex}`,
    );
  }
}

/**
 * Mostra o preview da imagem carregada
 */
function showUploadPreview(imageUrl) {
  elements.uploadPreview.classList.remove("hidden");
  elements.uploadPreviewImg.src = imageUrl;
  console.log("✅ Preview atualizado");
}

/**
 * Reseta a seção de upload ao abrir o modal
 */
function resetUploadSection() {
  // Reset da frente
  elements.uploadPreview.classList.add("hidden");
  elements.uploadPreviewImg.src = "";
  elements.customImageUpload.value = "";

  // Reset do verso
  elements.uploadPreviewBack.classList.add("hidden");
  elements.uploadPreviewImgBack.src = "";
  elements.customImageUploadBack.value = "";

  console.log("✅ Seção de upload resetada");
}

/**
 * Limpa a imagem personalizada
 */
function clearCustomImage() {
  if (AppState.currentModalCardIndex !== null) {
    const existingImages =
      AppState.customImages.get(AppState.currentModalCardIndex) || {};
    AppState.customImages.set(AppState.currentModalCardIndex, {
      ...existingImages,
      front: null,
    });

    // Restaurar imagem original
    restoreOriginalImage(AppState.currentModalCardIndex);

    console.log(
      `🗑️ Imagem personalizada removida da carta ${AppState.currentModalCardIndex}`,
    );
  }
}
