import type { APIRoute } from 'astro';
import { getEcommerceAdapter } from '../adapters';
import { buildValidatedCanonicalUrl } from '../config/routing.config';

export const prerender = false;

/**
 * Escapa caracteres reservados XML para prevenir corrupción del sitemap.
 */
function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generación dinámica en tiempo de ejecución de /sitemap.xml
 * Consulta el EcomAdapter activo y emite las URLs exactas con su etiqueta <lastmod>.
 */
export const GET: APIRoute = async ({ site, url }) => {
  const siteOrigin = (
    process.env.PUBLIC_SITE_URL ||
    site?.toString() ||
    url.origin
  ).replace(/\/+$/, '');

  const adapter = getEcommerceAdapter();
  const entries = await adapter.getAllSlugs();

  const urlNodes = [
    // Página principal siempre presente
    `  <url>
    <loc>${escapeXml(siteOrigin)}/</loc>
    <lastmod>${new Date().toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`,
    ...entries.map((entry) => {
      const loc = buildValidatedCanonicalUrl(siteOrigin, entry.path);
      const lastmod = entry.lastmod || new Date().toISOString();
      const changefreq = entry.changefreq ?? 'daily';
      const priority = (entry.priority ?? 0.8).toFixed(1);

      return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${escapeXml(lastmod)}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
    }),
  ].join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlNodes}
</urlset>`;

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=3600',
    },
  });
};
