import type {
  Category,
  EcomAdapter,
  ProductImage,
  ProductSpecification,
  ProductTemplateType,
  ProductVariant,
  RouteLookupParams,
  SEOData,
  SitemapEntry,
  StockStatus,
  UnifiedProduct,
} from './types';
import { buildEntityPath } from '../config/routing.config';

interface WCImageRaw {
  id: number;
  src: string;
  alt: string;
  name: string;
}

interface WCCategoryRaw {
  id: number;
  name: string;
  slug: string;
  description?: string;
  image?: WCImageRaw | null;
  count?: number;
}

interface WCAttributeRaw {
  id: number;
  name: string;
  option?: string;
  options?: string[];
  variation?: boolean;
  visible?: boolean;
}

interface WCMetaDataRaw {
  id: number;
  key: string;
  value: unknown;
}

interface WCProductRaw {
  id: number;
  name: string;
  slug: string;
  permalink: string;
  date_modified_gmt: string;
  type: 'simple' | 'variable' | 'grouped' | 'external';
  status: string;
  description: string;
  short_description: string;
  sku: string;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  average_rating: string;
  rating_count: number;
  categories: WCCategoryRaw[];
  images: WCImageRaw[];
  attributes: WCAttributeRaw[];
  meta_data: WCMetaDataRaw[];
  yoast_head_json?: {
    title?: string;
    description?: string;
    canonical?: string;
    robots?: { index?: string; follow?: string };
    og_image?: Array<{ url: string; width?: number; height?: number }>;
  };
}

interface WCVariationRaw {
  id: number;
  sku: string;
  price: string;
  regular_price: string;
  stock_status: 'instock' | 'outofstock' | 'onbackorder';
  stock_quantity: number | null;
  image?: WCImageRaw;
  attributes: Array<{ id: number; name: string; option: string }>;
}

export class WooCommerceAdapter implements EcomAdapter {
  public readonly provider = 'woocommerce' as const;
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly defaultCurrency: string;
  private readonly timeoutMs = 8000;

