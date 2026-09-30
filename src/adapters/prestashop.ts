import type {
  Category,
  EcomAdapter,
  ProductImage,
  ProductTemplateType,
  ProductVariant,
  RouteLookupParams,
  SitemapEntry,
  UnifiedProduct,
} from './types';
import { buildEntityPath } from '../config/routing.config';

type PSMultilangField = string | Array<{ id: string | number; value: string }>;

interface PSProductRaw {
  id: number | string;
  id_category_default: string | number;
  id_default_image?: string | number;
  reference: string;
  ean13?: string;
  manufacturer_name?: string;
  price: string;
  active: string | number;
  date_upd: string;
  name: PSMultilangField;
  description: PSMultilangField;
  description_short: PSMultilangField;
  link_rewrite: PSMultilangField;
  meta_title: PSMultilangField;
  meta_description: PSMultilangField;
  associations?: {
    images?: Array<{ id: string | number }>;
    combinations?: Array<{ id: string | number }>;
    categories?: Array<{ id: string | number }>;
  };
}

interface PSCategoryRaw {
  id: number | string;
  active: string | number;
  date_upd: string;
  name: PSMultilangField;
  description: PSMultilangField;
  link_rewrite: PSMultilangField;
  meta_title: PSMultilangField;
  meta_description: PSMultilangField;
}

export class PrestaShopAdapter implements EcomAdapter {
  public readonly provider = 'prestashop' as const;
  private readonly baseUrl: string;
  private readonly authHeader: string;
  private readonly langId: string;
  private readonly currency: string;
  private readonly timeoutMs = 8000;

  constructor(config: {
    baseUrl: string;
    wsKey: string;
    langId?: string;
    currency?: string;
  }) {
    this.baseUrl = config.baseUrl.replace(/\/+$/, '');
    const token = Buffer.from(`${config.wsKey}:`, 'utf-8').toString('base64');
    this.authHeader = `Basic ${token}`;
    this.langId = config.langId || '1';
    this.currency = config.currency || 'EUR';
  }

  /**
   * Consume el Webservice de PrestaShop forzando output_format=JSON
   * (con soporte de fallback si el servidor devuelve cabeceras XML).
   */
  private async fetchPS<T>(endpoint: string, params: Record<string, string>): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const url = new URL(`${this.baseUrl}/api${endpoint}`);
      url.searchParams.set('output_format', 'JSON');
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: {
          Authorization: this.authHeader,
          Accept: 'application/json',
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(
          `[PrestaShopAdapter] HTTP ${response.status} (${response.statusText}) en ${url.pathname}`
        );
      }

