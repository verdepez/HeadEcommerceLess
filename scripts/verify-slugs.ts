import { pathToFileURL } from 'node:url';

/**
 * Script de Auditoría SEO Pre-Migración DNS (scripts/verify-slugs.ts)
 *
 * Uso:
 *   LEGACY_SITEMAP_URL=https://dobletraccion.com/sitemap.xml \
 *   STAGING_BASE_URL=https://staging.dobletraccion.com \
 *   npm run audit:slugs
 */

export interface AuditResultItem {
  legacyUrl: string;
  stagingUrl: string;
  pathname: string;
  statusCode: number;
  redirectedTo?: string;
  expectedCanonicalPath: string;
  actualCanonicalPath?: string;
  canonicalMatch: boolean;
  latencyMs: number;
  status: 'OK' | 'REDIRECT_MISSING_OR_HOP' | 'CANONICAL_MISMATCH' | 'NOT_FOUND_404' | 'SERVER_ERROR';
  errorDetail?: string;
}

/**
 * Descarga un XML de Sitemap y extrae recursivamente todas las etiquetas <loc>,
 * soportando tanto <urlset> directos como <sitemapindex> anidados.
 */
export async function extractUrlsFromSitemap(
  sitemapUrl: string,
  visited = new Set<string>()
): Promise<string[]> {
  if (visited.has(sitemapUrl)) return [];
  visited.add(sitemapUrl);

  const response = await fetch(sitemapUrl, {
    headers: {
      'User-Agent': 'Headless-SEO-Migration-Auditor/1.0',
      Accept: 'application/xml, text/xml, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`No se pudo descargar el sitemap ${sitemapUrl}: HTTP ${response.status}`);
  }

  const xml = await response.text();
  const isSitemapIndex = /<sitemapindex[\s>]/i.test(xml);

  const locRegex = /<loc>\s*(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?\s*<\/loc>/gi;
  const extractedLocs: string[] = [];
  let match: RegExpExecArray | null;

  while ((match = locRegex.exec(xml)) !== null) {
    if (match[1]) {
      extractedLocs.push(match[1].trim());
    }
  }

  if (isSitemapIndex) {
    const nestedResults: string[] = [];
    for (const childSitemapUrl of extractedLocs) {
      const urls = await extractUrlsFromSitemap(childSitemapUrl, visited);
      nestedResults.push(...urls);
    }
    return nestedResults;
  }

  return extractedLocs;
}

/**
 * Extrae el pathname normalizado (sin barra final excepto raíz) para comparar paridad de canonicals.
 */
export function normalizePathname(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
      return parsed.pathname.replace(/\/+$/, '');
    }
    return parsed.pathname;
  } catch {
    return rawUrl;
  }
}

/**
 * Extrae el href del tag <link rel="canonical"> desde una respuesta HTML o cabecera HTTP Link.
 */
export function parseCanonicalFromResponse(
  headers: Headers,
  htmlBody?: string
): string | undefined {
  const linkHeader = headers.get('link');
  if (linkHeader) {
    const relCanonicalMatch = /<([^>]+)>;\s*rel=["']?canonical["']?/i.exec(linkHeader);
    if (relCanonicalMatch?.[1]) {
      return relCanonicalMatch[1].trim();
    }
  }

  if (htmlBody) {
    const linkTagMatch =
      /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["'][^>]*>/i.exec(htmlBody) ||
      /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["'][^>]*>/i.exec(htmlBody);
    if (linkTagMatch?.[1]) {
      return linkTagMatch[1].trim();
    }
  }

  return undefined;
}

/**
 * Audita una URL individual realizando primero una petición HEAD
 * y, si responde 200 sin cabecera HTTP Link canonical, verifica el <link rel="canonical"> del HTML.
 */
export async function auditSingleUrl(
  legacyUrl: string,
  stagingBaseUrl = (process.env.STAGING_BASE_URL || 'http://localhost:4321').replace(/\/+$/, ''),
  timeoutMs = Number(process.env.AUDIT_TIMEOUT_MS || '10000')
): Promise<AuditResultItem> {
  const parsedLegacy = new URL(legacyUrl);
  const expectedPath = normalizePathname(legacyUrl);
  const stagingUrl = `${stagingBaseUrl}${parsedLegacy.pathname}${parsedLegacy.search}`;
  const startTime = performance.now();

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const headResponse = await fetch(stagingUrl, {
      method: 'HEAD',
      redirect: 'manual',
      headers: {
        'User-Agent': 'Headless-SEO-Migration-Auditor/1.0',
      },
      signal: controller.signal,
    });

    const statusCode = headResponse.status;

    if (statusCode === 404) {
      return {
        legacyUrl,
        stagingUrl,
        pathname: parsedLegacy.pathname,
        statusCode,
        expectedCanonicalPath: expectedPath,
        canonicalMatch: false,
        latencyMs: Math.round(performance.now() - startTime),
        status: 'NOT_FOUND_404',
        errorDetail: 'El slug devuelve 404 en el entorno Staging Headless.',
      };
    }

    if (statusCode >= 500) {
      return {
        legacyUrl,
        stagingUrl,
        pathname: parsedLegacy.pathname,
        statusCode,
        expectedCanonicalPath: expectedPath,
        canonicalMatch: false,
        latencyMs: Math.round(performance.now() - startTime),
        status: 'SERVER_ERROR',
        errorDetail: `Error interno en Staging (HTTP ${statusCode}).`,
      };
    }

    if (statusCode >= 300 && statusCode < 400) {
      const location = headResponse.headers.get('location') || '';
      return {
        legacyUrl,
        stagingUrl,
        pathname: parsedLegacy.pathname,
        statusCode,
        redirectedTo: location,
        expectedCanonicalPath: expectedPath,
        canonicalMatch: false,
        latencyMs: Math.round(performance.now() - startTime),
        status: 'REDIRECT_MISSING_OR_HOP',
        errorDetail: `Redirección ${statusCode} hacia "${location}". Verifica si es intencional.`,
      };
    }

    let canonicalRaw = parseCanonicalFromResponse(headResponse.headers);

    if (!canonicalRaw && statusCode === 200) {
      const getResponse = await fetch(stagingUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Headless-SEO-Migration-Auditor/1.0',
          Accept: 'text/html',
        },
        signal: controller.signal,
      });
      const html = await getResponse.text();
      canonicalRaw = parseCanonicalFromResponse(getResponse.headers, html);
    }

    const actualCanonicalPath = canonicalRaw ? normalizePathname(canonicalRaw) : undefined;
    const canonicalMatch = Boolean(
      actualCanonicalPath && actualCanonicalPath === expectedPath
    );

    return {
      legacyUrl,
      stagingUrl,
      pathname: parsedLegacy.pathname,
      statusCode,
      expectedCanonicalPath: expectedPath,
      actualCanonicalPath,
      canonicalMatch,
      latencyMs: Math.round(performance.now() - startTime),
      status: canonicalMatch ? 'OK' : 'CANONICAL_MISMATCH',
      errorDetail: canonicalMatch
        ? undefined
        : `Canonical esperado "${expectedPath}", recibido "${actualCanonicalPath || 'NINGUNO'}".`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      legacyUrl,
      stagingUrl,
      pathname: parsedLegacy.pathname,
      statusCode: 0,
      expectedCanonicalPath: expectedPath,
      canonicalMatch: false,
      latencyMs: Math.round(performance.now() - startTime),
      status: 'SERVER_ERROR',
      errorDetail: `Excepción de red/timeout: ${message}`,
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Ejecuta un pool de workers concurrentes para no saturar el servidor Staging.
 */
export async function runConcurrentPool<T, R>(
  items: T[],
  concurrency: number,
  workerFn: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < items.length) {
      const index = currentIndex++;
      const item = items[index];
      if (item !== undefined) {
        results[index] = await workerFn(item, index);
      }
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

export async function runAuditCli(options?: {
  sitemapUrl?: string;
  stagingBaseUrl?: string;
  concurrency?: number;
}): Promise<{ ok: boolean; results: AuditResultItem[] }> {
  const sitemapUrl =
    options?.sitemapUrl ||
    process.env.LEGACY_SITEMAP_URL ||
    'https://dobletraccion.com/sitemap.xml';
  const stagingBaseUrl = (
    options?.stagingBaseUrl ||
    process.env.STAGING_BASE_URL ||
    'http://localhost:4321'
  ).replace(/\/+$/, '');
  const concurrency = Math.max(
    1,
    options?.concurrency || Number(process.env.AUDIT_CONCURRENCY || '15')
  );

  const urls = await extractUrlsFromSitemap(sitemapUrl);
  if (urls.length === 0) {
    return { ok: false, results: [] };
  }

  const results = await runConcurrentPool(urls, concurrency, (url) =>
    auditSingleUrl(url, stagingBaseUrl)
  );

  const hasErrors = results.some(
    (r) =>
      r.status === 'NOT_FOUND_404' ||
      r.status === 'CANONICAL_MISMATCH' ||
      r.status === 'SERVER_ERROR'
  );

  return { ok: !hasErrors, results };
}

const isMainModule =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  runAuditCli()
    .then(({ ok }) => {
      if (!ok) process.exit(1);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
