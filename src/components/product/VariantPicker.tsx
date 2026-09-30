import React, { useEffect, useMemo, useState } from 'react';
import type { ProductVariant } from '../../adapters/types';
import { formatPrice } from '../../utils/formatters';

export interface VariantPickerProps {
  variants: ProductVariant[];
  initialVariantId?: string;
}

export const VARIANT_CHANGE_EVENT = 'headless:variant-change';

export default function VariantPicker({
  variants,
  initialVariantId,
}: VariantPickerProps): React.JSX.Element | null {
  const attributeGroups = useMemo(() => {
    const groups: Record<string, string[]> = {};
    for (const variant of variants) {
      for (const [attrName, attrValue] of Object.entries(variant.attributes)) {
        if (!groups[attrName]) {
          groups[attrName] = [];
        }
        if (!groups[attrName].includes(attrValue)) {
          groups[attrName].push(attrValue);
        }
      }
    }
    return groups;
  }, [variants]);

  const defaultVariant = useMemo(
    () =>
      variants.find((v) => v.id === initialVariantId) ||
      variants.find((v) => v.availableForSale) ||
      variants[0],
    [variants, initialVariantId]
  );

  const [selectedAttributes, setSelectedAttributes] = useState<Record<string, string>>(
    () => defaultVariant?.attributes || {}
  );

  const activeVariant = useMemo(() => {
    const attrEntries = Object.entries(selectedAttributes);
    if (attrEntries.length === 0) return defaultVariant;

    return (
      variants.find((v) =>
        attrEntries.every(([key, value]) => v.attributes[key] === value)
      ) || defaultVariant
    );
  }, [variants, selectedAttributes, defaultVariant]);

  useEffect(() => {
    if (!activeVariant) return;

    window.dispatchEvent(
      new CustomEvent<ProductVariant>(VARIANT_CHANGE_EVENT, {
        detail: activeVariant,
      })
    );

    const priceEl = document.querySelector('[data-product-price]');
    if (priceEl) {
      priceEl.textContent = formatPrice(activeVariant.price, activeVariant.currency || 'CLP');
    }

    const skuEl = document.querySelector('[data-product-sku]');
    if (skuEl) {
      skuEl.textContent = activeVariant.sku;
    }

    const url = new URL(window.location.href);
    if (variants.length > 1) {
      url.searchParams.set('variant', activeVariant.id);
      window.history.replaceState({}, '', url.toString());
    }
  }, [activeVariant, variants.length]);

  const attributeNames = Object.keys(attributeGroups);
  if (attributeNames.length === 0) {
    return null;
  }

  const handleSelectOption = (attributeName: string, optionValue: string) => {
    setSelectedAttributes((prev) => ({
      ...prev,
      [attributeName]: optionValue,
    }));
  };

  return (
    <div className="space-y-4 py-1" data-testid="variant-picker">
      {attributeNames.map((attrName) => {
        const options = attributeGroups[attrName] || [];
        const currentVal = selectedAttributes[attrName];

        return (
          <div key={attrName} className="space-y-2">
            <div className="flex items-center justify-between text-xs uppercase tracking-wider">
              <span className="font-bold text-zinc-400">{attrName}:</span>
              <span className="font-black text-[#FFCC00]">{currentVal}</span>
            </div>

            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={attrName}>
              {options.map((optValue) => {
                const isSelected = currentVal === optValue;
                const isOptionAvailable = variants.some(
                  (v) => v.attributes[attrName] === optValue && v.availableForSale
                );

                return (
                  <button
                    key={optValue}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectOption(attrName, optValue)}
                    className={[
                      'min-w-[3.2rem] rounded-xl border px-3.5 py-2 text-xs font-black uppercase transition-all focus:outline-none focus:ring-2 focus:ring-[#FFCC00]',
                      isSelected
                        ? 'border-[#FFCC00] bg-[#FFCC00] text-black'
                        : 'border-zinc-700 bg-zinc-950 text-zinc-200 hover:border-zinc-500',
                      !isOptionAvailable && !isSelected ? 'opacity-40 line-through' : '',
                    ].join(' ')}
                  >
                    {optValue}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
