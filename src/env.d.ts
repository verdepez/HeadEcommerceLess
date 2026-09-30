/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly ACTIVE_ECOMMERCE?: 'woocommerce' | 'shopify' | 'prestashop';
  readonly PUBLIC_SITE_URL?: string;
  readonly WC_API_URL?: string;
  readonly WC_CONSUMER_KEY?: string;
  readonly WC_CONSUMER_SECRET?: string;
  readonly WC_CURRENCY?: string;
  readonly SHOPIFY_STORE_DOMAIN?: string;
  readonly SHOPIFY_STOREFRONT_TOKEN?: string;
  readonly SHOPIFY_API_VERSION?: string;
  readonly PS_API_URL?: string;
  readonly PS_WS_KEY?: string;
  readonly PS_DEFAULT_LANG_ID?: string;
  readonly PS_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
