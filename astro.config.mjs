import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import node from '@astrojs/node';
// import cloudflare from '@astrojs/cloudflare';

/**
 * Configuración Astro orientada a Core Web Vitals (LCP < 1.2s, INP < 200ms, CLS = 0)
 * - output: 'server' (con soporte híbrido mediante export const prerender = true)
 * - inlineStylesheets: 'always' elimina peticiones bloqueantes de CSS en el camino crítico
 */
export default defineConfig({
  site: process.env.PUBLIC_SITE_URL || 'https://dobletraccion.com',
  output: 'server',
  server: {
    host: true,
    port: Number(process.env.PORT) || 4321,
  },
  adapter: node({
    mode: 'standalone',
  }),
  // Para desplegar en Cloudflare Pages/Workers descomentar:
  // adapter: cloudflare({ imageService: 'cloudflare' }),
  integrations: [
    tailwind({
      applyBaseStyles: true,
    }),
    react(),
  ],
  build: {
    inlineStylesheets: 'always',
  },
  compressHTML: true,
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover',
  },
});
