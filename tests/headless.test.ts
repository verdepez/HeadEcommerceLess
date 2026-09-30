import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatPrice,
  parseTireMeasure,
  compareTireMeasures,
} from '../src/utils/formatters';
import {
  ROUTING_CONFIG,
  resolveCMSRoute,
  buildEntityPath,
  buildValidatedCanonicalUrl,
} from '../src/config/routing.config';
import * as rootRouting from '../src/routing.config';
import {
  VEHICLE_DATABASE,
  WHEEL_BOLT_PATTERNS,
  POPULAR_TIRE_MEASURES,
  PROJECT_BRANDS,
  BRANCHES_4X4,
} from '../src/data/offroad-catalog';
import {
  WooCommerceAdapter,
  ShopifyAdapter,
  PrestaShopAdapter,
  getActiveCMS,
  getEcommerceAdapter,
} from '../src/adapters/index';
import { GET as getSitemapXml, prerender as sitemapPrerender } from '../src/pages/sitemap.xml';
import {
  extractUrlsFromSitemap,
  normalizePathname,
  parseCanonicalFromResponse,
  auditSingleUrl,
  runConcurrentPool,
  runAuditCli,
} from '../scripts/verify-slugs';

const originalFetch = globalThis.fetch;

describe('1. Utilidades Monetarias y Calculadora Geométrica 4x4 (src/utils/formatters.ts)', () => {
  it('formatea precios en CLP sin decimales y EUR/USD con decimales', () => {
    const clp = formatPrice(289900);
    assert.ok(clp.includes('289.900'));

    const eur = formatPrice(99.5, 'eur');
    assert.ok(eur.includes('99,50') || eur.includes('99.50'));
  });

  it('parsea medidas métricas e imperiales (flotación) y rechaza formatos inválidos', () => {
    const metric = parseTireMeasure(' 285/70R17 ');
    assert.ok(metric);
    assert.equal(metric.isFlotation, false);
    assert.equal(metric.raw, '285/70R17');
    assert.equal(metric.widthMm, 285);
    assert.equal(metric.aspectRatio, 70);
    assert.equal(metric.rimInches, 17);
    assert.equal(metric.diameterInches, 32.7);

    const flotation = parseTireMeasure('35x12.5R17');
    assert.ok(flotation);
    assert.equal(flotation.isFlotation, true);
    assert.equal(flotation.raw, '35x12.5R17');
    assert.equal(flotation.diameterInches, 35);
    assert.equal(flotation.widthInches, 12.5);
    assert.equal(flotation.rimInches, 17);

    assert.equal(parseTireMeasure('invalid-measure'), null);
  });

  it('compara medidas y recomienda OEM, LEVELING_2 o LIFT_3_PLUS según ganancia', () => {
    const oemComp = compareTireMeasures('265/70R17', '265/70R17');
    assert.ok(oemComp);
    assert.equal(oemComp.recommendedLift.level, 'OEM');
    assert.equal(oemComp.groundClearanceGainCm, 0);

    const levelingComp = compareTireMeasures('265/70R17', '285/70R17');
    assert.ok(levelingComp);
    assert.equal(levelingComp.recommendedLift.level, 'LEVELING_2');
    assert.ok(levelingComp.groundClearanceGainCm > 1);
    assert.ok(levelingComp.realSpeedAt100Kmh > 100);

    const liftComp = compareTireMeasures('265/70R17', '35x12.5R17');
    assert.ok(liftComp);
    assert.equal(liftComp.recommendedLift.level, 'LIFT_3_PLUS');
    assert.ok(liftComp.diameterDiffInches > 3);

    assert.equal(compareTireMeasures('265/70R17', 'bad'), null);
    assert.equal(compareTireMeasures('bad', '285/70R17'), null);
  });
});

describe('2. Catálogo Técnico Off-Road 4x4 (src/data/offroad-catalog.ts)', () => {
  it('exporta base de vehículos, apernaduras, medidas populares, marcas y sucursales', () => {
    assert.ok(VEHICLE_DATABASE.length >= 10);
    assert.ok(WHEEL_BOLT_PATTERNS.some((p) => p.label === '6X139'));
    assert.ok(POPULAR_TIRE_MEASURES.some((m) => m.measure === '285/70R17'));
    assert.ok(PROJECT_BRANDS.some((b) => b.name === 'TOYOTA'));
    assert.equal(BRANCHES_4X4.length, 3);
  });
});

