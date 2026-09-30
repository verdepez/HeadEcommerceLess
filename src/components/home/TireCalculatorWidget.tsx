import React, { useMemo, useState } from 'react';
import { compareTireMeasures } from '../../utils/formatters';
import { POPULAR_TIRE_MEASURES } from '../../data/offroad-catalog';

export interface TireCalculatorWidgetProps {
  initialOem?: string;
  initialUpgrade?: string;
  vehicleLabel?: string;
}

export default function TireCalculatorWidget({
  initialOem = '265/65R17',
  initialUpgrade = '285/70R17',
  vehicleLabel,
}: TireCalculatorWidgetProps): React.JSX.Element {
  const [oemInput, setOemInput] = useState<string>(initialOem);
  const [upgradeInput, setUpgradeInput] = useState<string>(initialUpgrade);

  const comparison = useMemo(
    () => compareTireMeasures(oemInput, upgradeInput),
    [oemInput, upgradeInput]
  );

  const maxRefInches = 38;
  const oemRadiusPx = comparison
    ? Math.min(82, Math.max(46, (comparison.oem.diameterInches / maxRefInches) * 82))
    : 64;
  const upgRadiusPx = comparison
    ? Math.min(82, Math.max(46, (comparison.upgrade.diameterInches / maxRefInches) * 82))
    : 70;

  const oemRimRadiusPx = comparison
    ? (comparison.oem.rimInches / maxRefInches) * 82
    : 34;
  const upgRimRadiusPx = comparison
    ? (comparison.upgrade.rimInches / maxRefInches) * 82
    : 34;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950/90 p-4 sm:p-6 text-zinc-100 shadow-2xl">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded bg-[#FFCC00]/15 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wider text-[#FFCC00]">
            Laboratorio Técnico DOBLETRACCIÓN
          </span>
          <h3 className="mt-1 text-lg sm:text-xl font-black uppercase tracking-tight text-white">
            Calculadora Visual de Neumáticos y Ganancia de Altura
          </h3>
        </div>
        {vehicleLabel && (
          <span className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs font-semibold text-zinc-300">
            Vehículo base: <strong className="text-[#FFCC00]">{vehicleLabel}</strong>
          </span>
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
            1. Medida Actual / Original (OEM)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={oemInput}
              onChange={(e) => setOemInput(e.target.value)}
              placeholder="Ej: 265/65R17"
              className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm font-mono font-bold text-white focus:border-[#FFCC00] focus:outline-none"
            />
            <select
              aria-label="Medidas OEM frecuentes"
              value={oemInput}
              onChange={(e) => setOemInput(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-2 text-xs font-semibold text-zinc-300 focus:border-[#FFCC00] focus:outline-none"
            >
              {POPULAR_TIRE_MEASURES.map((m) => (
                <option key={`oem-${m.measure}`} value={m.measure}>
                  {m.measure} ({m.approxInches})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="rounded-xl border border-[#FFCC00]/40 bg-zinc-900/90 p-3.5">
          <label className="block text-xs font-bold uppercase tracking-wider text-[#FFCC00]">
            2. Nueva Medida Off-Road (Upgrade)
          </label>
          <div className="mt-2 flex gap-2">
            <input
              type="text"
              value={upgradeInput}
              onChange={(e) => setUpgradeInput(e.target.value)}
              placeholder="Ej: 285/70R17 o 35x12.5R17"
              className="w-full rounded-lg border border-[#FFCC00]/60 bg-zinc-950 px-3 py-2 text-sm font-mono font-bold text-[#FFCC00] focus:border-[#FFCC00] focus:outline-none"
            />
            <select
              aria-label="Medidas Upgrade frecuentes"
              value={upgradeInput}
              onChange={(e) => setUpgradeInput(e.target.value)}
              className="rounded-lg border border-[#FFCC00]/60 bg-zinc-950 px-2.5 py-2 text-xs font-semibold text-[#FFCC00] focus:border-[#FFCC00] focus:outline-none"
            >
              {POPULAR_TIRE_MEASURES.map((m) => (
                <option key={`upg-${m.measure}`} value={m.measure}>
                  {m.measure} ({m.approxInches})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {!comparison ? (
        <p className="mt-4 rounded-lg bg-red-950/50 border border-red-800/60 p-3 text-xs text-red-300">
          Ingresa un formato válido métrico (ej. <code>285/70R17</code>) o en pulgadas (ej.{' '}
          <code>35x12.5R17</code>).
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12 items-center">
          <div className="lg:col-span-5 flex flex-col items-center justify-center rounded-xl border border-zinc-800/80 bg-zinc-900/40 p-4">
            <svg
              viewBox="0 0 220 200"
              className="h-44 w-full max-w-[240px]"
              role="img"
              aria-label={`Comparación visual entre ${comparison.oem.raw} y ${comparison.upgrade.raw}`}
            >
              <line x1="15" y1="182" x2="205" y2="182" stroke="#52525b" strokeWidth="2" />
              <circle
                cx="110"
                cy={182 - upgRadiusPx}
                r={upgRadiusPx}
                fill="rgba(255, 204, 0, 0.12)"
                stroke="#FFCC00"
                strokeWidth="3"
              />
              <circle
                cx="110"
                cy={182 - upgRadiusPx}
                r={upgRimRadiusPx}
                fill="none"
                stroke="#FFCC00"
                strokeWidth="1.5"
                strokeDasharray="3 2"
              />
              <circle
                cx="110"
                cy={182 - oemRadiusPx}
                r={oemRadiusPx}
                fill="none"
                stroke="#a1a1aa"
                strokeWidth="2"
                strokeDasharray="5 4"
              />
              <circle
                cx="110"
                cy={182 - oemRadiusPx}
                r={oemRimRadiusPx}
                fill="none"
                stroke="#71717a"
                strokeWidth="1"
              />
              <circle cx="110" cy={182 - upgRadiusPx} r="4" fill="#FFCC00" />
            </svg>

            <div className="mt-2 flex items-center gap-4 text-xs">
              <span className="inline-flex items-center gap-1.5 text-zinc-400">
                <span className="h-2.5 w-2.5 rounded-full border border-dashed border-zinc-400" />
                OEM: {comparison.oem.diameterInches}&quot; ({comparison.oem.diameterMm} mm)
              </span>
              <span className="inline-flex items-center gap-1.5 font-bold text-[#FFCC00]">
                <span className="h-2.5 w-2.5 rounded-full bg-[#FFCC00]" />
                Nuevo: {comparison.upgrade.diameterInches}&quot; ({comparison.upgrade.diameterMm} mm)
              </span>
            </div>
          </div>

          <div className="lg:col-span-7 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 block">
                  Diámetro Total
                </span>
                <span className="mt-1 block text-xl font-black text-white">
                  {comparison.upgrade.diameterInches}&quot;
                </span>
                <span
                  className={`text-xs font-bold ${
                    comparison.diameterDiffInches >= 0 ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {comparison.diameterDiffInches >= 0 ? '+' : ''}
                  {comparison.diameterDiffInches}&quot; ({comparison.diameterDiffMm >= 0 ? '+' : ''}
                  {comparison.diameterDiffMm} mm)
                </span>
              </div>

              <div className="rounded-xl border border-[#FFCC00]/40 bg-[#FFCC00]/10 p-3">
                <span className="text-[11px] uppercase tracking-wider text-[#FFCC00] font-bold block">
                  Ganancia Altura
                </span>
                <span className="mt-1 block text-xl font-black text-[#FFCC00]">
                  {comparison.groundClearanceGainCm >= 0 ? '+' : ''}
                  {comparison.groundClearanceGainCm} cm
                </span>
                <span className="text-[11px] text-zinc-300">Despeje real al suelo</span>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 block">
                  Ancho Pisada
                </span>
                <span className="mt-1 block text-xl font-black text-white">
                  {comparison.upgrade.widthMm} mm
                </span>
                <span className="text-xs font-semibold text-zinc-400">
                  {comparison.widthDiffMm >= 0 ? '+' : ''}
                  {comparison.widthDiffMm} mm ({comparison.upgrade.widthInches}&quot;)
                </span>
              </div>

              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3">
                <span className="text-[11px] uppercase tracking-wider text-zinc-400 block">
                  Velocímetro (100)
                </span>
                <span className="mt-1 block text-xl font-black text-white">
                  {comparison.realSpeedAt100Kmh} <small className="text-xs font-normal">km/h</small>
                </span>
                <span className="text-[11px] text-zinc-400">Velocidad real GPS</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/90 p-3.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span
                    className={`h-2.5 w-2.5 rounded-full ${
                      comparison.recommendedLift.level === 'OEM'
                        ? 'bg-emerald-400'
                        : comparison.recommendedLift.level === 'LEVELING_2'
                          ? 'bg-[#FFCC00]'
                          : 'bg-orange-500'
                    }`}
                  />
                  <span className="text-xs font-black uppercase tracking-wide text-white">
                    {comparison.recommendedLift.label}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">{comparison.recommendedLift.description}</p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0 w-full sm:w-auto">
                <a
                  href={`/neumaticos/medidas?medida=${encodeURIComponent(comparison.upgrade.raw)}`}
                  className="flex-1 sm:flex-initial text-center rounded-lg bg-[#FFCC00] px-3.5 py-2 text-xs font-black uppercase tracking-wider text-black hover:bg-[#ffd633] transition-colors"
                >
                  Buscar {comparison.upgrade.raw}
                </a>
                {comparison.recommendedLift.level !== 'OEM' && (
                  <a
                    href={comparison.recommendedLift.collectionUrl}
                    className="flex-1 sm:flex-initial text-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs font-bold text-white hover:border-[#FFCC00] transition-colors"
                  >
                    Ver Kits Levante →
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
