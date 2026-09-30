import type { EcomAdapter, SupportedCMS } from './types';
import { WooCommerceAdapter } from './woocommerce';
import { ShopifyAdapter } from './shopify';
import { PrestaShopAdapter } from './prestashop';

/**
 * Helper multi-entorno para leer variables tanto en Astro SSR (import.meta.env)
 * como en scripts CLI de Node (process.env).
 */
function getEnvVar(key: string, fallback = ''): string {
  const metaEnv =
    typeof import.meta !== 'undefined' && import.meta.env
      ? (import.meta.env as Record<string, string | undefined>)[key]
      : undefined;
  return metaEnv ?? process.env[key] ?? fallback;
}

export function getActiveCMS(): SupportedCMS {
  const raw = getEnvVar('ACTIVE_ECOMMERCE', 'shopify').toLowerCase().trim();
  if (raw === 'woocommerce' || raw === 'shopify' || raw === 'prestashop') {
    return raw;
  }
  console.warn(
    `[AdapterFactory] ACTIVE_ECOMMERCE="${raw}" no reconocido. Usando "shopify" por defecto.`
  );
  return 'shopify';
}

let adapterInstance: EcomAdapter | null = null;

/**
 * Factory Singleton que instancia el conector correspondiente al CMS activo.
 */
export function getEcommerceAdapter(forceProvider?: SupportedCMS): EcomAdapter {
  const provider = forceProvider || getActiveCMS();

  if (adapterInstance && adapterInstance.provider === provider && !forceProvider) {
    return adapterInstance;
  }

  switch (provider) {
    case 'woocommerce': {
      adapterInstance = new WooCommerceAdapter({
        baseUrl: getEnvVar('WC_API_URL', 'https://demo-woocommerce.com'),
        consumerKey: getEnvVar('WC_CONSUMER_KEY', ''),
        consumerSecret: getEnvVar('WC_CONSUMER_SECRET', ''),
        currency: getEnvVar('WC_CURRENCY', 'EUR'),
      });
      break;
    }

    case 'shopify': {
      adapterInstance = new ShopifyAdapter({
        storeDomain: getEnvVar('SHOPIFY_STORE_DOMAIN', '3c090e.myshopify.com'),
        storefrontToken: getEnvVar(
          'SHOPIFY_STOREFRONT_TOKEN',
          '50b0395da9fee95afce261a4d66c5125'
        ),
        apiVersion: getEnvVar('SHOPIFY_API_VERSION', '2024-10'),
      });
      break;
    }

    case 'prestashop': {
      adapterInstance = new PrestaShopAdapter({
        baseUrl: getEnvVar('PS_API_URL', 'https://demo-prestashop.com'),
        wsKey: getEnvVar('PS_WS_KEY', ''),
        langId: getEnvVar('PS_DEFAULT_LANG_ID', '1'),
        currency: getEnvVar('PS_CURRENCY', 'EUR'),
      });
      break;
    }
  }

  return adapterInstance;
}

export * from './types';
export { WooCommerceAdapter, ShopifyAdapter, PrestaShopAdapter };
