import React, { useEffect, useMemo, useState } from 'react';
import {
  POPULAR_TIRE_MEASURES,
  VEHICLE_DATABASE,
  WHEEL_BOLT_PATTERNS,
  type VehicleFitmentSpec,
} from '../../data/offroad-catalog';
import TireCalculatorWidget from './TireCalculatorWidget';

export type SearchTabMode = 'vehicle' | 'tire' | 'wheel';

const GARAGE_STORAGE_KEY = 'dobletraccion_garage_v1';

export default function OffroadSearchHub({
  initialTab = 'vehicle',
}: {
  initialTab?: SearchTabMode;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SearchTabMode>(initialTab);
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [garageVehicles, setGarageVehicles] = useState<VehicleFitmentSpec[]>([]);

  const [selectedTireType, setSelectedTireType] = useState<'ALL' | 'AT' | 'MT' | 'RT'>('ALL');
  const [selectedTireBrand, setSelectedTireBrand] = useState<string>('');
  const [showCalculator, setShowCalculator] = useState<boolean>(true);
  const [calcOem, setCalcOem] = useState<string>('265/65R17');
  const [calcUpgrade, setCalcUpgrade] = useState<string>('285/70R17');

  const [selectedBoltSlug, setSelectedBoltSlug] = useState<string>('6x139');
  const [selectedWheelBrand, setSelectedWheelBrand] = useState<string>('');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(GARAGE_STORAGE_KEY);
      if (saved) {
        const parsedIds = JSON.parse(saved) as string[];
        const found = VEHICLE_DATABASE.filter((v) => parsedIds.includes(v.id));
        setGarageVehicles(found);
        if (found[0]) {
          setSelectedBrand(found[0].brand);
          setSelectedVehicleId(found[0].id);
          setSelectedYear(found[0].years[found[0].years.length - 1] || '');
          setCalcOem(found[0].oemTire);
          setCalcUpgrade(found[0].maxTireWith2InchLift);
          setSelectedBoltSlug(found[0].boltPatternSlug);
          updateHeaderGarageBadge(found[0]);
        }
      }
    } catch {
      // Ignorar errores de localStorage
    }
  }, []);

  const updateHeaderGarageBadge = (vehicle: VehicleFitmentSpec | null) => {
    const badgeText = document.getElementById('header-garage-label');
    if (badgeText) {
      badgeText.textContent = vehicle
        ? `${vehicle.brand} ${vehicle.model}`
        : 'Mi Garage (Elegir 4x4)';
    }
  };

  const brands = useMemo(
    () => Array.from(new Set(VEHICLE_DATABASE.map((v) => v.brand))),
    []
  );

  const modelsForBrand = useMemo(
    () =>
      selectedBrand
        ? VEHICLE_DATABASE.filter((v) => v.brand === selectedBrand)
        : VEHICLE_DATABASE,
    [selectedBrand]
  );

  const activeVehicle = useMemo(
    () => VEHICLE_DATABASE.find((v) => v.id === selectedVehicleId) || null,
    [selectedVehicleId]
  );

  const popularVehicles = useMemo(
    () => VEHICLE_DATABASE.filter((v) => Boolean(v.popularBadge)),
    []
  );

  const handleSelectPopularVehicle = (vehicle: VehicleFitmentSpec) => {
    setSelectedBrand(vehicle.brand);
    setSelectedVehicleId(vehicle.id);
    setSelectedYear(vehicle.years[vehicle.years.length - 1] || '');
    setCalcOem(vehicle.oemTire);
    setCalcUpgrade(vehicle.maxTireWith2InchLift);
    setSelectedBoltSlug(vehicle.boltPatternSlug);

    const updated = [vehicle, ...garageVehicles.filter((g) => g.id !== vehicle.id)].slice(0, 4);
    setGarageVehicles(updated);
    try {
      window.localStorage.setItem(
        GARAGE_STORAGE_KEY,
        JSON.stringify(updated.map((u) => u.id))
      );
    } catch {
      // ignore
    }
    updateHeaderGarageBadge(vehicle);
  };

  const buildTireSearchUrl = () => {
    let base = '/collections/neumaticos';
    if (selectedTireType === 'MT') base = '/collections/neumaticos-offroad-at-y-mt';
    if (selectedTireType === 'RT') base = '/collections/neumaticos-rt';
    if (selectedTireBrand) {
      return `${base}?marca=${encodeURIComponent(selectedTireBrand)}`;
    }
    return base;
  };

  const buildWheelSearchUrl = () => {
    const base = `/collections/${selectedBoltSlug || 'llantas'}`;
    if (selectedWheelBrand) {
      return `${base}?marca=${encodeURIComponent(selectedWheelBrand)}`;
    }
    return base;
  };

  return (
    <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/95 shadow-2xl backdrop-blur-md overflow-hidden">
      <div
        role="tablist"
        aria-label="Buscador especializado 4x4"
        className="grid grid-cols-3 border-b border-zinc-800 bg-zinc-950"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'vehicle'}
          onClick={() => setActiveTab('vehicle')}
          className={`flex items-center justify-center gap-2 py-4 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'vehicle'
              ? 'border-[#FFCC00] bg-zinc-900 text-[#FFCC00]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>1. Tu Vehículo 4x4</span>
          {activeVehicle && (
            <span className="hidden md:inline-flex rounded bg-[#FFCC00] px-1.5 py-0.5 text-[10px] font-black text-black">
              {activeVehicle.model}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'tire'}
          onClick={() => setActiveTab('tire')}
          className={`flex items-center justify-center gap-2 py-4 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'tire'
              ? 'border-[#FFCC00] bg-zinc-900 text-[#FFCC00]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>2. Neumáticos + Calculadora</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'wheel'}
          onClick={() => setActiveTab('wheel')}
          className={`flex items-center justify-center gap-2 py-4 px-3 text-xs sm:text-sm font-black uppercase tracking-wider transition-all border-b-2 ${
            activeTab === 'wheel'
              ? 'border-[#FFCC00] bg-zinc-900 text-[#FFCC00]'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span>3. Llantas por Apernadura</span>
        </button>
      </div>

      {activeTab === 'vehicle' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFCC00]">
                GARAGE DOBLETRACCIÓN · NAVEGACIÓN PERSONALIZADA
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                ¿Qué vehículo tienes? Te mostramos solo lo compatible.
              </h2>
              <p className="text-xs sm:text-sm text-zinc-400">
                Marca y modelo en 5 segundos. Puedes guardar varios en tu Garage.
              </p>
            </div>
            <a
              href="/pages/garage-interactivo"
              className="text-xs font-bold uppercase tracking-wider text-[#FFCC00] hover:underline shrink-0"
            >
              Abrir Garage Completo →
            </a>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Marca
              </label>
              <select
                aria-label="Seleccionar Marca de Vehículo"
                value={selectedBrand}
                onChange={(e) => {
                  const brand = e.target.value;
                  setSelectedBrand(brand);
                  const firstModel = VEHICLE_DATABASE.find((v) => v.brand === brand);
                  if (firstModel) {
                    handleSelectPopularVehicle(firstModel);
                  } else {
                    setSelectedVehicleId('');
                  }
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm font-bold text-white focus:border-[#FFCC00] focus:outline-none"
              >
                <option value="">— Todas las Marcas —</option>
                {brands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Modelo / Generación
              </label>
              <select
                aria-label="Seleccionar Modelo de Vehículo"
                value={selectedVehicleId}
                onChange={(e) => {
                  const found = VEHICLE_DATABASE.find((v) => v.id === e.target.value);
                  if (found) handleSelectPopularVehicle(found);
                }}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm font-bold text-white focus:border-[#FFCC00] focus:outline-none"
              >
                <option value="">— Selecciona Modelo —</option>
                {modelsForBrand.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.model} ({m.generation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-zinc-400 mb-1">
                Año
              </label>
              <select
                aria-label="Seleccionar Año del Vehículo"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                disabled={!activeVehicle}
                className="w-full rounded-xl border border-zinc-700 bg-zinc-950 px-3.5 py-3 text-sm font-bold text-white disabled:opacity-50 focus:border-[#FFCC00] focus:outline-none"
              >
                <option value="">— Año —</option>
                {(activeVehicle?.years || []).map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <a
                href={
                  activeVehicle
                    ? `/collections/${activeVehicle.collectionSlug}`
                    : '/collections/kit-de-levante-y-suspension'
                }
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#FFCC00] px-5 py-3 text-sm font-black uppercase tracking-wider text-black hover:bg-[#ffd633] transition-colors"
              >
                {activeVehicle ? `Ver Productos ${activeVehicle.model}` : 'Buscar Compatibles'}
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              O elige uno popular en 1 clic:
            </span>
            <div className="flex flex-wrap gap-2">
              {popularVehicles.map((veh) => {
                const isSelected = activeVehicle?.id === veh.id;
                return (
                  <button
                    key={veh.id}
                    type="button"
                    onClick={() => handleSelectPopularVehicle(veh)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all ${
                      isSelected
                        ? 'border-[#FFCC00] bg-[#FFCC00] text-black shadow-md'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600 hover:text-white'
                    }`}
                  >
                    <span>{veh.model}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        isSelected ? 'bg-black/20 text-black' : 'bg-zinc-800 text-[#FFCC00]'
                      }`}
                    >
                      {veh.popularBadge}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {activeVehicle && (
            <div className="rounded-xl border border-[#FFCC00]/40 bg-zinc-950 p-4 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-emerald-500/20 px-2 py-0.5 text-[11px] font-bold text-emerald-400">
                    ✓ GUARDADO EN TU GARAGE
                  </span>
                  <span className="text-base font-black uppercase text-white">
                    {activeVehicle.brand} {activeVehicle.model} · {activeVehicle.generation}{' '}
                    {selectedYear && `(${selectedYear})`}
                  </span>
                </div>
                <p className="text-xs text-zinc-400">
                  Apernadura original:{' '}
                  <strong className="text-white">{activeVehicle.boltPattern}</strong> · Neumático
                  OEM: <strong className="text-white">{activeVehicle.oemTire}</strong> · Upgrade
                  recomendado (Levante 2&quot;):{' '}
                  <strong className="text-[#FFCC00]">{activeVehicle.maxTireWith2InchLift}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                <a
                  href={`/collections/${activeVehicle.collectionSlug}`}
                  className="rounded-lg bg-[#FFCC00] px-3.5 py-2 text-xs font-black uppercase text-black hover:bg-[#ffd633]"
                >
                  Kits y Accesorios {activeVehicle.model}
                </a>
                <a
                  href={`/collections/${activeVehicle.boltPatternSlug}`}
                  className="rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2 text-xs font-bold text-white hover:border-[#FFCC00]"
                >
                  Llantas {activeVehicle.boltPattern}
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setCalcOem(activeVehicle.oemTire);
                    setCalcUpgrade(activeVehicle.maxTireWith2InchLift);
                    setShowCalculator(true);
                    setActiveTab('tire');
                  }}
                  className="rounded-lg border border-[#FFCC00]/50 bg-[#FFCC00]/10 px-3.5 py-2 text-xs font-bold text-[#FFCC00] hover:bg-[#FFCC00]/20"
                >
                  Comparar {activeVehicle.oemTire} vs {activeVehicle.maxTireWith2InchLift} →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tire' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFCC00]">
                ESPECIALISTAS EN NEUMÁTICOS OFF-ROAD (AT · MT · RT)
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Encuentra tu Medida y Compara Ganancia de Altura
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCalculator((prev) => !prev)}
                className="rounded-lg border border-[#FFCC00]/60 bg-[#FFCC00]/10 px-3 py-1.5 text-xs font-bold text-[#FFCC00] hover:bg-[#FFCC00]/20"
              >
                {showCalculator ? 'Ocultar Calculadora Visual' : 'Abrir Calculadora Visual'}
              </button>
              <a
                href="/neumaticos/medidas"
                className="text-xs font-bold uppercase tracking-wider text-zinc-300 hover:text-[#FFCC00]"
              >
                Ver todas las medidas →
              </a>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12">
            <div className="md:col-span-5 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Tipo de Terreno
              </span>
              <div className="grid grid-cols-4 gap-2">
                {(['ALL', 'AT', 'MT', 'RT'] as const).map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSelectedTireType(type)}
                    className={`rounded-lg border py-2.5 text-xs font-black uppercase transition-all ${
                      selectedTireType === type
                        ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                    }`}
                  >
                    {type === 'ALL' ? 'Todos' : `Neum. ${type}`}
                  </button>
                ))}
              </div>
            </div>

            <div className="md:col-span-5 space-y-1.5">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                Filtrar por Marca Oficial
              </span>
              <div className="grid grid-cols-4 gap-2">
                {['BFGoodrich', 'Maxxis', 'Falken', 'Cooper'].map((brand) => {
                  const active = selectedTireBrand === brand;
                  return (
                    <button
                      key={brand}
                      type="button"
                      onClick={() => setSelectedTireBrand(active ? '' : brand)}
                      className={`rounded-lg border py-2.5 px-2 text-xs font-bold truncate transition-all ${
                        active
                          ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-600'
                      }`}
                    >
                      {brand}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="md:col-span-2 flex items-end">
              <a
                href={buildTireSearchUrl()}
                className="w-full inline-flex items-center justify-center rounded-xl bg-[#FFCC00] py-2.5 px-4 text-xs font-black uppercase tracking-wider text-black hover:bg-[#ffd633]"
              >
                Ver Catálogo →
              </a>
            </div>
          </div>

          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Medidas 4x4 con mayor demanda en Chile (Toca para simular altura o ver stock):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
              {POPULAR_TIRE_MEASURES.slice(0, 7).map((item) => {
                const isCurrentUpgrade = calcUpgrade.toUpperCase() === item.measure.toUpperCase();
                return (
                  <button
                    key={item.slug}
                    type="button"
                    onClick={() => {
                      setCalcUpgrade(item.measure);
                      setShowCalculator(true);
                    }}
                    className={`group flex flex-col items-start justify-between rounded-xl border p-3 text-left transition-all ${
                      isCurrentUpgrade
                        ? 'border-[#FFCC00] bg-[#FFCC00]/15'
                        : 'border-zinc-800 bg-zinc-950 hover:border-zinc-600'
                    }`}
                  >
                    <span className="text-[10px] font-bold uppercase text-zinc-400">
                      Aro {item.rim}
                    </span>
                    <span className="mt-0.5 text-sm font-black text-white group-hover:text-[#FFCC00]">
                      {item.measure}
                    </span>
                    <span className="mt-1 text-[11px] font-semibold text-[#FFCC00]">
                      {item.approxInches}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {showCalculator && (
            <TireCalculatorWidget
              key={`${calcOem}-${calcUpgrade}`}
              initialOem={calcOem}
              initialUpgrade={calcUpgrade}
              vehicleLabel={
                activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : undefined
              }
            />
          )}
        </div>
      )}

      {activeTab === 'wheel' && (
        <div className="p-5 sm:p-7 space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-widest text-[#FFCC00]">
                CATÁLOGO DE LLANTAS OFF-ROAD · METHOD · FUEL · KMC · BLACK RHINO
              </span>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                Selecciona la Apernadura de tu 4x4
              </h2>
            </div>
            {activeVehicle && (
              <span className="rounded-lg border border-[#FFCC00]/50 bg-[#FFCC00]/10 px-3 py-1.5 text-xs font-bold text-[#FFCC00]">
                Tu {activeVehicle.model} usa apernadura <strong>{activeVehicle.boltPattern}</strong>
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            {WHEEL_BOLT_PATTERNS.map((bp) => {
              const isSelected = selectedBoltSlug === bp.slug;
              const isVehicleMatch = activeVehicle?.boltPatternSlug === bp.slug;

              return (
                <button
                  key={bp.slug}
                  type="button"
                  onClick={() => setSelectedBoltSlug(bp.slug)}
                  className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                    isSelected
                      ? 'border-[#FFCC00] bg-[#FFCC00] text-black shadow-lg'
                      : isVehicleMatch
                        ? 'border-[#FFCC00]/60 bg-zinc-950 text-white'
                        : 'border-zinc-800 bg-zinc-950 text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] font-bold uppercase opacity-75">APERNADURA</span>
                    {isVehicleMatch && (
                      <span
                        className={`rounded px-1 text-[9px] font-black ${
                          isSelected ? 'bg-black text-[#FFCC00]' : 'bg-[#FFCC00] text-black'
                        }`}
                      >
                        TU 4X4
                      </span>
                    )}
                  </div>
                  <span className="mt-1 text-base font-black tracking-tight">{bp.label}</span>
                  <span
                    className={`mt-1 text-[10px] line-clamp-1 ${
                      isSelected ? 'text-black/80 font-semibold' : 'text-zinc-400'
                    }`}
                  >
                    {bp.vehiclesExample}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-2 border-t border-zinc-800">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 mr-1">
                Filtrar por marca:
              </span>
              {['Method', 'Fuel', 'KMC', 'Black Rhino'].map((brand) => {
                const active = selectedWheelBrand === brand;
                return (
                  <button
                    key={brand}
                    type="button"
                    onClick={() => setSelectedWheelBrand(active ? '' : brand)}
                    className={`rounded-lg border px-3.5 py-2 text-xs font-bold uppercase transition-all ${
                      active
                        ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-300 hover:border-zinc-500'
                    }`}
                  >
                    {brand}
                  </button>
                );
              })}
            </div>

            <a
              href={buildWheelSearchUrl()}
              className="inline-flex items-center justify-center rounded-xl bg-[#FFCC00] px-6 py-3 text-xs sm:text-sm font-black uppercase tracking-wider text-black hover:bg-[#ffd633] transition-colors"
            >
              Ver Llantas{' '}
              {WHEEL_BOLT_PATTERNS.find((b) => b.slug === selectedBoltSlug)?.label || ''}{' '}
              {selectedWheelBrand ? `· ${selectedWheelBrand}` : ''} →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