describe('3. Motor de Paridad de Enrutamiento y Slugs (src/config/routing.config.ts)', () => {
  it('re-exporta las funciones desde src/routing.config.ts', () => {
    assert.equal(rootRouting.resolveCMSRoute, resolveCMSRoute);
    assert.equal(rootRouting.ROUTING_CONFIG, ROUTING_CONFIG);
  });

  it('resuelve rutas de WooCommerce, Shopify y PrestaShop con exactitud', () => {
    const wcProd = resolveCMSRoute('/producto/amortiguador-fox-2-0/', 'woocommerce');
    assert.deepEqual(wcProd, {
      cms: 'woocommerce',
      entityType: 'product',
      slug: 'amortiguador-fox-2-0',
      id: undefined,
      categorySlug: undefined,
      requestedPath: '/producto/amortiguador-fox-2-0/',
    });

    const wcCatNested = resolveCMSRoute('categoria-producto/suspension/amortiguadores', 'woocommerce');
    assert.equal(wcCatNested?.entityType, 'category');
    assert.equal(wcCatNested?.categorySlug, 'suspension');
    assert.equal(wcCatNested?.slug, 'amortiguadores');

    const wcCatSimple = resolveCMSRoute('/categoria-producto/neumaticos', 'woocommerce');
    assert.equal(wcCatSimple?.entityType, 'category');
    assert.equal(wcCatSimple?.categorySlug, undefined);
    assert.equal(wcCatSimple?.slug, 'neumaticos');

    const shopifyNested = resolveCMSRoute(
      '/collections/neumaticos/products/bfgoodrich-ko3-285-70r17',
      'shopify'
    );
    assert.equal(shopifyNested?.entityType, 'product');
    assert.equal(shopifyNested?.categorySlug, 'neumaticos');
    assert.equal(shopifyNested?.slug, 'bfgoodrich-ko3-285-70r17');

    const shopifyProd = resolveCMSRoute('/products/llanta-method-mr305', 'shopify');
    assert.equal(shopifyProd?.entityType, 'product');
    assert.equal(shopifyProd?.slug, 'llanta-method-mr305');

    const shopifyCol = resolveCMSRoute('/collections/kit-de-suspension/0-2', 'shopify');
    assert.equal(shopifyCol?.entityType, 'category');
    assert.equal(shopifyCol?.slug, 'kit-de-suspension');

    const psCatProd = resolveCMSRoute('/llantas/45-method-beadgrip-8412345678901.html', 'prestashop');
    assert.equal(psCatProd?.entityType, 'product');
    assert.equal(psCatProd?.categorySlug, 'llantas');
    assert.equal(psCatProd?.id, '45');
    assert.equal(psCatProd?.slug, 'method-beadgrip');

    const psRootIdProd = resolveCMSRoute('/12-winche-warn-vr-evo.html', 'prestashop');
    assert.equal(psRootIdProd?.entityType, 'product');
    assert.equal(psRootIdProd?.id, '12');
    assert.equal(psRootIdProd?.slug, 'winche-warn-vr-evo');

    const psSimpleProd = resolveCMSRoute('/snorkel-safari-hilux.html', 'prestashop');
    assert.equal(psSimpleProd?.entityType, 'product');
    assert.equal(psSimpleProd?.id, undefined);
    assert.equal(psSimpleProd?.slug, 'snorkel-safari-hilux');

    const psCat = resolveCMSRoute('/18-accesorios-4x4', 'prestashop');
    assert.equal(psCat?.entityType, 'category');
    assert.equal(psCat?.id, '18');
    assert.equal(psCat?.slug, 'accesorios-4x4');

    assert.equal(resolveCMSRoute('/ruta/desconocida/xyz', 'shopify'), null);
  });

  it('construye rutas relativas por CMS y valida canonicals absolutos sin parámetros basura', () => {
    assert.equal(buildEntityPath('product', { slug: 'ko2' }, 'woocommerce'), '/producto/ko2');
    assert.equal(
      buildEntityPath('category', { slug: 'llantas' }, 'woocommerce'),
      '/categoria-producto/llantas'
    );
    assert.equal(buildEntityPath('product', { slug: 'ko2' }, 'shopify'), '/products/ko2');
    assert.equal(buildEntityPath('category', { slug: 'llantas' }, 'shopify'), '/collections/llantas');
    assert.equal(
      buildEntityPath('product', { id: '9', slug: 'ko2' }, 'prestashop'),
      '/9-ko2.html'
    );
    assert.equal(buildEntityPath('product', { slug: 'ko2' }, 'prestashop'), '/ko2.html');
    assert.equal(
      buildEntityPath('category', { id: '3', slug: 'llantas' }, 'prestashop'),
      '/3-llantas'
    );
    assert.equal(
      buildEntityPath('category', { slug: 'llantas' }, 'prestashop'),
      '/categoria/llantas'
    );

    assert.equal(
      buildValidatedCanonicalUrl(
        'https://dobletraccion.com/',
        '/products/fox-2-0/?utm_source=ig&fbclid=123#top'
      ),
      'https://dobletraccion.com/products/fox-2-0'
    );
    assert.equal(
      buildValidatedCanonicalUrl('https://dobletraccion.com', 'products/fox-2-0'),
      'https://dobletraccion.com/products/fox-2-0'
    );
    assert.equal(
      buildValidatedCanonicalUrl('https://dobletraccion.com', '/'),
      'https://dobletraccion.com/'
    );
    assert.equal(
      buildValidatedCanonicalUrl(
        'https://dobletraccion.com',
        'https://dobletraccion.com/collections/all/?page=2'
      ),
      'https://dobletraccion.com/collections/all'
    );
  });
});

