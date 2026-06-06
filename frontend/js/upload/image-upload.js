/**
 * Deck Fill - Image Upload Module
 * Handles custom image uploads for cards.
 */

function handleCustomImageUpload(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    console.error("Arquivo nao e uma imagem:", file.type);
    showError("Por favor, selecione um arquivo de imagem valido.");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    console.error("Arquivo muito grande:", file.size);
    showError("A imagem deve ter no maximo 10MB.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const imageUrl = event.target.result;

    if (AppState.currentModalCardIndex !== null) {
      CardImageResolver.setCustomFrontImage(
        AppState.currentModalCardIndex,
        imageUrl,
      );
      showUploadPreview(imageUrl);
      updateCardElement(AppState.currentModalCardIndex);
    }
  };
  reader.onerror = function (error) {
    console.error("Erro ao ler arquivo:", error);
    showError("Erro ao ler o arquivo de imagem.");
  };
  reader.readAsDataURL(file);
}

function handleCustomImageUploadBack(event) {
  const file = event.target.files[0];

  if (!file) {
    return;
  }

  if (!file.type.startsWith("image/")) {
    showError("Por favor, selecione um arquivo de imagem valido.");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (event) {
    const imageUrl = event.target.result;

    if (AppState.currentModalCardIndex !== null) {
      CardImageResolver.setCustomBackImage(
        AppState.currentModalCardIndex,
        imageUrl,
      );

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

      updateCardElement(AppState.currentModalCardIndex);
    }
  };
  reader.onerror = function (error) {
    console.error("Erro ao ler arquivo:", error);
    showError("Erro ao ler o arquivo de imagem.");
  };
  reader.readAsDataURL(file);
}

function clearCustomImageBack() {
  if (AppState.currentModalCardIndex === null) {
    return;
  }

  CardImageResolver.clearCustomBackImageForCard(AppState.currentModalCardIndex);

  const previewContainer = document.getElementById("upload-preview-back");
  const imgElement = document.getElementById("upload-preview-img-back");
  const fileInput = document.getElementById("custom-image-upload-back");

  if (previewContainer) previewContainer.classList.add("hidden");
  if (imgElement) imgElement.src = "";
  if (fileInput) fileInput.value = "";
}

function showUploadPreview(imageUrl) {
  elements.uploadPreview.classList.remove("hidden");
  elements.uploadPreviewImg.src = imageUrl;
}

function resetUploadSection() {
  elements.uploadPreview.classList.add("hidden");
  elements.uploadPreviewImg.src = "";
  elements.customImageUpload.value = "";
  elements.uploadPreviewBack.classList.add("hidden");
  elements.uploadPreviewImgBack.src = "";
  elements.customImageUploadBack.value = "";
}

function clearCustomImage() {
  if (AppState.currentModalCardIndex === null) {
    return;
  }

  CardImageResolver.clearCustomFrontImage(AppState.currentModalCardIndex);
  restoreOriginalImage(AppState.currentModalCardIndex);
}
