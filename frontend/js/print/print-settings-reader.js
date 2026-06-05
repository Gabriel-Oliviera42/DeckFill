/**
 * Deck Fill - Print Settings Reader
 * Le as configuracoes brutas da interface.
 *
 * Este arquivo nao resolve conflitos; ele apenas captura o estado atual.
 */

function readRawPrintSettings() {
  const outputMode = elements.outputModeProfessional?.checked
    ? "professional"
    : "normal";
  const isProfessional = outputMode === "professional";
  const bleedControl = isProfessional
    ? elements.bleedProfessional
    : elements.bleed;
  const blackBorderControl = isProfessional
    ? elements.blackCornersProfessional
    : elements.blackCorners;
  const gapControl = isProfessional
    ? elements.gapSpacingProfessional
    : elements.gapSpacing;

  return {
    pageSize: elements.pageSize?.value || "a4",
    gapSpacing: Number.parseFloat(gapControl?.value || "2"),
    scale: elements.scale?.value || "normal",

    cropMarks: !isProfessional && Boolean(elements.cropMarks?.checked),
    guideType: elements.guideType?.value || "external-corners",
    guideColor: elements.guideColor?.value || "#E7B650",

    blackCorners: Boolean(blackBorderControl?.checked),
    bleed: Boolean(bleedControl?.checked),

    skipBasicLands: Boolean(elements.skipBasicLands?.checked),
    printDoubleFaced: Boolean(elements.printDoubleFaced?.checked),
    printRelevantFaces: elements.printRelevantFaces?.checked !== false,
    includeRelatedTokens: Boolean(elements.includeRelatedTokens?.checked),
    preferredLanguage: elements.preferredLanguage?.value || "en",
    autoCompleteCategory: elements.autoCompleteCategory?.value || "off",

    outputMode,
    edgeMode: elements.edgeMode?.value || null,
    backMode: elements.backMode?.value || null,
    includeInstructions: Boolean(elements.includeInstructions?.checked),
    includeTokens: Boolean(elements.includeRelatedTokens?.checked),
  };
}

window.PrintSettingsReader = {
  readRawPrintSettings,
};
