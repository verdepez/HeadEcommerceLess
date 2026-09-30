# HeadEcommerceLess · Astro SSR Multi-CMS & 4x4 Off-Road Platform

Arquitectura **E-Commerce Headless** de ultra-alto rendimiento construida con **Astro (SSR/Hybrid) + TypeScript Estricto + Tailwind CSS + React Islands**, diseñada para alcanzar métricas **Core Web Vitals** óptimas (**LCP < 1.2s**, **INP < 200ms**, **CLS = 0**) y garantizar **migraciones de DNS con 0% de pérdida de posicionamiento orgánico (SEO)**.

## Características Principales

- **Patrón Adaptador Multi-CMS (`src/adapters/`)**: Conectores desacoplados para **Shopify Storefront GraphQL API**, **WooCommerce REST API v3** y **PrestaShop Webservice**.
- **Paridad de Enrutamiento 1:1 (`src/config/routing.config.ts`)**: Replicación exacta de esquemas de URL de origen, validación de canonicals y respuesta HTTP 404 estricta.
- **Buscador Técnico 3-en-1 (`OffroadSearchHub.tsx`)**: Filtro por Vehículo (Marca -> Modelo -> Año + *Mi Garage*), Medida de Neumático y Apernadura de Llanta (*Bolt Pattern*).
- **Calculadora Visual Interactiva de Neumáticos (`TireCalculatorWidget.tsx`)**: Comparador SVG a escala real entre medida OEM y Upgrade (métrica e imperial de flotación), ganancia real de despeje (+cm), variación de velocímetro y nivel de levante requerido.
- **Navegación Instantánea App-Like**: Integración nativa de **View Transitions API** y **Speculation Rules API**.
- **Script de Auditoría Pre-Migración DNS (`scripts/verify-slugs.ts`)**: Verificación concurrente de códigos HTTP y etiquetas canonical contra el sitemap de producción.

## Comandos

```bash
npm install
cp .env.example .env
npm run dev
npm run test:coverage
npm run audit:slugs
```
