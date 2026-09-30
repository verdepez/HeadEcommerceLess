import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  POPULAR_TIRE_MEASURES,
  VEHICLE_DATABASE,
  WHEEL_BOLT_PATTERNS,
  type VehicleFitmentSpec,
} from '../../data/offroad-catalog';
import TireCalculatorWidget from './TireCalculatorWidget';

export type SearchTabMode = 'vehicle' | 'tire' | 'wheel';

const GARAGE_STORAGE_KEY = 'dobletraccion_garage_v1';
const ACTIVE_GARAGE_KEY = 'dt_active_vehicle_garage_v1';

const TIRE_WIDTHS = ['225', '235', '245', '255', '265', '275', '285', '295', '305', '315', '33', '35', '37'];
const TIRE_PROFILES = ['55', '60', '65', '70', '75', '80', '85', '10.5', '12.5'];
const TIRE_RIMS = ['15', '16', '17', '18', '20'];
const WHEEL_RIMS = ['15"', '16"', '17"', '18"', '20"'];
const WHEEL_BRANDS = ['Todas las marcas', 'Method Race Wheels', 'Fuel Off-Road', 'KMC Wheels', 'Black Rhino'];

export default function OffroadSearchHub({
  initialTab = 'vehicle',
  defaultShowCalculator = false,
}: {
  initialTab?: SearchTabMode;
  defaultShowCalculator?: boolean;
}): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<SearchTabMode>(initialTab);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Estado Vehículo
  const [selectedBrand, setSelectedBrand] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [garageVehicles, setGarageVehicles] = useState<VehicleFitmentSpec[]>([]);

  // Estado Neumático
  const [tireWidth, setTireWidth] = useState<string>('');
  const [tireProfile, setTireProfile] = useState<string>('');
  const [tireRim, setTireRim] = useState<string>('');
  const [selectedTireType, setSelectedTireType] = useState<'ALL' | 'AT' | 'MT' | 'RT'>('ALL');
  const [showCalculator, setShowCalculator] = useState<boolean>(defaultShowCalculator);
  const [calcOem, setCalcOem] = useState<string>('265/65R17');
  const [calcUpgrade, setCalcUpgrade] = useState<string>('285/70R17');

  // Estado Llanta
  const [selectedBoltSlug, setSelectedBoltSlug] = useState<string>('');
  const [selectedWheelRim, setSelectedWheelRim] = useState<string>('');
  const [selectedWheelBrand, setSelectedWheelBrand] = useState<string>('');

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
          syncGlobalGarage(found[0]);
        }
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const syncGlobalGarage = (vehicle: VehicleFitmentSpec | null) => {
    try {
      if (vehicle) {
        window.localStorage.setItem(
          ACTIVE_GARAGE_KEY,
          JSON.stringify({
            id: vehicle.id,
            brand: vehicle.brand,
            model: vehicle.model,
            generation: vehicle.generation,
            collectionSlug: vehicle.collectionSlug,
            boltPattern: vehicle.boltPattern,
            oemTire: vehicle.oemTire,
            maxTireWith2InchLift: vehicle.maxTireWith2InchLift,
          })
        );
      } else {
        window.localStorage.removeItem(ACTIVE_GARAGE_KEY);
      }
      window.dispatchEvent(new CustomEvent('dt:garage-updated'));
    } catch {
      // ignore
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
        : [],
    [selectedBrand]
  );

  const activeVehicle = useMemo(
    () => VEHICLE_DATABASE.find((v) => v.id === selectedVehicleId) || null,
    [selectedVehicleId]
  );

  const saveToGarage = (vehicle: VehicleFitmentSpec) => {
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
    syncGlobalGarage(vehicle);
  };

  const handleGoVehicle = () => {
    if (!activeVehicle) return;
    saveToGarage(activeVehicle);
    window.location.href = `/collections/${activeVehicle.collectionSlug}`;
  };

  const handleGoTire = () => {
    let base = '/collections/neumaticos';
    if (selectedTireType === 'MT') base = '/collections/neumaticos-offroad-at-y-mt';
    if (selectedTireType === 'RT') base = '/collections/neumaticos-rt';
    const measureQuery =
      tireWidth && tireProfile && tireRim ? `${tireWidth}/${tireProfile}R${tireRim}` : '';
    window.location.href = measureQuery ? `${base}?medida=${encodeURIComponent(measureQuery)}` : base;
  };

  const handleGoWheel = () => {
    const base = selectedBoltSlug ? `/collections/${selectedBoltSlug}` : '/collections/llantas';
    const params = new URLSearchParams();
    if (selectedWheelRim) params.set('aro', selectedWheelRim);
    if (selectedWheelBrand && selectedWheelBrand !== 'Todas las marcas') {
      params.set('marca', selectedWheelBrand);
    }
    const qs = params.toString();
    window.location.href = qs ? `${base}?${qs}` : base;
  };

  const selectedBoltLabel = useMemo(() => {
    const found = WHEEL_BOLT_PATTERNS.find((b) => b.slug === selectedBoltSlug);
    return found ? `Apernadura ${found.label}` : '';
  }, [selectedBoltSlug]);

  return (
    <div id="dt-hero-search" ref={containerRef} className="w-full text-left max-w-[990px] mx-auto">
      <div className="relative bg-[hsl(var(--brand-black))] px-4 pt-2.5 pb-3 sm:px-6 sm:pt-4 sm:pb-5 shadow-2xl border border-white/10">
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none bg-topo-invert" />

        <div className="relative">
          {/* PESTAÑAS IDÉNTICAS A 4X4.CL */}
          <div
            role="tablist"
            aria-label="Tipo de búsqueda"
            className="flex items-center justify-between gap-2 mb-2 sm:mb-4 flex-wrap"
          >
            <div className="grid grid-cols-3 sm:flex sm:items-center gap-1 min-w-0 w-full sm:w-auto">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'vehicle'}
                onClick={() => {
                  setActiveTab('vehicle');
                  setOpenDropdown(null);
                }}
                className={`font-button uppercase tracking-[0.12em] text-[11px] sm:text-[13px] px-2.5 sm:px-3 py-2 transition-colors border-b-2 ${
                  activeTab === 'vehicle'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-white/60 border-transparent hover:text-white'
                }`}
              >
                Buscar por vehículo
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'tire'}
                onClick={() => {
                  setActiveTab('tire');
                  setOpenDropdown(null);
                }}
                className={`font-button uppercase tracking-[0.12em] text-[11px] sm:text-[13px] px-2.5 sm:px-3 py-2 transition-colors border-b-2 ${
                  activeTab === 'tire'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-white/60 border-transparent hover:text-white'
                }`}
              >
                Buscar neumático
              </button>

              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'wheel'}
                onClick={() => {
                  setActiveTab('wheel');
                  setOpenDropdown(null);
                }}
                className={`font-button uppercase tracking-[0.12em] text-[11px] sm:text-[13px] px-2.5 sm:px-3 py-2 transition-colors border-b-2 ${
                  activeTab === 'wheel'
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'text-white/60 border-transparent hover:text-white'
                }`}
              >
                Buscar llanta
              </button>
            </div>

            {/* Botón rápido de Calculadora 4x4 + Indicador Mi Garage */}
            <div className="hidden sm:flex items-center gap-2">
              {activeVehicle && (
                <a
                  href={`/collections/${activeVehicle.collectionSlug}`}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white/[0.08] border border-primary/40 text-[11px] font-button uppercase tracking-wider text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  <span>✓ {activeVehicle.brand} {activeVehicle.model}</span>
                </a>
              )}
              <button
                type="button"
                onClick={() => {
                  setActiveTab('tire');
                  setShowCalculator((prev) => !prev);
                }}
                className="font-button uppercase tracking-[0.1em] text-[11px] px-2.5 py-1 border border-white/20 text-white/80 hover:border-primary hover:text-primary transition-colors"
              >
                {showCalculator ? 'Ocultar Calculadora 4x4' : '⚡ Calculadora Equivalencias'}
              </button>
            </div>
          </div>

          {/* =========================================================
              TAB 1: BUSCAR POR VEHÍCULO (1 Marca | 2 Modelo | 3 Año)
          ========================================================= */}
          {activeTab === 'vehicle' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2 md:[grid-template-columns:1fr_1fr_1fr_auto]">
                {/* Paso 1: Marca */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'v-brand' ? null : 'v-brand')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      1
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {selectedBrand || 'Marca'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-down h-4 w-4 shrink-0 transition-all duration-200 text-white/70 group-hover:text-primary group-hover:translate-y-0.5"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === 'v-brand' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {brands.map((brand) => (
                        <button
                          key={brand}
                          type="button"
                          onClick={() => {
                            setSelectedBrand(brand);
                            const firstForBrand = VEHICLE_DATABASE.find((v) => v.brand === brand);
                            if (firstForBrand) {
                              setSelectedVehicleId(firstForBrand.id);
                              setSelectedYear(firstForBrand.years[firstForBrand.years.length - 1] || '');
                              setCalcOem(firstForBrand.oemTire);
                              setCalcUpgrade(firstForBrand.maxTireWith2InchLift);
                              setSelectedBoltSlug(firstForBrand.boltPatternSlug);
                            }
                            setOpenDropdown('v-model');
                          }}
                          className={`w-full px-4 py-2.5 text-left font-button uppercase tracking-wider text-xs flex items-center justify-between transition-colors ${
                            selectedBrand === brand
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'text-white/85 hover:bg-white/10 hover:text-primary'
                          }`}
                        >
                          <span>{brand}</span>
                          <span className="text-[10px] opacity-65">
                            {VEHICLE_DATABASE.filter((v) => v.brand === brand).length} modelos
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paso 2: Modelo */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!selectedBrand}
                    onClick={() => setOpenDropdown(openDropdown === 'v-model' ? null : 'v-model')}
                    className={`group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 ${
                      selectedBrand
                        ? 'hover:bg-white/[0.16] hover:border-primary/70'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      2
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {activeVehicle ? `${activeVehicle.model} (${activeVehicle.generation})` : 'Modelo'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-down h-4 w-4 shrink-0 transition-all duration-200 text-white/70 group-hover:text-primary group-hover:translate-y-0.5"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === 'v-model' && modelsForBrand.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {modelsForBrand.map((v) => (
                        <button
                          key={v.id}
                          type="button"
                          onClick={() => {
                            setSelectedVehicleId(v.id);
                            setSelectedYear(v.years[v.years.length - 1] || '');
                            setCalcOem(v.oemTire);
                            setCalcUpgrade(v.maxTireWith2InchLift);
                            setSelectedBoltSlug(v.boltPatternSlug);
                            setOpenDropdown('v-year');
                          }}
                          className={`w-full px-4 py-2.5 text-left font-button uppercase tracking-wider text-xs flex items-center justify-between transition-colors ${
                            selectedVehicleId === v.id
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'text-white/85 hover:bg-white/10 hover:text-primary'
                          }`}
                        >
                          <span>{v.model}</span>
                          <span className="text-[10px] opacity-70">{v.generation}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Paso 3: Año */}
                <div className="relative">
                  <button
                    type="button"
                    disabled={!activeVehicle}
                    onClick={() => setOpenDropdown(openDropdown === 'v-year' ? null : 'v-year')}
                    className={`group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 ${
                      activeVehicle
                        ? 'hover:bg-white/[0.16] hover:border-primary/70'
                        : 'opacity-40 cursor-not-allowed'
                    }`}
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      3
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {selectedYear || 'Año'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="lucide lucide-chevron-down h-4 w-4 shrink-0 transition-all duration-200 text-white/70 group-hover:text-primary group-hover:translate-y-0.5"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>

                  {openDropdown === 'v-year' && activeVehicle && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {[...activeVehicle.years].reverse().map((yr) => (
                        <button
                          key={yr}
                          type="button"
                          onClick={() => {
                            setSelectedYear(yr);
                            setOpenDropdown(null);
                            saveToGarage(activeVehicle);
                          }}
                          className={`w-full px-4 py-2 text-left font-button uppercase tracking-wider text-xs transition-colors ${
                            selectedYear === yr
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'text-white/85 hover:bg-white/10 hover:text-primary'
                          }`}
                        >
                          Año {yr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA: COMPRAR PARA MI VEHÍCULO */}
                <button
                  type="button"
                  disabled={!activeVehicle}
                  onClick={handleGoVehicle}
                  className="h-[52px] md:h-12 px-7 bg-primary text-primary-foreground font-button uppercase tracking-[0.1em] text-[13px] font-bold transition-colors hover:brightness-95 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  COMPRAR PARA MI VEHÍCULO
                </button>
              </div>

              {/* Resumen de Ficha de Compatibilidad 4x4 cuando hay vehículo activo */}
              {activeVehicle && (
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10 text-xs text-white/80">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-button uppercase text-[11px] text-primary">
                      ⚡ Fitment Verificado:
                    </span>
                    <span>
                      Apernadura <strong className="text-white">{activeVehicle.boltPattern}</strong>
                    </span>
                    <span className="text-white/30">·</span>
                    <span>
                      OEM <strong className="text-white">{activeVehicle.oemTire}</strong>
                    </span>
                    <span className="text-white/30">·</span>
                    <span>
                      Levante 2&quot; <strong className="text-primary">{activeVehicle.maxTireWith2InchLift}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <a
                      href={`/collections/${activeVehicle.boltPatternSlug}`}
                      className="font-button uppercase text-[11px] text-white/70 hover:text-primary underline"
                    >
                      Ver Llantas {activeVehicle.boltPattern}
                    </a>
                    <a
                      href={`/collections/${activeVehicle.collectionSlug}`}
                      className="font-button uppercase text-[11px] text-primary font-bold hover:underline"
                    >
                      Ir al Catálogo {activeVehicle.model} →
                    </a>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 2: BUSCAR NEUMÁTICO (1 Ancho | 2 Perfil | 3 Aro)
          ========================================================= */}
          {activeTab === 'tire' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-2 md:[grid-template-columns:1fr_1fr_1fr_auto]">
                {/* 1: Ancho */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 't-width' ? null : 't-width')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      1
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {tireWidth ? `Ancho ${tireWidth}` : 'Ancho'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 't-width' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {TIRE_WIDTHS.map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => {
                            setTireWidth(w);
                            setOpenDropdown('t-profile');
                          }}
                          className="w-full px-4 py-2 text-left font-button uppercase text-xs text-white/85 hover:bg-white/10 hover:text-primary"
                        >
                          {w} {Number(w) < 40 ? 'Pulgadas' : 'mm'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2: Perfil */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 't-profile' ? null : 't-profile')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      2
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {tireProfile ? `Perfil ${tireProfile}` : 'Perfil'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 't-profile' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {TIRE_PROFILES.map((p) => (
                        <button
                          key={p}
                          type="button"
                          onClick={() => {
                            setTireProfile(p);
                            setOpenDropdown('t-rim');
                          }}
                          className="w-full px-4 py-2 text-left font-button uppercase text-xs text-white/85 hover:bg-white/10 hover:text-primary"
                        >
                          Serie {p}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3: Aro */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 't-rim' ? null : 't-rim')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      3
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {tireRim ? `Aro R${tireRim}` : 'Aro'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 't-rim' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {TIRE_RIMS.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => {
                            setTireRim(r);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left font-button uppercase text-xs text-white/85 hover:bg-white/10 hover:text-primary"
                        >
                          Aro R{r}&quot;
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA: BUSCAR NEUMÁTICO */}
                <button
                  type="button"
                  onClick={handleGoTire}
                  className="h-[52px] md:h-12 px-7 bg-primary text-primary-foreground font-button uppercase tracking-[0.1em] text-[13px] font-bold transition-colors hover:brightness-95"
                >
                  BUSCAR NEUMÁTICO
                </button>
              </div>

              {/* Accesos rápidos a terreno (AT / MT / RT) y Medidas Populares */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-button uppercase text-[10px] tracking-wider text-white/50 mr-1">
                    Terreno:
                  </span>
                  {(['ALL', 'AT', 'MT', 'RT'] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSelectedTireType(t)}
                      className={`font-button uppercase text-[11px] px-2.5 py-1 border transition-colors ${
                        selectedTireType === t
                          ? 'bg-primary text-primary-foreground border-primary font-bold'
                          : 'bg-white/[0.06] text-white/75 border-white/15 hover:border-primary/60'
                      }`}
                    >
                      {t === 'ALL' ? 'Todos' : t}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-button uppercase text-[10px] tracking-wider text-white/50">
                    Medidas rápidas:
                  </span>
                  {POPULAR_TIRE_MEASURES.slice(0, 4).map((item) => (
                    <button
                      key={item.measure}
                      type="button"
                      onClick={() => {
                        setCalcUpgrade(item.measure);
                        setShowCalculator(true);
                      }}
                      className="font-button text-[11px] px-2 py-0.5 bg-white/[0.06] border border-white/15 text-white/80 hover:border-primary hover:text-primary transition-colors"
                    >
                      {item.measure}
                    </button>
                  ))}
                </div>
              </div>

              {showCalculator && (
                <div className="pt-2">
                  <TireCalculatorWidget
                    initialOem={calcOem}
                    initialUpgrade={calcUpgrade}
                    vehicleName={
                      activeVehicle ? `${activeVehicle.brand} ${activeVehicle.model}` : undefined
                    }
                  />
                </div>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 3: BUSCAR LLANTA (1 Apernadura | 2 Aro | 3 Marca)
          ========================================================= */}
          {activeTab === 'wheel' && (
            <div className="space-y-2.5">
              <div className="grid grid-cols-1 gap-2 md:[grid-template-columns:1fr_1fr_1fr_auto]">
                {/* 1: Apernadura */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'w-bolt' ? null : 'w-bolt')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      1
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {selectedBoltLabel || 'Apernadura'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 'w-bolt' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-64 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {WHEEL_BOLT_PATTERNS.map((bp) => (
                        <button
                          key={bp.slug}
                          type="button"
                          onClick={() => {
                            setSelectedBoltSlug(bp.slug);
                            setOpenDropdown('w-rim');
                          }}
                          className={`w-full px-4 py-2.5 text-left font-button uppercase text-xs flex items-center justify-between ${
                            selectedBoltSlug === bp.slug
                              ? 'bg-primary text-primary-foreground font-bold'
                              : 'text-white/85 hover:bg-white/10 hover:text-primary'
                          }`}
                        >
                          <span>APERNADURA {bp.label}</span>
                          <span className="text-[10px] opacity-65 truncate max-w-[140px]">
                            {bp.commonVehicles}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 2: Aro */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'w-rim' ? null : 'w-rim')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      2
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {selectedWheelRim ? `Aro ${selectedWheelRim}` : 'Aro'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 'w-rim' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {WHEEL_RIMS.map((rim) => (
                        <button
                          key={rim}
                          type="button"
                          onClick={() => {
                            setSelectedWheelRim(rim);
                            setOpenDropdown('w-brand');
                          }}
                          className="w-full px-4 py-2 text-left font-button uppercase text-xs text-white/85 hover:bg-white/10 hover:text-primary"
                        >
                          Aro {rim}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3: Marca */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === 'w-brand' ? null : 'w-brand')}
                    className="group w-full h-[52px] md:h-12 pr-3 flex items-center text-left border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary bg-white/[0.08] text-white border-white/15 hover:bg-white/[0.16] hover:border-primary/70"
                  >
                    <span className="h-full w-9 shrink-0 flex items-center justify-center border-r font-button text-xs transition-colors text-primary/80 border-white/15 group-hover:text-primary">
                      3
                    </span>
                    <span className="flex-1 min-w-0 pl-3 font-button uppercase tracking-[0.12em] text-sm font-semibold truncate transition-colors text-white/85 group-hover:text-white">
                      {selectedWheelBrand || 'Marca'}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="24"
                      height="24"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className="h-4 w-4 shrink-0 text-white/70 group-hover:text-primary"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                  </button>
                  {openDropdown === 'w-brand' && (
                    <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-[hsl(var(--brand-black))] border border-primary/60 shadow-2xl divide-y divide-white/10">
                      {WHEEL_BRANDS.map((b) => (
                        <button
                          key={b}
                          type="button"
                          onClick={() => {
                            setSelectedWheelBrand(b);
                            setOpenDropdown(null);
                          }}
                          className="w-full px-4 py-2 text-left font-button uppercase text-xs text-white/85 hover:bg-white/10 hover:text-primary"
                        >
                          {b}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* CTA: BUSCAR LLANTA */}
                <button
                  type="button"
                  onClick={handleGoWheel}
                  className="h-[52px] md:h-12 px-7 bg-primary text-primary-foreground font-button uppercase tracking-[0.1em] text-[13px] font-bold transition-colors hover:brightness-95"
                >
                  BUSCAR LLANTA
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
