/**
 * Interfaces de dominio unificadas para el motor Headless Multi-CMS.
 * Desacoplan la capa de presentación (Astro/React) y el motor SEO de la fuente de datos.
 */

export type SupportedCMS = 'woocommerce' | 'shopify' | 'prestashop';

export type ProductTemplateType = 'default' | 'minimal';

export type StockStatus = 'IN_STOCK' | 'OUT_OF_STOCK' | 'PREORDER' | 'BACKORDER';

export interface ProductImage {
  id: string;
  url: string;
  alt: string;
  width: number;
  height: number;
  /** Conjunto opcional de miniaturas o resoluciones pre-generadas por el CMS */
  srcset?: string;
}

export interface BreadcrumbItem {
  name: string;
  /** Ruta relativa o absoluta validada (ej. "/categoria-producto/calzado") */
  path: string;
}

export interface ProductSpecification {
  name: string;
  value: string;
}

export interface AggregateRatingData {
  ratingValue: number;
  reviewCount: number;
  bestRating?: number;
  worstRating?: number;
}

export interface SEOData {
  title: string;
  description: string;
  /** URL canónica absoluta o ruta canónica de origen para evitar contenido duplicado */
  canonicalUrl?: string;
  robots?: {
    index: boolean;
    follow: boolean;
  };
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  ogType?: 'product' | 'website' | 'article';
  twitterCard?: 'summary_large_image' | 'summary';
}

export interface ProductVariant {
  id: string;
  sku: string;
  title: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  availableForSale: boolean;
  stockQuantity?: number;
  stockStatus: StockStatus;
  /** Mapa clave-valor de atributos (ej. { Talla: "42", Color: "Negro" }) */
  attributes: Record<string, string>;
  image?: ProductImage;
}

export interface UnifiedProduct {
  id: string;
  slug: string;
  sku: string;
  title: string;
  shortDescription: string;
  descriptionHtml: string;
  brand?: string;
  gtin?: string;
  mpn?: string;
  price: number;
  compareAtPrice?: number;
  currency: string;
  availableForSale: boolean;
  stockStatus: StockStatus;
  images: ProductImage[];
  variants: ProductVariant[];
  categories: Array<{
    id: string;
    name: string;
    slug: string;
  }>;
  breadcrumbs: BreadcrumbItem[];
  specifications: ProductSpecification[];
  rating?: AggregateRatingData;
  seo: SEOData;
  /** Plantilla visual resuelta dinámicamente por metadatos del producto */
  template: ProductTemplateType;
  updatedAt: string;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  descriptionHtml: string;
  image?: ProductImage;
  parentSlug?: string;
  breadcrumbs: BreadcrumbItem[];
  products: UnifiedProduct[];
  totalProducts: number;
  seo: SEOData;
  updatedAt: string;
}

export interface SitemapEntry {
  /** Ruta relativa respetando la estructura del CMS activo (ej. "/products/camiseta-pro") */
  path: string;
  lastmod: string;
  changefreq?: 'always' | 'hourly' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'never';
  priority?: number;
}

export interface RouteLookupParams {
  slug: string;
  id?: string;
  categorySlug?: string;
  page?: number;
  perPage?: number;
}

/**
 * Contrato estricto que debe implementar cada conector de E-commerce.
 */
export interface EcomAdapter {
  readonly provider: SupportedCMS;
  getProductBySlug(params: RouteLookupParams): Promise<UnifiedProduct | null>;
  getCategoryBySlug(params: RouteLookupParams): Promise<Category | null>;
  getAllSlugs(): Promise<SitemapEntry[]>;
}