describe('4. Patrón Adaptador Multi-CMS (WooCommerce, Shopify, PrestaShop y Factory)', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('WooCommerceAdapter: mapea productos variables, simples, categorías, sitemap y maneja errores', async () => {
    const wc = new WooCommerceAdapter({
      baseUrl: 'https://wc.example.com/',
      consumerKey: 'ck_123',
      consumerSecret: 'cs_456',
    });

    const sampleProduct = {
      id: 101,
      name: 'Amortiguador Fox 2.5 Factory',
      slug: 'amortiguador-fox-2-5',
      permalink: 'https://wc.example.com/producto/amortiguador-fox-2-5',
      date_modified_gmt: '2025-02-10T12:00:00',
      type: 'variable',
      status: 'publish',
      description: '<p>Descripción completa <strong>Fox</strong></p>',
      short_description: '<p>Resumen corto</p>',
      sku: 'FOX-25',
      price: '890000',
      regular_price: '990000',
      sale_price: '890000',
      stock_status: 'instock',
      stock_quantity: 6,
      average_rating: '0',
      rating_count: 14,
      categories: [{ id: 10, name: 'Suspensión', slug: 'suspension' }],
      images: [{ id: 50, src: 'https://wc.example.com/fox.jpg', alt: '', name: 'fox' }],
      attributes: [
        { id: 1, name: 'Levante', options: ['2 pulgadas', '3 pulgadas'], visible: true },
        { id: 2, name: 'Oculto', option: 'No', visible: false },
        { id: 3, name: 'Vacio', option: '', visible: true },
      ],
      meta_data: [
        { id: 1, key: '_headless_template', value: 'minimal' },
        { id: 2, key: 'brand', value: 'FOX' },
        { id: 3, key: '_ean', value: '1234567890123' },
      ],
      yoast_head_json: {
        title: 'Fox 2.5 SEO Title',
        description: 'Fox 2.5 SEO Desc',
        robots: { index: 'noindex', follow: 'nofollow' },
      },
    };

    const sampleVariations = [
      {
        id: 201,
        sku: '',
        price: '890000',
        regular_price: '990000',
        stock_status: 'onbackorder',
        stock_quantity: null,
        image: { id: 51, src: 'https://wc.example.com/fox-var.jpg', alt: '', name: 'var' },
        attributes: [{ id: 1, name: 'Levante', option: '2 pulgadas' }],
      },
      {
        id: 202,
        sku: 'FOX-25-3',
        price: '',
        regular_price: '',
        stock_status: 'outofstock',
        stock_quantity: 0,
        image: undefined,
        attributes: [],
      },
    ];

    let failVariationsOnce = false;

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/variations')) {
        if (failVariationsOnce) {
          throw new Error('Variation endpoint timeout');
        }
        return new Response(JSON.stringify(sampleVariations), { status: 200 });
      }
      if (url.includes('/products/categories')) {
        if (url.includes('slug=empty-cat')) {
          return new Response(JSON.stringify([]), { status: 200 });
        }
        if (url.includes('slug=no-img-cat')) {
          return new Response(
            JSON.stringify([
              {
                id: 11,
                name: 'Sin Imagen',
                slug: 'no-img-cat',
                description: '',
                image: null,
              },
            ]),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify([
            {
              id: 10,
              name: 'Suspensión',
              slug: 'suspension',
              description: '<p>Categoría suspensión</p>',
              image: { id: 9, src: 'https://wc.example.com/cat.jpg', alt: 'AltCat', name: 'cat' },
              count: 1,
            },
          ]),
          { status: 200 }
        );
      }
      if (url.includes('slug=simple-out')) {
        return new Response(
          JSON.stringify([
            {
              ...sampleProduct,
              id: 102,
              type: 'simple',
              sku: '',
              price: '',
              regular_price: '',
              short_description: '',
              stock_status: 'outofstock',
              stock_quantity: null,
              rating_count: 0,
              images: [],
              categories: [],
              attributes: [{ id: 3, name: 'Material', option: 'Aluminio', visible: true }],
              meta_data: [],
              yoast_head_json: undefined,
              date_modified_gmt: '',
            },
          ]),
          { status: 200 }
        );
      }
      if (url.includes('slug=not-found')) {
        return new Response(JSON.stringify([]), { status: 200 });
      }
      return new Response(JSON.stringify([sampleProduct]), { status: 200 });
    };

    const prod = await wc.getProductBySlug({ slug: 'amortiguador-fox-2-5' });
    assert.ok(prod);
    assert.equal(prod.template, 'minimal');
    assert.equal(prod.brand, 'FOX');
    assert.equal(prod.gtin, '1234567890123');
    assert.equal(prod.variants[0]?.stockStatus, 'BACKORDER');
    assert.equal(prod.variants[1]?.stockStatus, 'OUT_OF_STOCK');
    assert.equal(prod.rating?.ratingValue, 5);
    assert.equal(prod.seo.robots?.index, false);

    // Probar fallo aislado de variaciones en producto variable
    failVariationsOnce = true;
    const prodVarFallback = await wc.getProductBySlug({ slug: 'amortiguador-fox-2-5' });
    assert.ok(prodVarFallback);
    assert.equal(prodVarFallback.variants.length, 1);
    failVariationsOnce = false;

    const simpleProd = await wc.getProductBySlug({ slug: 'simple-out' });
    assert.ok(simpleProd);
    assert.equal(simpleProd.stockStatus, 'OUT_OF_STOCK');
    assert.equal(simpleProd.images[0]?.id, 'placeholder');
    assert.equal(simpleProd.template, 'default');

    assert.equal(await wc.getProductBySlug({ slug: 'not-found' }), null);

    const cat = await wc.getCategoryBySlug({ slug: 'suspension' });
    assert.ok(cat);
    assert.equal(cat.slug, 'suspension');
    assert.equal(cat.products.length, 1);

    const catNoImg = await wc.getCategoryBySlug({ slug: 'no-img-cat' });
    assert.ok(catNoImg);
    assert.equal(catNoImg.image, undefined);

    assert.equal(await wc.getCategoryBySlug({ slug: 'empty-cat' }), null);

    const slugs = await wc.getAllSlugs();
    assert.equal(slugs.length, 2);

    // Simular timeout de AbortController reduciendo timeoutMs
    (wc as unknown as { timeoutMs: number }).timeoutMs = 1;
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    assert.equal(await wc.getProductBySlug({ slug: 'timeout' }), null);
    (wc as unknown as { timeoutMs: number }).timeoutMs = 8000;

    // Simular error HTTP 500
    globalThis.fetch = async () => new Response('Error', { status: 500, statusText: 'Internal' });
    assert.equal(await wc.getCategoryBySlug({ slug: 'err' }), null);
    assert.deepEqual(await wc.getAllSlugs(), []);
  });

  it('ShopifyAdapter: mapea productos, colecciones, destacados, sitemap y errores GraphQL', async () => {
    const shopify = new ShopifyAdapter({
      storeDomain: 'https://3c090e.myshopify.com/',
      storefrontToken: '50b0395da9fee95afce261a4d66c5125',
    });

    const mockShopifyProduct = {
      id: 'gid://shopify/Product/1',
      handle: 'bfgoodrich-ko3-285-70r17',
      title: 'Neumático BFGoodrich All-Terrain KO3 285/70R17',
      description: 'El nuevo neumático todoterreno KO3.',
      descriptionHtml: '<p>El nuevo neumático todoterreno KO3.</p>',
      vendor: 'BFGoodrich',
      productType: 'Neumáticos',
      updatedAt: '2025-02-15T10:00:00Z',
      availableForSale: true,
      tags: ['template:minimal'],
      seo: { title: null, description: null },
      templateMetafield: null,
      specsMetafield: { value: JSON.stringify({ Medida: '285/70R17', Aro: '17"' }) },
      images: {
        edges: [
          {
            node: {
              id: 'img1',
              url: 'https://cdn.shopify.com/s/files/1/ko3.jpg?v=1',
              altText: null,
              width: null,
              height: null,
            },
          },
        ],
      },
      variants: {
        edges: [
          {
            node: {
              id: 'gid://shopify/ProductVariant/99',
              sku: null,
              title: '285/70R17',
              availableForSale: true,
              quantityAvailable: 8,
              barcode: '0123456789',
              price: { amount: '319900', currencyCode: 'CLP' },
              compareAtPrice: { amount: '359900', currencyCode: 'CLP' },
              selectedOptions: [
                { name: 'Medida', value: '285/70R17' },
                { name: 'Title', value: 'Default Title' },
              ],
              image: {
                id: 'img1',
                url: 'https://external.com/ko3.jpg',
                altText: null,
                width: null,
                height: null,
              },
            },
          },
        ],
      },
      collections: {
        edges: [{ node: { id: 'col1', handle: 'neumaticos', title: 'Neumáticos' } }],
      },
    };

    globalThis.fetch = async (_input, init) => {
      const body = JSON.parse(String(init?.body || '{}'));
      const query: string = body.query || '';

      if (query.includes('GetProductByHandle')) {
        if (body.variables?.handle === 'missing') {
          return new Response(JSON.stringify({ data: { product: null } }), { status: 200 });
        }
        return new Response(JSON.stringify({ data: { product: mockShopifyProduct } }), {
          status: 200,
        });
      }

      if (query.includes('GetCollectionByHandle')) {
        if (body.variables?.handle === 'missing') {
          return new Response(JSON.stringify({ data: { collection: null } }), { status: 200 });
        }
        if (body.variables?.handle === 'no-img') {
          return new Response(
            JSON.stringify({
              data: {
                collection: {
                  id: 'col2',
                  handle: 'no-img',
                  title: 'Colección Sin Imagen',
                  description: 'Desc',
                  descriptionHtml: '<p>Desc</p>',
                  updatedAt: '2025-02-15T10:00:00Z',
                  image: null,
                  seo: { title: 'Custom SEO', description: 'Custom Desc' },
                  products: { edges: [] },
                },
              },
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            data: {
              collection: {
                id: 'col1',
                handle: 'neumaticos',
                title: 'Neumáticos 4x4',
                description: 'Colección de neumáticos',
                descriptionHtml: '<p>Colección de neumáticos</p>',
                updatedAt: '2025-02-15T10:00:00Z',
                image: {
                  id: 'cimg',
                  url: 'https://example.com/banner.jpg',
                  altText: null,
                  width: null,
                  height: null,
                },
                seo: { title: null, description: null },
                products: {
                  edges: [
                    {
                      node: {
                        ...mockShopifyProduct,
                        vendor: '',
                        productType: '',
                        availableForSale: false,
                        tags: [],
                        templateMetafield: { value: 'minimal' },
                        seo: { title: 'SEO Title', description: 'SEO Desc' },
                        images: { edges: [] },
                        variants: {
                          edges: [
                            {
                              node: {
                                id: 'v2',
                                sku: 'SKU-2',
                                title: 'Default',
                                availableForSale: false,
                                quantityAvailable: null,
                                barcode: null,
                                price: { amount: '0', currencyCode: '' },
                                compareAtPrice: null,
                                selectedOptions: [],
                                image: {
                                  id: 'img2',
                                  url: 'https://cdn.shopify.com/s/files/1/ko3-clean.jpg',
                                  altText: 'Clean',
                                  width: 800,
                                  height: 800,
                                },
                              },
                            },
                          ],
                        },
                        collections: { edges: [] },
                        specsMetafield: { value: 'invalid-json' },
                      },
                    },
                    {
                      node: {
                        ...mockShopifyProduct,
                        id: 'gid://shopify/Product/3',
                        tags: [],
                        variants: { edges: [] },
                      },
                    },
                  ],
                },
              },
            },
          }),
          { status: 200 }
        );
      }

      if (query.includes('GetSitemapEntries')) {
        return new Response(
          JSON.stringify({
            data: {
              products: {
                edges: [{ node: { handle: 'bfgoodrich-ko3-285-70r17', updatedAt: '2025-02-15T10:00:00Z' } }],
              },
              collections: {
                edges: [{ node: { handle: 'neumaticos', updatedAt: '2025-02-15T10:00:00Z' } }],
              },
            },
          }),
          { status: 200 }
        );
      }

      if (query.includes('GetFeaturedProducts')) {
        return new Response(
          JSON.stringify({
            data: {
              products: { edges: [{ node: mockShopifyProduct }] },
            },
          }),
          { status: 200 }
        );
      }

      return new Response(JSON.stringify({ data: {} }), { status: 200 });
    };

    const prod = await shopify.getProductBySlug({
      slug: 'bfgoodrich-ko3-285-70r17',
      categorySlug: 'neumaticos',
    });
    assert.ok(prod);
    assert.equal(prod.seo.canonicalUrl, '/products/bfgoodrich-ko3-285-70r17');
    assert.equal(prod.template, 'minimal');
    assert.ok(prod.images[0]?.srcset?.includes('format=webp'));
    assert.equal(prod.variants[0]?.sku, '99');
    assert.equal(prod.variants[0]?.image?.srcset, '');
    assert.equal(prod.specifications.length, 4);

    assert.equal(await shopify.getProductBySlug({ slug: 'missing' }), null);

    const col = await shopify.getCategoryBySlug({ slug: 'neumaticos' });
    assert.ok(col);
    assert.equal(col.products.length, 2);
    assert.equal(col.products[0]?.images[0]?.id, 'placeholder');

    const colNoImg = await shopify.getCategoryBySlug({ slug: 'no-img' });
    assert.ok(colNoImg);
    assert.equal(colNoImg.image, undefined);

    assert.equal(await shopify.getCategoryBySlug({ slug: 'missing' }), null);

    const slugs = await shopify.getAllSlugs();
    assert.equal(slugs.length, 2);

    const featured = await shopify.getFeaturedProducts();
    assert.equal(featured.length, 1);

    // Simular AbortController timeout
    (shopify as unknown as { timeoutMs: number }).timeoutMs = 1;
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    assert.equal(await shopify.getProductBySlug({ slug: 'timeout' }), null);
    (shopify as unknown as { timeoutMs: number }).timeoutMs = 8000;

    // Probar errores GraphQL y sin data
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ errors: [{ message: 'Token inválido' }] }), { status: 200 });
    assert.equal(await shopify.getProductBySlug({ slug: 'err' }), null);

    globalThis.fetch = async () => new Response(JSON.stringify({}), { status: 200 });
    assert.equal(await shopify.getCategoryBySlug({ slug: 'err' }), null);

    globalThis.fetch = async () => new Response('Bad Gateway', { status: 502 });
    assert.deepEqual(await shopify.getAllSlugs(), []);
    assert.deepEqual(await shopify.getFeaturedProducts(4), []);
  });

  it('PrestaShopAdapter: soporta campos multi-idioma, productos por ID/slug, categorías y sitemap', async () => {
    const ps = new PrestaShopAdapter({
      baseUrl: 'https://ps.example.com/',
      wsKey: 'WS_KEY_123',
    });

    const samplePSProduct = {
      id: 45,
      id_category_default: 18,
      id_default_image: 88,
      reference: 'WARN-12000',
      ean13: '4001234567890',
      manufacturer_name: 'WARN',
      price: '750000',
      active: '1',
      date_upd: '2025-02-10 10:00:00',
      name: [{ id: '2', value: 'Winche Warn VR EVO 12-S' }],
      description: '<p>Winche sintético 12.000 lbs</p>',
      description_short: [{ id: '1', value: '<p>Cuerda sintética Spydura</p>' }],
      link_rewrite: [{ id: '1', value: 'winche-warn-vr-evo' }],
      meta_title: [] as unknown as string,
      meta_description: 123 as unknown as string,
      associations: {
        categories: [{ id: 18 }],
      },
    };

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('/api/products/45')) {
        return new Response(JSON.stringify({ product: samplePSProduct }), { status: 200 });
      }
      if (url.includes('/api/products/48')) {
        return new Response(
          JSON.stringify({
            products: [
              {
                ...samplePSProduct,
                id: 48,
                reference: '',
                ean13: '',
                manufacturer_name: '',
                price: '',
                date_upd: '',
                description_short: '',
                meta_title: 'Custom Meta',
                meta_description: 'Custom Desc',
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes('/api/products/99')) {
        return new Response(JSON.stringify({ product: { ...samplePSProduct, active: '0' } }), {
          status: 200,
        });
      }
      if (url.includes('/api/categories')) {
        if (url.includes('missing')) {
          return new Response(JSON.stringify({}), { status: 200 });
        }
        if (url.includes('empty-fields')) {
          return new Response(
            JSON.stringify({
              categories: [
                {
                  id: 19,
                  active: 1,
                  date_upd: '2025-02-10 10:00:00',
                  name: '',
                  description: '',
                  link_rewrite: '',
                  meta_title: 'Title',
                  meta_description: 'Desc',
                },
              ],
            }),
            { status: 200 }
          );
        }
        return new Response(
          JSON.stringify({
            categories: [
              {
                id: 1,
                active: 1,
                date_upd: '',
                name: 'Root',
                description: '',
                link_rewrite: 'root',
                meta_title: '',
                meta_description: '',
              },
              {
                id: 18,
                active: 1,
                date_upd: '2025-02-10 10:00:00',
                name: [{ id: '1', value: 'Rescate y Winches' }],
                description: '<p>Todo en rescate 4x4</p>',
                link_rewrite: [{ id: '1', value: 'rescate-winches' }],
                meta_title: '',
                meta_description: '',
              },
            ],
          }),
          { status: 200 }
        );
      }
      if (url.includes('id_category_default=%5B19%5D')) {
        return new Response(JSON.stringify({}), { status: 200 });
      }
      return new Response(
        JSON.stringify({
          products: [
            {
              ...samplePSProduct,
              id: 46,
              id_default_image: undefined,
              date_upd: '',
              associations: { images: [{ id: 90 }], categories: [] },
            },
            {
              ...samplePSProduct,
              id: 47,
              id_default_image: undefined,
              associations: undefined,
            },
          ],
        }),
        { status: 200 }
      );
    };

    const prodById = await ps.getProductBySlug({ id: '45', slug: 'winche-warn-vr-evo' });
    assert.ok(prodById);
    assert.equal(prodById.title, 'Winche Warn VR EVO 12-S');
    assert.equal(prodById.images[0]?.id, '88');

    const prodByIdList = await ps.getProductBySlug({ id: '48', slug: 'winche-warn-vr-evo' });
    assert.ok(prodByIdList);
    assert.equal(prodByIdList.sku, 'PS-48');

    const prodBySlug = await ps.getProductBySlug({ slug: 'winche-warn-vr-evo' });
    assert.ok(prodBySlug);
    assert.equal(prodBySlug.images[0]?.id, '90');

    assert.equal(await ps.getProductBySlug({ id: '99', slug: 'inactive' }), null);

    const catById = await ps.getCategoryBySlug({ id: '18', slug: 'rescate-winches' });
    assert.ok(catById);
    assert.equal(catById.products.length, 2);

    const catBySlug = await ps.getCategoryBySlug({ slug: 'rescate-winches' });
    assert.ok(catBySlug);

    const catEmptyFields = await ps.getCategoryBySlug({ slug: 'empty-fields' });
    assert.ok(catEmptyFields);
    assert.equal(catEmptyFields.slug, 'empty-fields');

    assert.equal(await ps.getCategoryBySlug({ slug: 'missing' }), null);

    const slugs = await ps.getAllSlugs();
    assert.equal(slugs.length, 3);

    // Simular AbortController timeout
    (ps as unknown as { timeoutMs: number }).timeoutMs = 1;
    globalThis.fetch = (_input, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')));
      });
    assert.equal(await ps.getProductBySlug({ slug: 'timeout' }), null);
    (ps as unknown as { timeoutMs: number }).timeoutMs = 8000;

    globalThis.fetch = async () => new Response('Error', { status: 500 });
    assert.equal(await ps.getCategoryBySlug({ slug: 'err' }), null);
    assert.deepEqual(await ps.getAllSlugs(), []);
  });

  it('Factory index.ts: instancia WooCommerce, Shopify y PrestaShop según entorno o parámetro', () => {
    process.env.ACTIVE_ECOMMERCE = 'shopify';
    assert.equal(getActiveCMS(), 'shopify');
    const s1 = getEcommerceAdapter();
    const s2 = getEcommerceAdapter();
    assert.equal(s1, s2);
    assert.equal(s1.provider, 'shopify');

    const wc = getEcommerceAdapter('woocommerce');
    assert.equal(wc.provider, 'woocommerce');

    const ps = getEcommerceAdapter('prestashop');
    assert.equal(ps.provider, 'prestashop');

    process.env.ACTIVE_ECOMMERCE = 'unknown_cms';
    assert.equal(getActiveCMS(), 'shopify');
    process.env.ACTIVE_ECOMMERCE = 'shopify';
  });
});

