/**
 * Deck Fill - Utility Helpers Module
 * Image processing and PDF generation utilities
 */

/**
 * Processa imagem com Sangria (Bleed) usando técnica de Edge Smearing
 * Estende apenas os pixels das bordas mantendo o centro intacto
 */
async function processImageWithBleed(blob, bleedSizeInMm) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(blob);

    img.onload = () => {
      try {
        // Calcular pixels de sangria proporcionais ao tamanho real da carta (63x88mm)
        const bleedPxX = Math.floor(img.width * (bleedSizeInMm / 63));
        const bleedPxY = Math.floor(img.height * (bleedSizeInMm / 88));

        // Criar canvas com dimensões totais incluindo sangria
        const canvas = document.createElement("canvas");
        canvas.width = img.width + bleedPxX * 2;
        canvas.height = img.height + bleedPxY * 2;
        const ctx = canvas.getContext("2d");

        // Desenhar imagem original perfeitamente no centro
        ctx.drawImage(img, bleedPxX, bleedPxY, img.width, img.height);

        // Esticar as 4 bordas copiando fatias de 1 pixel da imagem original
        // Topo
        ctx.drawImage(
          img,
          0,
          0,
          img.width,
          1,
          bleedPxX,
          0,
          img.width,
          bleedPxY,
        );
        // Base
        ctx.drawImage(
          img,
          0,
          img.height - 1,
          img.width,
          1,
          bleedPxX,
          bleedPxY + img.height,
          img.width,
          bleedPxY,
        );
        // Esquerda
        ctx.drawImage(
          img,
          0,
          0,
          1,
          img.height,
          0,
          bleedPxY,
          bleedPxX,
          img.height,
        );
        // Direita
        ctx.drawImage(
          img,
          img.width - 1,
          0,
          1,
          img.height,
          bleedPxX + img.width,
          bleedPxY,
          bleedPxX,
          img.height,
        );

        // Esticar os 4 cantos pegando o pixel 1x1 das extremidades
        // Canto Superior Esquerdo
        ctx.drawImage(img, 0, 0, 1, 1, 0, 0, bleedPxX, bleedPxY);
        // Canto Superior Direito
        ctx.drawImage(
          img,
          img.width - 1,
          0,
          1,
          1,
          bleedPxX + img.width,
          0,
          bleedPxX,
          bleedPxY,
        );
        // Canto Inferior Esquerdo
        ctx.drawImage(
          img,
          0,
          img.height - 1,
          1,
          1,
          0,
          bleedPxY + img.height,
          bleedPxX,
          bleedPxY,
        );
        // Canto Inferior Direito
        ctx.drawImage(
          img,
          img.width - 1,
          img.height - 1,
          1,
          1,
          bleedPxX + img.width,
          bleedPxY + img.height,
          bleedPxX,
          bleedPxY,
        );

        // Limpar URL e retornar base64 do canvas
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", 0.95));
      } catch (error) {
        URL.revokeObjectURL(url);
        reject(error);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load image"));
    };

    img.src = url;
  });
}
