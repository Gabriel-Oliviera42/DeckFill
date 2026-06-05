/**
 * Deck Fill - Print Settings Resolver
 * Transforma configuracoes brutas da UI em uma configuracao previsivel.
 */

const PRINT_SCALE_MULTIPLIERS = {
  small: 0.75,
  normal: 1,
  large: 1.25,
  giant: 1.5,
};

function clampGapMm(value) {
  const numericValue = Number.parseFloat(value);

  if (!Number.isFinite(numericValue)) {
    return 2;
  }

  return Math.min(5, Math.max(1, numericValue));
}

function resolveScale(scale) {
  return PRINT_SCALE_MULTIPLIERS[scale] || PRINT_SCALE_MULTIPLIERS.normal;
}

function resolveOutputMode(rawSettings) {
  return rawSettings.outputMode === "professional" ? "professional" : "normal";
}

function resolveEdgeMode(rawSettings) {
  if (rawSettings.bleed) {
    return "bleed";
  }

  if (rawSettings.blackCorners) {
    return "black-border";
  }

  return "none";
}

function resolveGuideSettings(rawSettings, outputMode) {
  if (outputMode === "professional") {
    return {
      enabled: false,
      mode: "professional-registration",
      color: "#000000",
      thicknessPx: 1,
    };
  }

  return {
    enabled: Boolean(rawSettings.cropMarks),
    mode: rawSettings.guideType || "external-corners",
    color: rawSettings.guideColor || "#E7B650",
    thicknessPx: 1,
  };
}

function resolveBackMode(rawSettings) {
  if (rawSettings.printDoubleFaced) {
    return "generic";
  }

  return "none";
}

function resolveAutoCompleteCategory(rawSettings, outputMode) {
  const selected = rawSettings.autoCompleteCategory || "off";

  if (selected && selected !== "off") {
    return selected;
  }

  return outputMode === "professional" ? "iconic" : "off";
}

function resolvePrintSettings(rawSettings) {
  const outputMode = resolveOutputMode(rawSettings);
  const scaleMultiplier = outputMode === "professional"
    ? 1
    : resolveScale(rawSettings.scale);
  const gapMm = clampGapMm(rawSettings.gapSpacing);
  const selectedGame = AppState.getSelectedGame?.() || "magic";
  const gameConfig = GameConfigs.getGameConfig(selectedGame);
  const cardWidthMm = gameConfig.cardWidthMm || 63;
  const cardHeightMm = gameConfig.cardHeightMm || 88;
  const languageConfig = gameConfig.languages || {};
  const autoCompleteCategory = resolveAutoCompleteCategory(
    rawSettings,
    outputMode,
  );

  return {
    outputMode,
    partner: outputMode === "professional" ? "marra-prints" : null,
    cutMode: outputMode === "professional" ? "silhouette" : "basic",

    paper: {
      size: outputMode === "professional" ? "a4" : rawSettings.pageSize || "a4",
      orientation: "auto",
    },

    card: {
      widthMm: cardWidthMm,
      heightMm: cardHeightMm,
      scaleName: outputMode === "professional" ? "normal" : rawSettings.scale || "normal",
      scaleMultiplier,
      finalWidthMm: cardWidthMm * scaleMultiplier,
      finalHeightMm: cardHeightMm * scaleMultiplier,
    },

    spacing: {
      gapMm,
    },

    guides: resolveGuideSettings(rawSettings, outputMode),

    edges: {
      mode: resolveEdgeMode(rawSettings),
      bleed: Boolean(rawSettings.bleed),
      blackBorder: Boolean(rawSettings.blackCorners),
    },

    back: {
      mode: resolveBackMode(rawSettings),
    },

    content: {
      skipBasicLands: selectedGame === "magic" && Boolean(rawSettings.skipBasicLands),
      includeInstructions: Boolean(rawSettings.includeInstructions),
      includeRelatedTokens: Boolean(
        gameConfig.supportsRelatedTokens && rawSettings.includeRelatedTokens,
      ),
      printRelevantFaces: rawSettings.printRelevantFaces !== false,
      autoCompleteCategory,
      preferredLanguage: languageConfig.supported
        ? rawSettings.preferredLanguage || languageConfig.default || "en"
        : "en",
    },

    compatibility: {
      cropMarks: outputMode === "normal" && Boolean(rawSettings.cropMarks),
      blackCorners: Boolean(rawSettings.blackCorners),
      bleed: Boolean(rawSettings.bleed),
      printDoubleFaced: Boolean(rawSettings.printDoubleFaced),
    },
  };
}

function getResolvedPrintSettings() {
  const rawSettings = PrintSettingsReader.readRawPrintSettings();
  return resolvePrintSettings(rawSettings);
}

window.PrintSettingsResolver = {
  resolvePrintSettings,
  getResolvedPrintSettings,
};
