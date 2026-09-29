import { useState, useEffect } from 'react';
import { getActiveCurrency, formatCurrency, CurrencyConfig, EXCHANGE_RATES } from '@/lib/utils';
import { getCurrencyLucideIcon, CurrencyIcon } from '@/components/common/CurrencyIcon';

export { getCurrencyLucideIcon, CurrencyIcon };

export function useCurrency() {
  const [currency, setCurrency] = useState<CurrencyConfig>(getActiveCurrency());

  useEffect(() => {
    const handleCurrencyChanged = () => {
      setCurrency(getActiveCurrency());
    };
    window.addEventListener("bos-currency-changed", handleCurrencyChanged);
    return () => window.removeEventListener("bos-currency-changed", handleCurrencyChanged);
  }, []);

  const ActiveCurrencyIcon = getCurrencyLucideIcon(currency?.code);

  return { currency, formatCurrency, exchangeRates: EXCHANGE_RATES, CurrencyIcon, ActiveCurrencyIcon };
}