      return (await response.json()) as T;
    } catch (error) {
      console.error(`[PrestaShopAdapter] Error consultando ${endpoint}:`, error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getProductBySlug({ id, slug }: RouteLookupParams): Promise<UnifiedProduct | null> {
    try {
      let rawProduct: PSProductRaw | undefined;

      // En PrestaShop las URLs suelen incluir el ID (ej. /12-camiseta.html) o buscarse por link_rewrite
      if (id) {
        const res = await this.fetchPS<{ product?: PSProductRaw; products?: PSProductRaw[] }>(
          `/products/${id}`,
          { display: 'full' }
        );
        rawProduct = res.product || res.products?.[0];
      } else {
        const res = await this.fetchPS<{ products?: PSProductRaw[] }>('/products', {
          'filter[link_rewrite]': `[${slug}]`,
          'filter[active]': '[1]',
          display: 'full',
          limit: '1',
        });
        rawProduct = res.products?.[0];
      }

      if (!rawProduct || String(rawProduct.active) === '0') {
        return null;
      }

      return this.mapProduct(rawProduct);
    } catch (error) {
      console.error(`[PrestaShopAdapter] Fallo en getProductBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getCategoryBySlug({ id, slug }: RouteLookupParams): Promise<Category | null> {
    try {
      const filters: Record<string, string> = {
        display: 'full',
        limit: '1',
      };
      if (id) {
        filters['filter[id]'] = `[${id}]`;
      } else {
        filters['filter[link_rewrite]'] = `[${slug}]`;
      }

      const catRes = await this.fetchPS<{ categories?: PSCategoryRaw[] }>('/categories', filters);
      const rawCat = catRes.categories?.[0];
      if (!rawCat) return null;

      const prodRes = await this.fetchPS<{ products?: PSProductRaw[] }>('/products', {
        'filter[id_category_default]': `[${rawCat.id}]`,
        'filter[active]': '[1]',
        display: 'full',
        limit: '24',
      });

      const products = (prodRes.products || []).map((p) => this.mapProduct(p));
      const catSlug = this.extractLangValue(rawCat.link_rewrite) || slug;
      const catName = this.extractLangValue(rawCat.name) || catSlug;
      const catDesc = this.extractLangValue(rawCat.description);
      const canonicalPath = buildEntityPath(
        'category',
        { id: String(rawCat.id), slug: catSlug },
        'prestashop'
      );

      return {
        id: String(rawCat.id),
        slug: catSlug,
        name: catName,
        descriptionHtml: catDesc,
        breadcrumbs: [
          { name: 'Inicio', path: '/' },
          { name: catName, path: canonicalPath },
        ],
        products,
        totalProducts: products.length,
        seo: {
          title: this.extractLangValue(rawCat.meta_title) || `${catName} | Catálogo`,
          description:
            this.extractLangValue(rawCat.meta_description) ||
            this.stripHtml(catDesc).slice(0, 160),
          canonicalUrl: canonicalPath,
          robots: { index: true, follow: true },
          ogType: 'website',
        },
        updatedAt: rawCat.date_upd
          ? new Date(rawCat.date_upd).toISOString()
          : new Date().toISOString(),
      };
    } catch (error) {
      console.error(`[PrestaShopAdapter] Fallo en getCategoryBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getAllSlugs(): Promise<SitemapEntry[]> {
    try {
      const [prodRes, catRes] = await Promise.all([
        this.fetchPS<{ products?: PSProductRaw[] }>('/products', {
          'filter[active]': '[1]',
          display: '[id,link_rewrite,date_upd]',
          limit: '250',
        }),
        this.fetchPS<{ categories?: PSCategoryRaw[] }>('/categories', {
          'filter[active]': '[1]',
          display: '[id,link_rewrite,date_upd]',
          limit: '100',
        }),
      ]);

      const productEntries: SitemapEntry[] = (prodRes.products || []).map((p) => {
        const slug = this.extractLangValue(p.link_rewrite);
        return {
          path: buildEntityPath('product', { id: String(p.id), slug }, 'prestashop'),
          lastmod: p.date_upd ? new Date(p.date_upd).toISOString() : new Date().toISOString(),
          changefreq: 'daily',
          priority: 0.9,
        };
      });

      const categoryEntries: SitemapEntry[] = (catRes.categories || [])
        .filter((c) => Number(c.id) > 2) // Excluir Root (1) y Home (2) en PrestaShop
        .map((c) => {
          const slug = this.extractLangValue(c.link_rewrite);
          return {
            path: buildEntityPath('category', { id: String(c.id), slug }, 'prestashop'),
            lastmod: c.date_upd ? new Date(c.date_upd).toISOString() : new Date().toISOString(),
            changefreq: 'weekly',
            priority: 0.7,
          };
        });

      return [...productEntries, ...categoryEntries];
    } catch (error) {
      console.error('[PrestaShopAdapter] Error obteniendo slugs para sitemap:', error);
      return [];
    }
  }

  private mapProduct(raw: PSProductRaw): UnifiedProduct {
    const title = this.extractLangValue(raw.name);
    const slug = this.extractLangValue(raw.link_rewrite);
    const descriptionHtml = this.extractLangValue(raw.description);
    const shortDescHtml = this.extractLangValue(raw.description_short);
    const price = parseFloat(raw.price || '0') || 0;

    const imageIds = raw.associations?.images?.map((i) => String(i.id)) || [];
    if (imageIds.length === 0 && raw.id_default_image) {
      imageIds.push(String(raw.id_default_image));
    }

    const images: ProductImage[] =
      imageIds.length > 0
        ? imageIds.map((imgId) => ({
            id: imgId,
            url: `${this.baseUrl}/${imgId}-large_default/${slug}.jpg`,
            alt: title,
            width: 800,
            height: 800,
          }))
        : [
            {
              id: 'placeholder',
              url: '/placeholder-product.svg',
              alt: title,
              width: 800,
              height: 800,
            },
          ];

    const variants: ProductVariant[] = [
      {
        id: String(raw.id),
        sku: raw.reference || `PS-${raw.id}`,
        title: 'Estándar',
        price,
        currency: this.currency,
        availableForSale: true,
        stockStatus: 'IN_STOCK',
        attributes: {},
      },
    ];

    const canonicalPath = buildEntityPath(
      'product',
      { id: String(raw.id), slug },
      'prestashop'
    );

    const template: ProductTemplateType = 'default';

    return {
      id: String(raw.id),
      slug,
      sku: raw.reference || `PS-${raw.id}`,
      title,
      shortDescription: this.stripHtml(shortDescHtml || descriptionHtml).slice(0, 220),
      descriptionHtml,
      brand: raw.manufacturer_name || undefined,
      gtin: raw.ean13 || undefined,
      price,
      currency: this.currency,
      availableForSale: true,
      stockStatus: 'IN_STOCK',
      images,
      variants,
      categories: (raw.associations?.categories || []).map((c) => ({
        id: String(c.id),
        name: `Categoría ${c.id}`,
        slug: String(c.id),
      })),
      breadcrumbs: [
        { name: 'Inicio', path: '/' },
        { name: title, path: canonicalPath },
      ],
      specifications: [
        ...(raw.reference ? [{ name: 'Referencia', value: raw.reference }] : []),
        ...(raw.ean13 ? [{ name: 'EAN-13', value: raw.ean13 }] : []),
      ],
      seo: {
        title: this.extractLangValue(raw.meta_title) || `${title} | Tienda Online`,
        description:
          this.extractLangValue(raw.meta_description) ||
          this.stripHtml(shortDescHtml || descriptionHtml).slice(0, 160),
        canonicalUrl: canonicalPath,
        robots: { index: true, follow: true },
        ogImage: {
          url: images[0]!.url,
          width: images[0]!.width,
          height: images[0]!.height,
          alt: images[0]!.alt,
        },
        ogType: 'product',
        twitterCard: 'summary_large_image',
      },
      template,
      updatedAt: raw.date_upd ? new Date(raw.date_upd).toISOString() : new Date().toISOString(),
    };
  }

  private extractLangValue(field: PSMultilangField | undefined): string {
    if (!field) return '';
    if (typeof field === 'string') return field;
    if (Array.isArray(field)) {
      const match = field.find((item) => String(item.id) === this.langId) || field[0];
      return match?.value || '';
    }
    return '';
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, '').replace(/\s+/g, ' ').trim();
  }
}
