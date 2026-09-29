import React from "react";
import { useCurrency } from "@/hooks/use-currency";
import { IndianRupee, DollarSign, Euro, PoundSterling, Coins, type LucideIcon } from "lucide-react";

/**
 * Returns the appropriate LucideIcon corresponding to a given currency code.
 */
export function getCurrencyLucideIcon(currencyCode?: string): LucideIcon {
  switch (currencyCode?.toUpperCase()) {
    case "INR":
      return IndianRupee;
    case "USD":
      return DollarSign;
    case "EUR":
      return Euro;
    case "GBP":
      return PoundSterling;
    default:
      return Coins;
  }
}

export interface CurrencyIconProps extends React.SVGProps<SVGSVGElement> {
  className?: string;
  size?: number | string;
}

/**
 * Dynamic Money / Currency Icon that automatically changes across the entire application
 * based on the active currency selected by the user (INR -> ₹ IndianRupee, USD -> $ DollarSign, EUR -> € Euro, etc.).
 */
export function CurrencyIcon({ className = "size-4", size, ...props }: CurrencyIconProps) {
  const { currency } = useCurrency();
  const Icon = getCurrencyLucideIcon(currency?.code);
  return <Icon className={className} size={size as any} {...props} />;
}

export default CurrencyIcon;