describe('5. Generador Dinámico de Sitemap XML (src/pages/sitemap.xml.ts)', () => {
  afterEach(() => {
    globalThis.fetch = originalFetch;
    delete process.env.PUBLIC_SITE_URL;
  });

  it('genera XML válido con escapado de entidades y cabeceras de caché', async () => {
    assert.equal(sitemapPrerender, false);
    process.env.ACTIVE_ECOMMERCE = 'shopify';
    delete process.env.PUBLIC_SITE_URL;

    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          data: {
            products: {
              edges: [{ node: { handle: 'amortiguador-fox-2-0', updatedAt: '' } }],
            },
            collections: {
              edges: [{ node: { handle: 'neumaticos', updatedAt: '2025-02-15T00:00:00Z' } }],
            },
          },
        }),
        { status: 200 }
      );

    getEcommerceAdapter('shopify');

    const response = await getSitemapXml({
      site: undefined,
      url: new URL('https://dobletraccion.com/sitemap.xml'),
    } as unknown as Parameters<typeof getSitemapXml>[0]);

    assert.equal(response.status, 200);
    assert.ok(response.headers.get('Content-Type')?.includes('application/xml'));
    const xml = await response.text();
    assert.ok(xml.includes('<loc>https://dobletraccion.com/products/amortiguador-fox-2-0</loc>'));
    assert.ok(xml.includes('<loc>https://dobletraccion.com/collections/neumaticos</loc>'));

    process.env.PUBLIC_SITE_URL = 'https://www.4x4.cl/';
    const responseEnv = await getSitemapXml({
      site: new URL('https://dobletraccion.com'),
      url: new URL('https://dobletraccion.com/sitemap.xml'),
    } as unknown as Parameters<typeof getSitemapXml>[0]);
    const xmlEnv = await responseEnv.text();
    assert.ok(xmlEnv.includes('<loc>https://www.4x4.cl/products/amortiguador-fox-2-0</loc>'));
  });
});

