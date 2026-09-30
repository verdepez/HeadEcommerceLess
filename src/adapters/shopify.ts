import type {
  Category,
  EcomAdapter,
  ProductImage,
  ProductSpecification,
  ProductTemplateType,
  ProductVariant,
  RouteLookupParams,
  SitemapEntry,
  UnifiedProduct,
} from './types';
import { buildEntityPath } from '../config/routing.config';

interface ShopifyGraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

interface ShopifyImageNode {
  id: string;
  url: string;
  altText: string | null;
  width: number | null;
  height: number | null;
}

interface ShopifyVariantNode {
  id: string;
  sku: string | null;
  title: string;
  availableForSale: boolean;
  quantityAvailable?: number | null;
  barcode?: string | null;
  price: { amount: string; currencyCode: string };
  compareAtPrice: { amount: string; currencyCode: string } | null;
  selectedOptions: Array<{ name: string; value: string }>;
  image: ShopifyImageNode | null;
}

interface ShopifyProductNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  updatedAt: string;
  availableForSale: boolean;
  tags: string[];
  seo: {
    title: string | null;
    description: string | null;
  };
  templateMetafield?: { value: string } | null;
  specsMetafield?: { value: string } | null;
  ratingMetafield?: { value: string } | null;
  images: { edges: Array<{ node: ShopifyImageNode }> };
  variants: { edges: Array<{ node: ShopifyVariantNode }> };
  collections: {
    edges: Array<{
      node: { id: string; handle: string; title: string };
    }>;
  };
}

interface ShopifyCollectionNode {
  id: string;
  handle: string;
  title: string;
  description: string;
  descriptionHtml: string;
  updatedAt: string;
  image: ShopifyImageNode | null;
  seo: {
    title: string | null;
    description: string | null;
  };
  products: {
    edges: Array<{ node: ShopifyProductNode }>;
  };
}

const PRODUCT_FRAGMENT = `
  fragment ProductFields on Product {
    id
    handle
    title
    description
    descriptionHtml
    vendor
    productType
    updatedAt
    availableForSale
    tags
    seo {
      title
      description
    }
    templateMetafield: metafield(namespace: "custom", key: "template") {
      value
    }
    specsMetafield: metafield(namespace: "custom", key: "specifications") {
      value
    }
    ratingMetafield: metafield(namespace: "reviews", key: "rating") {
      value
    }
    images(first: 12) {
      edges {
        node {
          id
          url
          altText
          width
          height
        }
      }
    }
    variants(first: 50) {
      edges {
        node {
          id
          sku
          title
          availableForSale
          barcode
          price {
            amount
            currencyCode
          }
          compareAtPrice {
            amount
            currencyCode
          }
          selectedOptions {
            name
            value
          }
          image {
            id
            url
            altText
            width
            height
          }
        }
      }
    }
    collections(first: 3) {
      edges {
        node {
          id
          handle
          title
        }
      }
    }
  }
`;

export class ShopifyAdapter implements EcomAdapter {
  public readonly provider = 'shopify' as const;
  private readonly endpoint: string;
  private readonly storefrontToken: string;
  private readonly timeoutMs = 8000;

  constructor(config: {
    storeDomain: string;
    storefrontToken: string;
    apiVersion?: string;
  }) {
    const cleanDomain = config.storeDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const version = config.apiVersion || '2024-10';
    this.endpoint = `https://${cleanDomain}/api/${version}/graphql.json`;
    this.storefrontToken = config.storefrontToken;
  }

