/**
 * Formats financial prices with the appropriate currency symbol and locale rules.
 * Supports CZK (Kč), USD ($), EUR (€), GBP (£) and global currencies.
 */
export function getCurrencySymbol(currency: string = 'USD'): string {
  const upper = currency.toUpperCase();
  switch (upper) {
    case 'CZK':
      return 'Kč';
    case 'USD':
      return '$';
    case 'EUR':
      return '€';
    case 'GBP':
      return '£';
    case 'JPY':
      return '¥';
    default:
      return upper;
  }
}

export function formatPrice(price: number, currency: string = 'USD'): string {
  if (price === undefined || price === null || isNaN(price)) return '—';
  const curr = currency.toUpperCase();

  if (curr === 'CZK') {
    return `${price.toLocaleString('cs-CZ', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} Kč`;
  }

  if (curr === 'EUR') {
    return `€${price.toLocaleString('de-DE', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  if (curr === 'GBP') {
    return `£${price.toLocaleString('en-GB', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }

  // Default USD
  return `$${price.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatPriceCompact(price: number, currency: string = 'USD'): string {
  if (price === undefined || price === null || isNaN(price)) return '—';
  const curr = currency.toUpperCase();

  if (curr === 'CZK') {
    return `${price.toFixed(2)} Kč`;
  }
  if (curr === 'EUR') {
    return `€${price.toFixed(2)}`;
  }
  if (curr === 'GBP') {
    return `£${price.toFixed(2)}`;
  }

  return `$${price.toFixed(2)}`;
}

export function formatVolume(volume: number): string {
  if (!volume || isNaN(volume)) return '0';
  if (volume >= 1_000_000_000) {
    return `${(volume / 1_000_000_000).toFixed(2)}B`;
  }
  if (volume >= 1_000_000) {
    return `${(volume / 1_000_000).toFixed(2)}M`;
  }
  if (volume >= 1_000) {
    return `${(volume / 1_000).toFixed(1)}K`;
  }
  return volume.toLocaleString();
}