describe('6. Script de Auditoría SEO Pre-Migración DNS (scripts/verify-slugs.ts)', () => {
  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('extrae URLs recursivamente desde <sitemapindex> y <urlset> evitando ciclos', async () => {
    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/sitemap.xml')) {
        return new Response(
          `<sitemapindex>
            <sitemap><loc>https://dobletraccion.com/sitemap_products_1.xml</loc></sitemap>
            <sitemap><loc>https://dobletraccion.com/sitemap.xml</loc></sitemap>
          </sitemapindex>`,
          { status: 200 }
        );
      }
      if (url.endsWith('/sitemap_products_1.xml')) {
        return new Response(
          `<urlset>
            <url><loc><![CDATA[https://dobletraccion.com/products/fox-2-0]]></loc></url>
            <url><loc>https://dobletraccion.com/collections/neumaticos</loc></url>
          </urlset>`,
          { status: 200 }
        );
      }
      return new Response('Not Found', { status: 404 });
    };

    const urls = await extractUrlsFromSitemap('https://dobletraccion.com/sitemap.xml');
    assert.deepEqual(urls, [
      'https://dobletraccion.com/products/fox-2-0',
      'https://dobletraccion.com/collections/neumaticos',
    ]);

    await assert.rejects(
      () => extractUrlsFromSitemap('https://dobletraccion.com/missing.xml'),
      /HTTP 404/
    );
  });

  it('normaliza pathnames y extrae canonical desde cabecera Link o HTML <link rel="canonical">', () => {
    assert.equal(normalizePathname('https://dobletraccion.com/products/ko3/'), '/products/ko3');
    assert.equal(normalizePathname('https://dobletraccion.com/'), '/');
    assert.equal(normalizePathname('/relative-path'), '/relative-path');

    const headersWithLink = new Headers({
      Link: '<https://staging.dobletraccion.com/products/ko3>; rel="canonical"',
    });
    assert.equal(
      parseCanonicalFromResponse(headersWithLink),
      'https://staging.dobletraccion.com/products/ko3'
    );

    const headersNonCanonicalLink = new Headers({
      Link: '<https://staging.dobletraccion.com/style.css>; rel="preload"',
    });
    assert.equal(parseCanonicalFromResponse(headersNonCanonicalLink), undefined);

    const emptyHeaders = new Headers();
    assert.equal(
      parseCanonicalFromResponse(
        emptyHeaders,
        '<html><head><link rel="canonical" href="https://staging.dobletraccion.com/products/ko3"></head></html>'
      ),
      'https://staging.dobletraccion.com/products/ko3'
    );
    assert.equal(
      parseCanonicalFromResponse(
        emptyHeaders,
        '<html><head><link href="https://staging.dobletraccion.com/products/ko2" rel="canonical" /></head></html>'
      ),
      'https://staging.dobletraccion.com/products/ko2'
    );
    assert.equal(parseCanonicalFromResponse(emptyHeaders, '<html></html>'), undefined);
  });

  it('audita respuestas 200 OK, canonical mismatch, 301 redirect, 404, 500, timeout y errores de red', async () => {
    globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.endsWith('/products/ok-link')) {
        return new Response(null, {
          status: 200,
          headers: { Link: '<https://staging.test/products/ok-link>; rel="canonical"' },
        });
      }
      if (url.endsWith('/products/ok-html')) {
        if (init?.method === 'HEAD') return new Response(null, { status: 200 });
        return new Response(
          '<link rel="canonical" href="https://staging.test/products/ok-html">',
          { status: 200 }
        );
      }
      if (url.endsWith('/products/mismatch')) {
        return new Response(null, {
          status: 200,
          headers: { Link: '<https://staging.test/products/other>; rel="canonical"' },
        });
      }
      if (url.endsWith('/products/no-canonical')) {
        return new Response('<html></html>', { status: 200 });
      }
      if (url.endsWith('/products/redirect')) {
        return new Response(null, {
          status: 301,
          headers: { Location: '/products/new-slug' },
        });
      }
      if (url.endsWith('/products/missing')) {
        return new Response(null, { status: 404 });
      }
      if (url.endsWith('/products/error500')) {
        return new Response(null, { status: 503 });
      }
      if (url.endsWith('/products/timeout')) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject('TimeoutAbortString'));
        });
      }
      throw new Error('ECONNREFUSED');
    };

    const okLink = await auditSingleUrl('https://dobletraccion.com/products/ok-link');
    assert.equal(okLink.status, 'OK');

    const okHtml = await auditSingleUrl('https://dobletraccion.com/products/ok-html', 'https://staging.test');
    assert.equal(okHtml.status, 'OK');

    const mismatch = await auditSingleUrl('https://dobletraccion.com/products/mismatch', 'https://staging.test');
    assert.equal(mismatch.status, 'CANONICAL_MISMATCH');

    const noCanonical = await auditSingleUrl('https://dobletraccion.com/products/no-canonical', 'https://staging.test');
    assert.equal(noCanonical.status, 'CANONICAL_MISMATCH');

    const redir = await auditSingleUrl('https://dobletraccion.com/products/redirect', 'https://staging.test');
    assert.equal(redir.status, 'REDIRECT_MISSING_OR_HOP');
    assert.equal(redir.redirectedTo, '/products/new-slug');

    const notFound = await auditSingleUrl('https://dobletraccion.com/products/missing', 'https://staging.test');
    assert.equal(notFound.status, 'NOT_FOUND_404');

    const err500 = await auditSingleUrl('https://dobletraccion.com/products/error500', 'https://staging.test');
    assert.equal(err500.status, 'SERVER_ERROR');

    const timeoutRes = await auditSingleUrl('https://dobletraccion.com/products/timeout', 'https://staging.test', 1);
    assert.equal(timeoutRes.status, 'SERVER_ERROR');

    const netErr = await auditSingleUrl('https://dobletraccion.com/products/netfail', 'https://staging.test');
    assert.equal(netErr.status, 'SERVER_ERROR');
    assert.ok(netErr.errorDetail?.includes('ECONNREFUSED'));
  });

  it('ejecuta runConcurrentPool y runAuditCli de extremo a extremo', async () => {
    const poolRes = await runConcurrentPool([1, 2, 3, 4], 2, async (n) => n * 10);
    assert.deepEqual(poolRes, [10, 20, 30, 40]);

    globalThis.fetch = async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.endsWith('/sitemap.xml')) {
        return new Response(
          `<urlset><url><loc>https://dobletraccion.com/products/fox</loc></url></urlset>`,
          { status: 200 }
        );
      }
      if (url.endsWith('/empty.xml')) {
        return new Response(`<urlset></urlset>`, { status: 200 });
      }
      return new Response(null, {
        status: 200,
        headers: { Link: '<https://staging.test/products/fox>; rel="canonical"' },
      });
    };

    const cliOk = await runAuditCli();
    assert.equal(cliOk.ok, true);
    assert.equal(cliOk.results.length, 1);

    const cliEmpty = await runAuditCli({
      sitemapUrl: 'https://dobletraccion.com/empty.xml',
      stagingBaseUrl: 'https://staging.test',
    });
    assert.equal(cliEmpty.ok, false);
  });
});
