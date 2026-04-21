/**
 * Utility to format numbers into compact strings (e.g. 1.2k, 1M)
 */
export function formatCompactNumber(value: number): string {
  if (value === 0) return '0';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
}

/** 
 * Maps ISO 4217 currency codes to display symbols.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
  AED: 'AED ',
  SGD: 'S$',
  CAD: 'CA$',
  AUD: 'A$',
}

/**
 * Smart currency formatter.
 * - INR uses Indian locale with lakh/crore compact notation (e.g. ₹4.5L, ₹1.2Cr)
 * - All others use standard en-US compact notation.
 */
export function formatCurrency(value: number | null | undefined, currencyCode: string = 'INR'): string {
  if (value === null || value === undefined) return 'N/A';
  const symbol = CURRENCY_SYMBOLS[currencyCode] ?? (currencyCode + ' ');

  if (currencyCode === 'INR') {
    // Indian compact: Crore / Lakh naming
    if (value >= 10_000_000) return `${symbol}${(value / 10_000_000).toFixed(2).replace(/\.?0+$/, '')} Cr`;
    if (value >= 100_000)    return `${symbol}${(value / 100_000).toFixed(2).replace(/\.?0+$/, '')} L`;
    if (value >= 1_000)      return `${symbol}${new Intl.NumberFormat('en-IN').format(value)}`;
    return `${symbol}${value}`;
  }

  // International: compact en-US notation
  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
  return `${symbol}${formatted}`;
}

/**
 * @deprecated Use formatCurrency() instead.
 */
export function formatCompactCurrency(value: number, symbol: string = '₹'): string {
  if (value === 0) return `${symbol}0`;
  const formatted = new Intl.NumberFormat('en-US', {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 1
  }).format(value);
  return `${symbol}${formatted}`;
}
