import type { SupportedCMS } from '../adapters/types';

export type RouteEntityType = 'product' | 'category';

export interface ResolvedRouteMatch {
  cms: SupportedCMS;
  entityType: RouteEntityType;
  slug: string;
  id?: string;
  categorySlug?: string;
  /** Ruta normalizada solicitada */
  requestedPath: string;
}

export interface CMSRoutingRules {
  cms: SupportedCMS;
  trailingSlash: 'always' | 'never' | 'ignore';
  patterns: Array<{
    entityType: RouteEntityType;
    description: string;
    regex: RegExp;
    extract: (matches: RegExpExecArray) => {
      slug: string;
      id?: string;
      categorySlug?: string;
    };
  }>;
  builders: {
    product: (params: { slug: string; id?: string; categorySlug?: string }) => string;
    category: (params: { slug: string; id?: string }) => string;
  };
}

/**
 * Reglas centrales de paridad de URL para garantizar 0 redirecciones innecesarias
 * y conservación del 100% del link equity tras el cambio de DNS.
 */
export const ROUTING_CONFIG: Record<SupportedCMS, CMSRoutingRules> = {
  woocommerce: {
    cms: 'woocommerce',
    trailingSlash: 'never',
    patterns: [
      {
        entityType: 'product',
        description: 'Ficha de producto WooCommerce (/producto/:slug)',
        regex: /^\/producto\/([^/]+)\/?$/i,
        extract: (m) => ({ slug: decodeURIComponent(m[1]!) }),
      },
      {
        entityType: 'category',
        description: 'Categoría de producto WooCommerce (/categoria-producto/.../:cat)',
        regex: /^\/categoria-producto\/(?:([^/]+)\/)*([^/]+)\/?$/i,
        extract: (m) => ({
          categorySlug: m[1] ? decodeURIComponent(m[1]) : undefined,
          slug: decodeURIComponent(m[2]!),
        }),
      },
    ],
    builders: {
      product: ({ slug }) => `/producto/${encodeURIComponent(slug)}`,
      category: ({ slug }) => `/categoria-producto/${encodeURIComponent(slug)}`,
    },
  },

  shopify: {
    cms: 'shopify',
    trailingSlash: 'never',
    patterns: [
      {
        entityType: 'product',
        description: 'Producto anidado en colección Shopify (/collections/:cat/products/:slug)',
        regex: /^\/collections\/([^/]+)\/products\/([^/]+)\/?$/i,
        extract: (m) => ({
          categorySlug: decodeURIComponent(m[1]!),
          slug: decodeURIComponent(m[2]!),
        }),
      },
      {
        entityType: 'product',
        description: 'Producto canónico Shopify (/products/:slug)',
        regex: /^\/products\/([^/]+)\/?$/i,
        extract: (m) => ({ slug: decodeURIComponent(m[1]!) }),
      },
      {
        entityType: 'category',
        description: 'Colección Shopify (/collections/:cat o /collections/:cat/:tag)',
        regex: /^\/collections\/([^/]+)(?:\/([^/]+))?\/?$/i,
        extract: (m) => ({ slug: decodeURIComponent(m[1]!) }),
      },
    ],
    builders: {
      product: ({ slug }) => `/products/${encodeURIComponent(slug)}`,
      category: ({ slug }) => `/collections/${encodeURIComponent(slug)}`,
    },
  },

  prestashop: {
    cms: 'prestashop',
    trailingSlash: 'never',
    patterns: [
      {
        entityType: 'product',
        description: 'Producto PrestaShop con categoría e ID (/:cat/:id-:slug.html)',
        regex: /^\/([^/]+)\/(\d+)-([a-z0-9-_]+?)(?:-\d{13})?\.html$/i,
        extract: (m) => ({
          categorySlug: decodeURIComponent(m[1]!),
          id: m[2],
          slug: decodeURIComponent(m[3]!),
        }),
      },
      {
        entityType: 'product',
        description: 'Producto PrestaShop con ID en raíz (/:id-:slug.html)',
        regex: /^\/(\d+)-([a-z0-9-_]+?)(?:-\d{13})?\.html$/i,
        extract: (m) => ({
          id: m[1],
          slug: decodeURIComponent(m[2]!),
        }),
      },
      {
        entityType: 'product',
        description: 'Producto PrestaShop sin ID (/:slug.html)',
        regex: /^\/([a-z0-9-_]+)\.html$/i,
        extract: (m) => ({
          slug: decodeURIComponent(m[1]!),
        }),
      },
      {
        entityType: 'category',
        description: 'Categoría PrestaShop con prefijo de ID (/:id-:cat)',
        regex: /^\/(\d+)-([a-z0-9-_]+)\/?$/i,
        extract: (m) => ({
          id: m[1],
          slug: decodeURIComponent(m[2]!),
        }),
      },
    ],
    builders: {
      product: ({ id, slug }) => (id ? `/${id}-${slug}.html` : `/${slug}.html`),
      category: ({ id, slug }) => (id ? `/${id}-${slug}` : `/categoria/${slug}`),
    },
  },
};

/**
 * Evalúa un pathname entrante contra las expresiones regulares del CMS activo.
 * Retorna null si la ruta no corresponde a ningún patrón válido (disparando un 404 estricto).
 */
export function resolveCMSRoute(
  pathname: string,
  activeCms: SupportedCMS
): ResolvedRouteMatch | null {
  const normalizedPath = pathname.startsWith('/') ? pathname : `/${pathname}`;
  const cmsRules = ROUTING_CONFIG[activeCms];

  for (const rule of cmsRules.patterns) {
    const match = rule.regex.exec(normalizedPath);
    if (match) {
      const extracted = rule.extract(match);
      return {
        cms: activeCms,
        entityType: rule.entityType,
        slug: extracted.slug,
        id: extracted.id,
        categorySlug: extracted.categorySlug,
        requestedPath: normalizedPath,
      };
    }
  }

  return null;
}

/**
 * Construye una ruta relativa exacta respetando las reglas del CMS activo.
 */
export function buildEntityPath(
  entityType: RouteEntityType,
  params: { slug: string; id?: string; categorySlug?: string },
  activeCms: SupportedCMS
): string {
  const rules = ROUTING_CONFIG[activeCms];
  return entityType === 'product'
    ? rules.builders.product(params)
    : rules.builders.category(params);
}

/**
 * Normaliza y valida una URL canónica absoluta libre de parámetros de tracking (utm_*, fbclid, gclid).
 */
export function buildValidatedCanonicalUrl(siteOrigin: string, targetPathOrUrl: string): string {
  const cleanOrigin = siteOrigin.replace(/\/+$/, '');
  const rawUrl = targetPathOrUrl.startsWith('http')
    ? new URL(targetPathOrUrl)
    : new URL(
        targetPathOrUrl.startsWith('/') ? targetPathOrUrl : `/${targetPathOrUrl}`,
        cleanOrigin
      );

  // Eliminar cualquier query string de seguimiento o facetas no indexables
  rawUrl.search = '';
  rawUrl.hash = '';

  // Normalizar barra final (salvo la raíz "/")
  if (rawUrl.pathname.length > 1 && rawUrl.pathname.endsWith('/')) {
    rawUrl.pathname = rawUrl.pathname.replace(/\/+$/, '');
  }

  return rawUrl.toString();
}
