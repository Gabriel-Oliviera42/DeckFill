/**
 * Deck Fill - Print Settings Resolver
 * Transforma configurações brutas da UI em uma configuração previsível.
 *
 * Aqui ficam as regras de conflito:
 * - Sangria, borda preta e fundo seguro não devem brigar entre si.
 * - Dupla face vira um modo de verso claro.
 * - Escala vira multiplicador numérico.
 * - O PDF passa a trabalhar com modos, não checkboxes soltos.
 */

const PRINT_SCALE_MULTIPLIERS = {
  small: 0.75,
  normal: 1,
  large: 1.25,
  giant: 1.5,
};

function resolveScale(scale) {
  return PRINT_SCALE_MULTIPLIERS[scale] || PRINT_SCALE_MULTIPLIERS.normal;
}

function resolveEdgeMode(rawSettings) {
  // Quando criarmos um select próprio no HTML, ele terá prioridade.
  if (rawSettings.edgeMode) {
    return rawSettings.edgeMode;
  }

  // Compatibilidade com a UI atual.
  if (rawSettings.bleed) {
    return "bleed";
  }

  if (rawSettings.blackCorners) {
    return "black-border";
  }

  return "none";
}

function resolveGuideMode(rawSettings) {
  if (rawSettings.cropMarks) {
    return "crop-lines";
  }

  return "none";
}

function resolveBackMode(rawSettings) {
  // Quando criarmos um select próprio no HTML, ele terá prioridade.
  if (rawSettings.backMode) {
    return rawSettings.backMode;
  }

  // Compatibilidade com a UI atual.
  if (rawSettings.printDoubleFaced) {
    return "generic";
  }

  return "none";
}

function resolveOutputMode(rawSettings) {
  const allowedModes = ["manual", "professional"];
  return allowedModes.includes(rawSettings.outputMode)
    ? rawSettings.outputMode
    : "manual";
}

function resolvePrintSettings(rawSettings) {
  const scaleMultiplier = resolveScale(rawSettings.scale);
  const gapMm = Number.isFinite(rawSettings.gapSpacing)
    ? rawSettings.gapSpacing
    : 0;

  return {
    outputMode: resolveOutputMode(rawSettings),
    partner: resolveOutputMode(rawSettings) === "professional" ? "marra-prints" : null,
    cutMode: resolveOutputMode(rawSettings) === "professional" ? "silhouette" : "basic",

    paper: {
      size: rawSettings.pageSize || "a4",
      orientation: "auto",
    },

    card: {
      widthMm: 63,
      heightMm: 88,
      scaleName: rawSettings.scale || "normal",
      scaleMultiplier,
      finalWidthMm: 63 * scaleMultiplier,
      finalHeightMm: 88 * scaleMultiplier,
    },

    spacing: {
      gapMm,
    },

    guides: {
      mode: resolveGuideMode(rawSettings),
      color: rawSettings.guideColor || "#f97316",
    },

    edges: {
      mode: resolveEdgeMode(rawSettings),
    },

    back: {
      mode: resolveBackMode(rawSettings),
    },

    content: {
      skipBasicLands: Boolean(rawSettings.skipBasicLands),
      includeInstructions: Boolean(rawSettings.includeInstructions),
      includeTokens: Boolean(rawSettings.includeTokens),
    },

    compatibility: {
      cropMarks: Boolean(rawSettings.cropMarks),
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