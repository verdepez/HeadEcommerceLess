import React, { useEffect, useState, useTransition } from 'react';
import type { ProductVariant } from '../../adapters/types';
import { VARIANT_CHANGE_EVENT } from './VariantPicker';

export interface AddToCartProps {
  productId: string;
  productTitle: string;
  initialVariant: ProductVariant;
}

interface CartItemPayload {
  productId: string;
  variantId: string;
  sku: string;
  title: string;
  variantTitle: string;
  price: number;
  currency: string;
  quantity: number;
}

export default function AddToCart({
  productId,
  productTitle,
  initialVariant,
}: AddToCartProps): React.JSX.Element {
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant>(initialVariant);
  const [quantity, setQuantity] = useState<number>(1);
  const [feedbackState, setFeedbackState] = useState<'idle' | 'added' | 'error'>('idle');
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const handleVariantChange = (event: Event) => {
      const customEvent = event as CustomEvent<ProductVariant>;
      if (customEvent.detail) {
        setSelectedVariant(customEvent.detail);
        setFeedbackState('idle');
      }
    };

    window.addEventListener(VARIANT_CHANGE_EVENT, handleVariantChange);
    return () => window.removeEventListener(VARIANT_CHANGE_EVENT, handleVariantChange);
  }, []);

  const handleAddToCart = () => {
    if (!selectedVariant.availableForSale) return;

    setFeedbackState('added');

    startTransition(() => {
      try {
        const storageKey = 'headless_cart_items';
        const rawCart = window.localStorage.getItem(storageKey);
        const currentItems: CartItemPayload[] = rawCart ? JSON.parse(rawCart) : [];

        const existingIndex = currentItems.findIndex(
          (item) => item.variantId === selectedVariant.id
        );

        if (existingIndex >= 0 && currentItems[existingIndex]) {
          currentItems[existingIndex].quantity += quantity;
        } else {
          currentItems.push({
            productId,
            variantId: selectedVariant.id,
            sku: selectedVariant.sku,
            title: productTitle,
            variantTitle: selectedVariant.title,
            price: selectedVariant.price,
            currency: selectedVariant.currency,
            quantity,
          });
        }

        window.localStorage.setItem(storageKey, JSON.stringify(currentItems));

        const totalCount = currentItems.reduce((sum, i) => sum + i.quantity, 0);
        const badgeEl = document.getElementById('header-cart-count');
        if (badgeEl) {
          badgeEl.textContent = String(totalCount);
        }

        window.dispatchEvent(
          new CustomEvent('headless:cart-updated', { detail: { items: currentItems, totalCount } })
        );
      } catch (err) {
        console.error('[AddToCart] Error persistiendo carrito:', err);
        setFeedbackState('error');
      }
    });

    window.setTimeout(() => {
      setFeedbackState('idle');
    }, 2200);
  };

  const canPurchase = selectedVariant.availableForSale;
  const whatsappText = encodeURIComponent(
    `Hola DOBLETRACCIÓN 4x4, quiero consultar compatibilidad e instalación para: ${productTitle} (SKU: ${selectedVariant.sku})`
  );

  return (
    <div className="space-y-3 pt-2" data-testid="add-to-cart">
      <div className="flex items-stretch gap-3 h-12">
        <div className="inline-flex items-center rounded-xl border border-zinc-700 bg-zinc-950">
          <button
            type="button"
            aria-label="Disminuir cantidad"
            disabled={!canPurchase || quantity <= 1}
            onClick={() => setQuantity((q) => Math.max(1, q - 1))}
            className="h-full px-3.5 text-lg font-bold text-zinc-300 hover:bg-zinc-900 disabled:opacity-40 rounded-l-xl"
          >
            −
          </button>
          <span
            aria-live="polite"
            className="min-w-[2.5rem] text-center text-sm font-black text-white"
          >
            {quantity}
          </span>
          <button
            type="button"
            aria-label="Aumentar cantidad"
            disabled={!canPurchase}
            onClick={() => setQuantity((q) => q + 1)}
            className="h-full px-3.5 text-lg font-bold text-zinc-300 hover:bg-zinc-900 disabled:opacity-40 rounded-r-xl"
          >
            +
          </button>
        </div>

        <button
          type="button"
          disabled={!canPurchase || isPending}
          onClick={handleAddToCart}
          className={[
            'flex-1 inline-flex items-center justify-center rounded-xl px-6 text-sm sm:text-base font-black uppercase tracking-wider transition-all focus:outline-none focus:ring-2 focus:ring-[#FFCC00]',
            canPurchase
              ? feedbackState === 'added'
                ? 'bg-[#21c102] text-black'
                : 'bg-[#FFCC00] text-black hover:bg-[#21c102] hover:text-black'
              : 'cursor-not-allowed bg-zinc-800 text-zinc-500',
          ].join(' ')}
        >
          {!canPurchase
            ? 'Agotado'
            : feedbackState === 'added'
              ? '✓ Recién agregado a tu proyecto'
              : 'COMPRAR AHORA'}
        </button>
      </div>

      {/* Botón directo de asesoría técnica e instalación por WhatsApp */}
      <a
        href={`https://wa.me/56233399330?text=${whatsappText}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-900/90 py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-zinc-200 hover:border-[#FFCC00] hover:text-[#FFCC00] transition-colors"
      >
        <span>💬 Consultar Calce o Agendar Instalación en Sucursal (WhatsApp)</span>
      </a>

      {feedbackState === 'error' && (
        <p role="alert" className="text-xs font-medium text-red-400">
          No se pudo actualizar el carrito. Inténtalo de nuevo.
        </p>
      )}
    </div>
  );
}