  /**
   * Cliente Storefront GraphQL con manejo de errores de red y GraphQL errors.
   */
  private async queryStorefront<T>(
    query: string,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Storefront-Access-Token': this.storefrontToken,
          Accept: 'application/json',
        },
        body: JSON.stringify({ query, variables }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`[ShopifyAdapter] HTTP ${response.status}: ${response.statusText}`);
      }

      const payload = (await response.json()) as ShopifyGraphQLResponse<T>;

      if (payload.errors && payload.errors.length > 0) {
        throw new Error(
          `[ShopifyAdapter] GraphQL Errors: ${payload.errors.map((e) => e.message).join(' | ')}`
        );
      }

      if (!payload.data) {
        throw new Error('[ShopifyAdapter] Respuesta GraphQL sin nodo "data".');
      }

      return payload.data;
    } catch (error) {
      console.error('[ShopifyAdapter] Error en consulta Storefront API:', error);
      throw error;
    } finally {
      clearTimeout(timer);
    }
  }

  public async getProductBySlug({
    slug,
    categorySlug,
  }: RouteLookupParams): Promise<UnifiedProduct | null> {
    const query = `
      ${PRODUCT_FRAGMENT}
      query GetProductByHandle($handle: String!) {
        product(handle: $handle) {
          ...ProductFields
        }
      }
    `;

    try {
      const data = await this.queryStorefront<{ product: ShopifyProductNode | null }>(query, {
        handle: slug,
      });

      if (!data.product) return null;
      return this.mapProduct(data.product, categorySlug);
    } catch (error) {
      console.error(`[ShopifyAdapter] Fallo en getProductBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getCategoryBySlug({
    slug,
    perPage = 24,
  }: RouteLookupParams): Promise<Category | null> {
    const query = `
      ${PRODUCT_FRAGMENT}
      query GetCollectionByHandle($handle: String!, $first: Int!) {
        collection(handle: $handle) {
          id
          handle
          title
          description
          descriptionHtml
          updatedAt
          image {
            id
            url
            altText
            width
            height
          }
          seo {
            title
            description
          }
          products(first: $first) {
            edges {
              node {
                ...ProductFields
              }
            }
          }
        }
      }
    `;

    try {
      const data = await this.queryStorefront<{ collection: ShopifyCollectionNode | null }>(query, {
        handle: slug,
        first: perPage,
      });

      const col = data.collection;
      if (!col) return null;

      const products = col.products.edges.map(({ node }) => this.mapProduct(node, col.handle));
      const canonicalPath = buildEntityPath('category', { slug: col.handle }, 'shopify');

      return {
        id: col.id,
        slug: col.handle,
        name: col.title,
        descriptionHtml: col.descriptionHtml,
        image: col.image
          ? {
              id: col.image.id,
              url: col.image.url,
              alt: col.image.altText || col.title,
              width: col.image.width || 1200,
              height: col.image.height || 630,
            }
          : undefined,
        breadcrumbs: [
          { name: 'Inicio', path: '/' },
          { name: col.title, path: canonicalPath },
        ],
        products,
        totalProducts: products.length,
        seo: {
          title: col.seo.title || `${col.title} | Colección Oficial`,
          description: col.seo.description || col.description.slice(0, 160),
          canonicalUrl: canonicalPath,
          robots: { index: true, follow: true },
          ogType: 'website',
        },
        updatedAt: col.updatedAt,
      };
    } catch (error) {
      console.error(`[ShopifyAdapter] Fallo en getCategoryBySlug("${slug}"):`, error);
      return null;
    }
  }

  public async getAllSlugs(): Promise<SitemapEntry[]> {
    const query = `
      query GetSitemapEntries {
        products(first: 250) {
          edges {
            node {
              handle
              updatedAt
            }
          }
        }
        collections(first: 100) {
          edges {
            node {
              handle
              updatedAt
            }
          }
        }
      }
    `;

    try {
      const data = await this.queryStorefront<{
        products: { edges: Array<{ node: { handle: string; updatedAt: string } }> };
        collections: { edges: Array<{ node: { handle: string; updatedAt: string } }> };
      }>(query);

      const productEntries: SitemapEntry[] = data.products.edges.map(({ node }) => ({
        path: buildEntityPath('product', { slug: node.handle }, 'shopify'),
        lastmod: node.updatedAt,
        changefreq: 'daily',
        priority: 0.9,
      }));

      const collectionEntries: SitemapEntry[] = data.collections.edges.map(({ node }) => ({
        path: buildEntityPath('category', { slug: node.handle }, 'shopify'),
        lastmod: node.updatedAt,
        changefreq: 'weekly',
        priority: 0.7,
      }));

      return [...productEntries, ...collectionEntries];
    } catch (error) {
      console.error('[ShopifyAdapter] Error obteniendo rutas para sitemap:', error);
      return [];
    }
  }

  public async getFeaturedProducts(limit = 8): Promise<UnifiedProduct[]> {
    const query = `
      ${PRODUCT_FRAGMENT}
      query GetFeaturedProducts($first: Int!) {
        products(first: $first, sortKey: BEST_SELLING) {
          edges {
            node {
              ...ProductFields
            }
          }
        }
      }
    `;

    try {
      const data = await this.queryStorefront<{
        products: { edges: Array<{ node: ShopifyProductNode }> };
      }>(query, { first: limit });

      return data.products.edges.map(({ node }) => this.mapProduct(node));
    } catch (error) {
      console.error('[ShopifyAdapter] Error obteniendo productos destacados:', error);
      return [];
    }
  }

  private mapProduct(node: ShopifyProductNode, activeCollectionSlug?: string): UnifiedProduct {
    const images: ProductImage[] =
      node.images.edges.length > 0
        ? node.images.edges.map(({ node: img }) => ({
            id: img.id,
            url: img.url,
            alt: img.altText || node.title,
            width: img.width || 1024,
            height: img.height || 1024,
            srcset: this.buildShopifySrcSet(img.url),
          }))
        : [
            {
              id: 'placeholder',
              url: '/placeholder-product.svg',
              alt: node.title,
              width: 1024,
              height: 1024,
            },
          ];

    const variants: ProductVariant[] = node.variants.edges.map(({ node: v }) => {
      const price = parseFloat(v.price.amount) || 0;
      const compareAt = v.compareAtPrice ? parseFloat(v.compareAtPrice.amount) : undefined;
      const attributes: Record<string, string> = {};
      v.selectedOptions.forEach((opt) => {
        if (opt.name !== 'Title' || opt.value !== 'Default Title') {
          attributes[opt.name] = opt.value;
        }
      });

      return {
        id: v.id,
        sku: v.sku || v.id.split('/').pop()!,
        title: v.title,
        price,
        compareAtPrice: compareAt && compareAt > price ? compareAt : undefined,
        currency: v.price.currencyCode,
        availableForSale: v.availableForSale,
        stockQuantity: v.quantityAvailable ?? undefined,
        stockStatus: v.availableForSale ? 'IN_STOCK' : 'OUT_OF_STOCK',
        attributes,
        image: v.image
          ? {
              id: v.image.id,
              url: v.image.url,
              alt: v.image.altText || node.title,
              width: v.image.width || 1024,
              height: v.image.height || 1024,
              srcset: this.buildShopifySrcSet(v.image.url),
            }
          : undefined,
      };
    });

    const firstVariant = variants[0];
    const primaryCollection =
      node.collections.edges.find((c) => c.node.handle === activeCollectionSlug)?.node ||
      node.collections.edges[0]?.node;

    // IMPORTANTE SEO: En Shopify, aunque se acceda vía /collections/:cat/products/:slug,
    // el canonical SIEMPRE debe apuntar a /products/:slug para evitar duplicidad de indexación.
    const canonicalProductPath = buildEntityPath('product', { slug: node.handle }, 'shopify');

    const breadcrumbs = [
      { name: 'Inicio', path: '/' },
      ...(primaryCollection
        ? [
            {
              name: primaryCollection.title,
              path: buildEntityPath('category', { slug: primaryCollection.handle }, 'shopify'),
            },
          ]
        : []),
      { name: node.title, path: canonicalProductPath },
    ];

    const specifications: ProductSpecification[] = [];
    if (node.vendor) specifications.push({ name: 'Marca', value: node.vendor });
    if (node.productType) specifications.push({ name: 'Categoría', value: node.productType });
    if (node.specsMetafield?.value) {
      try {
        const parsed = JSON.parse(node.specsMetafield.value) as Record<string, string>;
        Object.entries(parsed).forEach(([name, value]) => specifications.push({ name, value }));
      } catch {
        // Ignorar si el metafield no es JSON válido
      }
    }

    const template: ProductTemplateType =
      node.templateMetafield?.value === 'minimal' || node.tags.includes('template:minimal')
        ? 'minimal'
        : 'default';

    return {
      id: node.id,
      slug: node.handle,
      sku: firstVariant?.sku || node.handle,
      title: node.title,
      shortDescription: node.description.slice(0, 220),
      descriptionHtml: node.descriptionHtml,
      brand: node.vendor || undefined,
      gtin: node.variants.edges[0]?.node.barcode || undefined,
      price: firstVariant?.price ?? 0,
      compareAtPrice: firstVariant?.compareAtPrice,
      currency: firstVariant?.currency || 'EUR',
      availableForSale: node.availableForSale,
      stockStatus: node.availableForSale ? 'IN_STOCK' : 'OUT_OF_STOCK',
      images,
      variants,
      categories: node.collections.edges.map(({ node: c }) => ({
        id: c.id,
        name: c.title,
        slug: c.handle,
      })),
      breadcrumbs,
      specifications,
      seo: {
        title: node.seo.title || `${node.title} | ${node.vendor || 'Tienda Oficial'}`,
        description: node.seo.description || node.description.slice(0, 160),
        canonicalUrl: canonicalProductPath,
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
      updatedAt: node.updatedAt,
    };
  }

  /**
   * Genera srcset nativo aprovechando el CDN de imágenes de Shopify para optimizar LCP.
   */
  private buildShopifySrcSet(url: string): string {
    if (!url.includes('cdn.shopify.com')) return '';
    const widths = [400, 600, 800, 1024, 1440];
    const separator = url.includes('?') ? '&' : '?';
    return widths.map((w) => `${url}${separator}width=${w}&format=webp ${w}w`).join(', ');
  }
}
