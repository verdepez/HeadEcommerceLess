export interface VehicleFitmentSpec {
  id: string;
  brand: string;
  model: string;
  generation: string;
  years: string[];
  collectionSlug: string;
  boltPattern: string;
  boltPatternSlug: string;
  oemTire: string;
  maxTireWith2InchLift: string;
  popularBadge?: string;
}

export const VEHICLE_DATABASE: VehicleFitmentSpec[] = [
  {
    id: 'ford-f150-raptor-gen3',
    brand: 'Ford',
    model: 'F-150 Raptor',
    generation: 'Gen 3',
    years: ['2021', '2022', '2023', '2024', '2025', '2026'],
    collectionSlug: 'f-150-raptor',
    boltPattern: '6X135',
    boltPatternSlug: '6x13525',
    oemTire: '315/70R17',
    maxTireWith2InchLift: '37x12.5R17',
    popularBadge: 'Raptor Gen 3',
  },
  {
    id: 'ford-f150',
    brand: 'Ford',
    model: 'F-150',
    generation: '14ª Gen',
    years: ['2015', '2016', '2017', '2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'f-150',
    boltPattern: '6X135',
    boltPatternSlug: '6x13525',
    oemTire: '275/65R18',
    maxTireWith2InchLift: '285/70R17',
  },
  {
    id: 'ford-ranger-nextgen',
    brand: 'Ford',
    model: 'Ranger',
    generation: 'Último modelo (P703)',
    years: ['2023', '2024', '2025', '2026'],
    collectionSlug: 'ranger',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '255/70R17',
    maxTireWith2InchLift: '285/70R17',
    popularBadge: 'Último modelo',
  },
  {
    id: 'ford-ranger-gen2',
    brand: 'Ford',
    model: 'Ranger',
    generation: 'Gen 2 (T6)',
    years: ['2012', '2015', '2018', '2019', '2020', '2021', '2022'],
    collectionSlug: 'ranger',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '265/65R17',
    maxTireWith2InchLift: '285/70R17',
    popularBadge: 'Gen 2',
  },
  {
    id: 'ford-ranger-raptor',
    brand: 'Ford',
    model: 'Ranger Raptor',
    generation: 'Next-Gen 3.0 V6',
    years: ['2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    collectionSlug: 'ranger-raptor',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '285/70R17',
    maxTireWith2InchLift: '315/70R17',
  },
  {
    id: 'ford-bronco',
    brand: 'Ford',
    model: 'Bronco',
    generation: '6ª Gen',
    years: ['2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'bronco',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '285/70R17',
    maxTireWith2InchLift: '35x12.5R17',
  },
  {
    id: 'ford-maverick',
    brand: 'Ford',
    model: 'Maverick',
    generation: 'FX4 / Lariat',
    years: ['2022', '2023', '2024', '2025'],
    collectionSlug: 'maverick',
    boltPattern: '5X108',
    boltPatternSlug: '5x1081',
    oemTire: '245/65R17',
    maxTireWith2InchLift: '255/65R17',
  },
  {
    id: 'toyota-hilux',
    brand: 'Toyota',
    model: 'Hilux',
    generation: 'Último modelo (Revo)',
    years: ['2016', '2018', '2020', '2021', '2022', '2023', '2024', '2025', '2026'],
    collectionSlug: 'hilux',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '265/65R17',
    maxTireWith2InchLift: '285/70R17',
    popularBadge: 'Último modelo',
  },
  {
    id: 'toyota-4runner',
    brand: 'Toyota',
    model: '4Runner',
    generation: '5ª / 6ª Gen',
    years: ['2014', '2018', '2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: '4runner',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '265/70R17',
    maxTireWith2InchLift: '285/70R17',
    popularBadge: 'Último modelo',
  },
  {
    id: 'toyota-tundra',
    brand: 'Toyota',
    model: 'Tundra',
    generation: 'i-FORCE MAX',
    years: ['2015', '2018', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'tundra',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '265/70R18',
    maxTireWith2InchLift: '35x12.5R17',
  },
  {
    id: 'toyota-prado',
    brand: 'Toyota',
    model: 'Prado',
    generation: 'Land Cruiser Prado 150 / 250',
    years: ['2015', '2018', '2020', '2022', '2024', '2025'],
    collectionSlug: 'prado',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '265/65R17',
    maxTireWith2InchLift: '285/70R17',
  },
  {
    id: 'jeep-wrangler-jl',
    brand: 'Jeep',
    model: 'Wrangler',
    generation: 'JL',
    years: ['2018', '2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'wrangler',
    boltPattern: '5X127',
    boltPatternSlug: '5x12742',
    oemTire: '285/70R17',
    maxTireWith2InchLift: '35x12.5R17',
    popularBadge: 'JL',
  },
  {
    id: 'jeep-gladiator-jt',
    brand: 'Jeep',
    model: 'Gladiator',
    generation: 'JT',
    years: ['2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'gladiator',
    boltPattern: '5X127',
    boltPatternSlug: '5x12742',
    oemTire: '285/70R17',
    maxTireWith2InchLift: '37x12.5R17',
    popularBadge: 'JT',
  },
  {
    id: 'chevrolet-silverado-1500',
    brand: 'Chevrolet',
    model: 'Silverado 1500',
    generation: 'ZR2 / Trail Boss',
    years: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'silverado',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '275/65R18',
    maxTireWith2InchLift: '35x12.5R17',
    popularBadge: '2024',
  },
  {
    id: 'ram-1500',
    brand: 'RAM',
    model: '1500',
    generation: 'Rebel / Laramie / TRX',
    years: ['2019', '2020', '2021', '2022', '2023', '2024', '2025'],
    collectionSlug: 'ram-1500',
    boltPattern: '6X139',
    boltPatternSlug: '6x139',
    oemTire: '275/65R18',
    maxTireWith2InchLift: '35x12.5R17',
    popularBadge: '2024',
  },
];

export interface WheelBoltPatternItem {
  label: string;
  slug: string;
  vehiclesExample: string;
}

export const WHEEL_BOLT_PATTERNS: WheelBoltPatternItem[] = [
  { label: '5X100', slug: '5x1001', vehiclesExample: 'Subaru Crosstrek / Forester' },
  { label: '5X108', slug: '5x1081', vehiclesExample: 'Ford Maverick / Bronco Sport' },
  { label: '5X114.3', slug: '5x1144', vehiclesExample: 'Subaru Outback / RAV4' },
  { label: '5X120', slug: '5x1201', vehiclesExample: 'VW Amarok V6 (2011-2022)' },
  { label: '5X127', slug: '5x12742', vehiclesExample: 'Jeep Wrangler JK/JL · Gladiator' },
  { label: '5X130', slug: '5x1301', vehiclesExample: 'Mercedes-Benz Clase G' },
  { label: '5X139', slug: '5x1391', vehiclesExample: 'RAM 1500 Classic · Suzuki Jimny' },
  { label: '5X150', slug: '5x150', vehiclesExample: 'Toyota Tundra (07-21) · Land Cruiser 200' },
  { label: '6X114.3', slug: '6x1143', vehiclesExample: 'Nissan NP300 / Navara' },
  { label: '6X130', slug: '6x1306', vehiclesExample: 'Mercedes-Benz Sprinter 4x4' },
  { label: '6X135', slug: '6x13525', vehiclesExample: 'Ford F-150 · F-150 Raptor' },
  { label: '6X139', slug: '6x139', vehiclesExample: 'Hilux · Ranger · 4Runner · Silverado · D-Max' },
  { label: '8X165', slug: '8x1656', vehiclesExample: 'RAM 2500 · Hummer H2' },
  { label: '8X170', slug: '8x170', vehiclesExample: 'Ford F-250 / F-350 Super Duty' },
];

export interface PopularTireMeasureItem {
  measure: string;
  slug: string;
  rim: string;
  approxInches: string;
  demandTag?: string;
}

export const POPULAR_TIRE_MEASURES: PopularTireMeasureItem[] = [
  { measure: '265/70R17', slug: '265-70r17', rim: '17"', approxInches: '≈ 31.6"', demandTag: 'OEM +1' },
  { measure: '285/70R17', slug: '285-70r17', rim: '17"', approxInches: '≈ 32.7"', demandTag: 'Top Ventas 2"' },
  { measure: '315/70R17', slug: '315-70r17', rim: '17"', approxInches: '≈ 34.4"', demandTag: 'Raptor / Bronco' },
  { measure: '35x12.5R17', slug: '35x12-5r17', rim: '17"', approxInches: '≈ 35.0"', demandTag: 'Extreme Off-Road' },
  { measure: '35x12.5R20', slug: '35x12-5r20', rim: '20"', approxInches: '≈ 35.0"' },
  { measure: '37x12.5R17', slug: '37x12-5r17', rim: '17"', approxInches: '≈ 37.0"' },
  { measure: '37x12.5R20', slug: '37x12-5r20', rim: '20"', approxInches: '≈ 37.0"' },
  { measure: '265/65R17', slug: '265-65r17', rim: '17"', approxInches: '≈ 30.6"', demandTag: 'Medida OEM' },
  { measure: '275/70R17', slug: '275-70r17', rim: '17"', approxInches: '≈ 32.2"' },
  { measure: '285/75R16', slug: '285-75r16', rim: '16"', approxInches: '≈ 32.8"' },
  { measure: '265/75R16', slug: '265-75r16', rim: '16"', approxInches: '≈ 31.6"' },
  { measure: '275/65R18', slug: '275-65r18', rim: '18"', approxInches: '≈ 32.1"' },
];

export const PROJECT_BRANDS = [
  { name: 'FORD', slug: 'ford' },
  { name: 'TOYOTA', slug: 'toyota' },
  { name: 'JEEP', slug: 'jeep' },
  { name: 'CHEVROLET', slug: 'chevrolet' },
  { name: 'RAM', slug: 'ram' },
  { name: 'MITSUBISHI', slug: 'mitsubishi' },
  { name: 'NISSAN', slug: 'nissan' },
  { name: 'VOLKSWAGEN', slug: 'volkswagen' },
  { name: 'MAZDA', slug: 'mazda' },
  { name: 'SUZUKI', slug: 'suzuki' },
  { name: 'SUBARU', slug: 'subaru' },
  { name: 'MAXUS', slug: 'maxus' },
];

export const BRANCHES_4X4 = [
  {
    city: 'Las Condes',
    name: 'Casa Matriz Santiago',
    address: 'Av. Las Condes 9285-B, Las Condes, Santiago',
    phone: '+56 2 3339 9330',
    phoneHref: 'tel:+56233399330',
    whatsappHref: 'https://wa.me/56233399330',
    hours: 'Lun a Vie · 9:30 a 19:00 · Sáb 10:00 a 14:00',
    url: '/collections/all',
  },
  {
    city: 'Concepción',
    name: 'Sucursal Concepción',
    address: 'Av. Pedro de Valdivia 491, Concepción',
    phone: '+56 4 1212 1373',
    phoneHref: 'tel:+56412121373',
    whatsappHref: 'https://wa.me/56412121373',
    hours: 'Lun a Vie · 9:30 a 19:00 · Sáb 10:00 a 14:00',
    url: '/collections/all',
  },
  {
    city: 'La Serena',
    name: 'Sucursal La Serena',
    address: 'Av. Balmaceda 4225, La Serena',
    phone: '+56 2 2213 7355',
    phoneHref: 'tel:+56222137355',
    whatsappHref: 'https://wa.me/56222137355',
    hours: 'Lun a Vie · 9:30 a 19:00 · Sáb 10:00 a 14:00',
    url: '/collections/all',
  },
];