  constructor(config: {
    baseUrl: string;
    consumerKey: string;
    consumerSecret: string;
    currency?: string;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    const credentials = Buffer.from(
      `${config.consumerKey}:${config.consumerSecret}`,
      'utf-8'
    ).toString('base64');
    this.authHeader = `Basic ${credentials}`;
    this.defaultCurrency = config.currency || 'EUR';
  }

  /**
   * Wrapper HTTP con AbortController para proteger el TTFB/LCP ante caídas del backend WP.
   */
  private async fetchWC<T>(endpoint: string, searchParams?: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(`${this.baseUrl}/wp-json/wc/v3${endpoint}`);
      if (searchParams) {
        Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v));
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `[WooCommerceAdapter] HTTP ${response.status} (${response.statusText}) en ${url.pathname}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`[WooCommerceAdapter] Error consultando ${endpoint}:`, error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getProductBySlug({ slug }: RouteLookupParams): Promise<UnifiedProduct | null> {
    try {
      const products = await this.fetchWC<WCProductRaw[]>('/products', {
        slug,
        status: 'publish',
      });

      const rawProduct = products[0];
      if (!rawProduct) return null;

      let rawVariations: WCVariationRaw[] = [];
      if (rawProduct.type === 'variable') {
        try {
          rawVariations = await this.fetchWC<WCVariationRaw[]>(
            `/products/${rawProduct.id}/variations`,
            { per_page: '100', status: 'publish' }
          );
        } catch (variationError) {
          console.warn(
            `[WooCommerceAdapter] No se pudieron cargar variaciones para ID ${rawProduct.id}:`,
            variationError
          );
        }
      }

      return this.mapProduct(rawProduct, rawVariations);
    } catch (error) {
      console.error(`[WooCommerceAdapter] Fallo en getProductBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getCategoryBySlug({
    slug,
    page = 1,
    perPage = 24,
  }: RouteLookupParams): Promise<Category | null> {
    try {
      const categories = await this.fetchWC<WCCategoryRaw[]>('/products/categories', {
        slug,
      });

      const rawCat = categories[0];
      if (!rawCat) return null;

      const rawProducts = await this.fetchWC<WCProductRaw[]>('/products', {
        category: String(rawCat.id),
        status: 'publish',
        page: String(page),
        per_page: String(perPage),
      });

      const products = rawProducts.map((p) => this.mapProduct(p, []));
      const canonicalPath = buildEntityPath('category', { slug: rawCat.slug }, 'woocommerce');

      return {
        id: String(rawCat.id),
        slug: rawCat.slug,
        name: rawCat.name,
        descriptionHtml: rawCat.description || '',
        image: rawCat.image
          ? {
              id: String(rawCat.image.id),
              url: rawCat.image.src,
              alt: rawCat.image.alt || rawCat.name,
              width: 1200,
              height: 630,
            }
          : undefined,
        breadcrumbs: [
          { name: 'Inicio', path: '/' },
          { name: rawCat.name, path: canonicalPath },
        ],
        products,
        totalProducts: rawCat.count ?? products.length,
        seo: {
          title: `${rawCat.name} | Catálogo Oficial`,
          description: this.stripHtml(rawCat.description || `Compra ${rawCat.name} al mejor precio.`).slice(
            0,
            160
          ),
          canonicalUrl: canonicalPath,
          robots: { index: true, follow: true },
          ogType: 'website',
        },
        updatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[WooCommerceAdapter] Fallo en getCategoryBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getAllSlugs(): Promise<SitemapEntry[]> {
    try {
      const [products, categories] = await Promise.all([
        this.fetchWC<WCProductRaw[]>('/products', {
          status: 'publish',
          per_page: '100',
          _fields: 'id,slug,date_modified_gmt',
        }),
        this.fetchWC<WCCategoryRaw[]>('/products/categories', {
          per_page: '100',
          hide_empty: 'true',
          _fields: 'id,slug',
        }),
      ]);

      const productEntries: SitemapEntry[] = products.map((p) => ({
        path: buildEntityPath('product', { slug: p.slug }, 'woocommerce'),
        lastmod: p.date_modified_gmt
          ? new Date(`${p.date_modified_gmt}Z`).toISOString()
          : new Date().toISOString(),
        changefreq: 'daily',
        priority: 0.9,
      }));

      const categoryEntries: SitemapEntry[] = categories.map((c) => ({
        path: buildEntityPath('category', { slug: c.slug }, 'woocommerce'),
        lastmod: new Date().toISOString(),
        changefreq: 'weekly',
        priority: 0.7,
      }));

      return [...productEntries, ...categoryEntries];
    } catch (error) {
      console.error('[WooCommerceAdapter] Error obteniendo slugs para sitemap:', error);
      return [];
    }
  }

  private mapProduct(raw: WCProductRaw, variations: WCVariationRaw[]): UnifiedProduct {
    const price = parseFloat(raw.price || raw.regular_price || '0') || 0;
    const regularPrice = parseFloat(raw.regular_price || '0') || 0;
    const compareAtPrice = regularPrice > price ? regularPrice : undefined;

    const images: ProductImage[] =
      raw.images.length > 0
        ? raw.images.map((img) => ({
            id: String(img.id),
            url: img.src,
            alt: img.alt || raw.name,
            width: 1000,
            height: 1000,
          }))
        : [
            {
              id: 'placeholder',
              url: '/placeholder-product.svg',
              alt: raw.name,
              width: 1000,
              height: 1000,
            },
          ];

    const mappedVariants: ProductVariant[] =
      variations.length > 0
        ? variations.map((v) => {
            const vPrice = parseFloat(v.price || v.regular_price || String(price)) || price;
            const vRegular = parseFloat(v.regular_price || '0') || 0;
            const attrs: Record<string, string> = {};
            v.attributes.forEach((attr) => {
              attrs[attr.name] = attr.option;
            });

            return {
              id: String(v.id),
              sku: v.sku || `${raw.sku}-${v.id}`,
              title: v.attributes.map((a) => a.option).join(' / ') || raw.name,
              price: vPrice,
              compareAtPrice: vRegular > vPrice ? vRegular : undefined,
              currency: this.defaultCurrency,
              availableForSale: v.stock_status !== 'outofstock',
              stockQuantity: v.stock_quantity ?? undefined,
              stockStatus: this.mapStockStatus(v.stock_status),
              attributes: attrs,
              image: v.image
                ? {
                    id: String(v.image.id),
                    url: v.image.src,
                    alt: v.image.alt || raw.name,
                    width: 1000,
                    height: 1000,
                  }
                : undefined,
            };
          })
        : [
            {
              id: String(raw.id),
              sku: raw.sku || `WC-${raw.id}`,
              title: 'Default',
              price,
              compareAtPrice,
              currency: this.defaultCurrency,
              availableForSale: raw.stock_status !== 'outofstock',
              stockQuantity: raw.stock_quantity ?? undefined,
              stockStatus: this.mapStockStatus(raw.stock_status),
              attributes: {},
            },
          ];

    const specifications: ProductSpecification[] = raw.attributes
      .filter((attr) => attr.visible !== false)
      .map((attr) => ({
        name: attr.name,
        value: Array.isArray(attr.options) ? attr.options.join(', ') : attr.option || '',
      }))
      .filter((spec) => spec.value.length > 0);

    const primaryCategory = raw.categories[0];
    const productPath = buildEntityPath('product', { slug: raw.slug }, 'woocommerce');

    const breadcrumbs = [
      { name: 'Inicio', path: '/' },
      ...(primaryCategory
        ? [
            {
              name: primaryCategory.name,
              path: buildEntityPath('category', { slug: primaryCategory.slug }, 'woocommerce'),
            },
          ]
        : []),
      { name: raw.name, path: productPath },
    ];

    const templateMeta = raw.meta_data?.find((m) => m.key === '_headless_template')?.value;
    const template: ProductTemplateType = templateMeta === 'minimal' ? 'minimal' : 'default';

    const coverImg = images[0]!;
    const seo: SEOData = {
      title: raw.yoast_head_json?.title || `${raw.name} | Comprar Online`,
      description:
        raw.yoast_head_json?.description ||
        this.stripHtml(raw.short_description || raw.description).slice(0, 160),
      canonicalUrl: productPath,
      robots: {
        index: raw.yoast_head_json?.robots?.index !== 'noindex',
        follow: raw.yoast_head_json?.robots?.follow !== 'nofollow',
      },
      ogImage: {
        url: coverImg.url,
        width: coverImg.width,
        height: coverImg.height,
        alt: coverImg.alt,
      },
      ogType: 'product',
      twitterCard: 'summary_large_image',
    };

    const brandMeta = raw.meta_data?.find((m) => m.key === '_brand' || m.key === 'brand')?.value;
    const gtinMeta = raw.meta_data?.find((m) => m.key === '_gtin' || m.key === '_ean')?.value;

    return {
      id: String(raw.id),
      slug: raw.slug,
      sku: raw.sku || `WC-${raw.id}`,
      title: raw.name,
      shortDescription: this.stripHtml(raw.short_description),
      descriptionHtml: raw.description,
      brand: typeof brandMeta === 'string' ? brandMeta : undefined,
      gtin: typeof gtinMeta === 'string' ? gtinMeta : undefined,
      price,
      compareAtPrice,
      currency: this.defaultCurrency,
      availableForSale: raw.stock_status !== 'outofstock',
      stockStatus: this.mapStockStatus(raw.stock_status),
      images,
      variants: mappedVariants,
      categories: raw.categories.map((c) => ({
        id: String(c.id),
        name: c.name,
        slug: c.slug,
      })),
      breadcrumbs,
      specifications,
      rating:
        raw.rating_count > 0
          ? {
              ratingValue: parseFloat(raw.average_rating) || 5,
              reviewCount: raw.rating_count,
            }
          : undefined,
      seo,
      template,
      updatedAt: raw.date_modified_gmt
        ? new Date(`${raw.date_modified_gmt}Z`).toISOString()
        : new Date().toISOString(),
    };
  }

  private mapStockStatus(status: WCProductRaw['stock_status']): StockStatus {
    switch (status) {
      case 'instock':
        return 'IN_STOCK';
      case 'onbackorder':
        return 'BACKORDER';
      default:
        return 'OUT_OF_STOCK';
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }
}
