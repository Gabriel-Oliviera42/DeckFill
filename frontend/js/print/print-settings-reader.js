/**
 * Deck Fill - Print Settings Reader
 * Lê as configurações brutas da interface.
 *
 * Este arquivo NÃO resolve conflitos.
 * Ele apenas lê o estado atual dos campos da tela.
 */

function readRawPrintSettings() {
  return {
    pageSize: elements.pageSize?.value || "a4",
    gapSpacing: Number.parseFloat(elements.gapSpacing?.value || "0"),
    scale: elements.scale?.value || "normal",

    cropMarks: Boolean(elements.cropMarks?.checked),
    blackCorners: Boolean(elements.blackCorners?.checked),
    bleed: Boolean(elements.bleed?.checked),
    guideColor: elements.guideColor?.value || "#f97316",

    skipBasicLands: Boolean(elements.skipBasicLands?.checked),

    printDoubleFaced: Boolean(elements.printDoubleFaced?.checked),

    // Campos futuros. Ainda não existem todos na UI, mas já deixamos o modelo preparado.
    outputMode: elements.outputModeProfessional?.checked
    ? "professional"
    : "manual",
    edgeMode: elements.edgeMode?.value || null,
    backMode: elements.backMode?.value || null,
    includeInstructions: Boolean(elements.includeInstructions?.checked),
    includeTokens: Boolean(elements.includeTokens?.checked),
  };
}

window.PrintSettingsReader = {
  readRawPrintSettings,
};