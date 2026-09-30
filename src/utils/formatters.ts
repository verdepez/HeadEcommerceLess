/**
 * Utilidades de formateo monetario y cálculo geométrico de neumáticos 4x4.
 */

export function formatPrice(amount: number, currency = 'CLP'): string {
  const isZeroDecimal = currency.toUpperCase() === 'CLP';
  return new Intl.NumberFormat(isZeroDecimal ? 'es-CL' : 'es-ES', {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: isZeroDecimal ? 0 : 2,
    maximumFractionDigits: isZeroDecimal ? 0 : 2,
  }).format(amount);
}

export interface TireDimensions {
  raw: string;
  isFlotation: boolean;
  widthMm: number;
  widthInches: number;
  aspectRatio: number;
  rimInches: number;
  sidewallMm: number;
  sidewallInches: number;
  diameterMm: number;
  diameterInches: number;
  circumferenceMm: number;
  revsPerKm: number;
}

/**
 * Parsea tanto medidas métricas (ej. "285/70R17") como imperiales de flotación (ej. "35x12.5R17")
 * y calcula con precisión matemática el diámetro total, perfil lateral y circunferencia.
 */
export function parseTireMeasure(measure: string): TireDimensions | null {
  const clean = measure.trim().toUpperCase().replace(/\s+/g, '');

  // Caso 1: Medida Métrica (ej. 265/70R17, 285/75R16, 315/70R17)
  const metricMatch = /^(\d{3})[/\-](\d{2})R?(\d{2})$/.exec(clean);
  if (metricMatch) {
    const widthMm = Number(metricMatch[1]);
    const aspectRatio = Number(metricMatch[2]);
    const rimInches = Number(metricMatch[3]);

    const sidewallMm = widthMm * (aspectRatio / 100);
    const rimMm = rimInches * 25.4;
    const diameterMm = rimMm + sidewallMm * 2;
    const diameterInches = diameterMm / 25.4;
    const widthInches = widthMm / 25.4;
    const sidewallInches = sidewallMm / 25.4;
    const circumferenceMm = diameterMm * Math.PI;
    const revsPerKm = 1_000_000 / circumferenceMm;

    return {
      raw: `${widthMm}/${aspectRatio}R${rimInches}`,
      isFlotation: false,
      widthMm: Math.round(widthMm),
      widthInches: Number(widthInches.toFixed(1)),
      aspectRatio,
      rimInches,
      sidewallMm: Math.round(sidewallMm),
      sidewallInches: Number(sidewallInches.toFixed(1)),
      diameterMm: Math.round(diameterMm),
      diameterInches: Number(diameterInches.toFixed(1)),
      circumferenceMm: Math.round(circumferenceMm),
      revsPerKm: Math.round(revsPerKm),
    };
  }

  // Caso 2: Medida Imperial Flotación Off-Road (ej. 35X12.5R17, 37X12.5R20, 33X12.5R15)
  const flotationMatch = /^(\d{2}(?:\.\d+)?)[X*](\d{2}(?:\.\d+)?)R?(\d{2})$/.exec(clean);
  if (flotationMatch) {
    const diameterInches = Number(flotationMatch[1]);
    const widthInches = Number(flotationMatch[2]);
    const rimInches = Number(flotationMatch[3]);

    const diameterMm = diameterInches * 25.4;
    const widthMm = widthInches * 25.4;
    const sidewallInches = (diameterInches - rimInches) / 2;
    const sidewallMm = sidewallInches * 25.4;
    const aspectRatio = Math.round((sidewallMm / widthMm) * 100);
    const circumferenceMm = diameterMm * Math.PI;
    const revsPerKm = 1_000_000 / circumferenceMm;

    return {
      raw: `${diameterInches}x${widthInches}R${rimInches}`,
      isFlotation: true,
      widthMm: Math.round(widthMm),
      widthInches: Number(widthInches.toFixed(1)),
      aspectRatio,
      rimInches,
      sidewallMm: Math.round(sidewallMm),
      sidewallInches: Number(sidewallInches.toFixed(1)),
      diameterMm: Math.round(diameterMm),
      diameterInches: Number(diameterInches.toFixed(1)),
      circumferenceMm: Math.round(circumferenceMm),
      revsPerKm: Math.round(revsPerKm),
    };
  }

  return null;
}

export interface TireComparisonResult {
  oem: TireDimensions;
  upgrade: TireDimensions;
  diameterDiffMm: number;
  diameterDiffInches: number;
  diameterDiffPercent: number;
  /** Ganancia real de despeje del suelo (radio = mitad del diámetro) en centímetros */
  groundClearanceGainCm: number;
  widthDiffMm: number;
  sidewallDiffMm: number;
  /** Velocidad real en km/h cuando el velocímetro marca 100 km/h */
  realSpeedAt100Kmh: number;
  recommendedLift: {
    level: 'OEM' | 'LEVELING_2' | 'LIFT_3_PLUS';
    label: string;
    collectionUrl: string;
    description: string;
  };
}

/**
 * Compara la medida actual (OEM) contra la nueva medida Off-Road y determina
 * ganancia de despeje en cm, error de velocímetro y nivel de levante requerido.
 */
export function compareTireMeasures(
  oemRaw: string,
  upgradeRaw: string
): TireComparisonResult | null {
  const oem = parseTireMeasure(oemRaw);
  const upgrade = parseTireMeasure(upgradeRaw);
  if (!oem || !upgrade) return null;

  const diameterDiffMm = upgrade.diameterMm - oem.diameterMm;
  const diameterDiffInches = Number((upgrade.diameterInches - oem.diameterInches).toFixed(1));
  const diameterDiffPercent = Number(((diameterDiffMm / oem.diameterMm) * 100).toFixed(1));

  const groundClearanceGainCm = Number((diameterDiffMm / 20).toFixed(2));
  const widthDiffMm = upgrade.widthMm - oem.widthMm;
  const sidewallDiffMm = upgrade.sidewallMm - oem.sidewallMm;
  const realSpeedAt100Kmh = Number(((upgrade.diameterMm / oem.diameterMm) * 100).toFixed(1));

  let recommendedLift: TireComparisonResult['recommendedLift'];
  if (diameterDiffInches <= 1.0 && widthDiffMm <= 15) {
    recommendedLift = {
      level: 'OEM',
      label: 'Calce Directo OEM (Sin Levante)',
      collectionUrl: '/collections/neumaticos',
      description: 'Instala directamente en suspensión original sin roce en guardafangos.',
    };
  } else if (diameterDiffInches <= 2.6 && upgrade.diameterInches <= 33.5) {
    recommendedLift = {
      level: 'LEVELING_2',
      label: 'Requiere Leveling o Kit 0 a 2"',
      collectionUrl: '/collections/kit-de-suspension/0-2',
      description:
        'Ganancia ideal Off-Road. Se recomienda kit de nivelación o suspensión de 2" para despejar el giro.',
    };
  } else {
    recommendedLift = {
      level: 'LIFT_3_PLUS',
      label: 'Requiere Kit de Levante 2.5" a 4"',
      collectionUrl: '/collections/kit-de-suspension/2.5-a-4',
      description:
        'Configuración extrema (35"+). Requiere suspensión de alto recorrido y bandeja superior.',
    };
  }

  return {
    oem,
    upgrade,
    diameterDiffMm,
    diameterDiffInches,
    diameterDiffPercent,
    groundClearanceGainCm,
    widthDiffMm,
    sidewallDiffMm,
    realSpeedAt100Kmh,
    recommendedLift,
  };
}

