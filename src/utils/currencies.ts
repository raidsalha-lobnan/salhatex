import { CurrencyInfo } from '../types';

export const defaultCurrencies: CurrencyInfo[] = [
  {
    code: 'ILS',
    name: 'شيكل',
    symbol: '₪',
    rateAgainstBase: 1.0,
    isBase: true,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'SAR',
    name: 'ريال سعودي',
    symbol: 'ر.س',
    rateAgainstBase: 0.98,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'USD',
    name: 'دولار أمريكي',
    symbol: '$',
    rateAgainstBase: 3.70,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'JOD',
    name: 'دينار أردني',
    symbol: 'د.أ',
    rateAgainstBase: 5.20,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'EUR',
    name: 'يورو أوروبي',
    symbol: '€',
    rateAgainstBase: 4.05,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'AED',
    name: 'درهم إماراتي',
    symbol: 'د.إ',
    rateAgainstBase: 1.01,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'EGP',
    name: 'جنيه مصري',
    symbol: 'ج.م',
    rateAgainstBase: 0.076,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'KWD',
    name: 'دينار كويتي',
    symbol: 'د.ك',
    rateAgainstBase: 12.10,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  },
  {
    code: 'QAR',
    name: 'ريال قطري',
    symbol: 'ر.ق',
    rateAgainstBase: 1.02,
    isBase: false,
    updatedAt: new Date().toISOString().split('T')[0]
  }
];

export function getBaseCurrency(currencies: CurrencyInfo[] = defaultCurrencies): CurrencyInfo {
  const base = currencies.find(c => c.isBase);
  if (base) return base;
  return currencies[0] || defaultCurrencies[0];
}

export function getCurrencyInfo(codeOrSymbol: string, currencies: CurrencyInfo[] = defaultCurrencies): CurrencyInfo {
  if (!codeOrSymbol) return getBaseCurrency(currencies);
  const clean = codeOrSymbol.trim().toUpperCase();
  const found = currencies.find(c => c.code.toUpperCase() === clean || c.symbol === codeOrSymbol.trim());
  if (found) return found;

  // Fallback
  return {
    code: codeOrSymbol,
    name: codeOrSymbol,
    symbol: codeOrSymbol,
    rateAgainstBase: 1.0,
    isBase: false
  };
}

/**
 * Converts any amount from a source currency to the current base currency configured in the system.
 * Formula: amount * rateAgainstBase
 */
export function convertToBase(amount: number, fromCodeOrSymbol: string, currencies: CurrencyInfo[] = defaultCurrencies): number {
  if (!amount || isNaN(amount)) return 0;
  const curr = getCurrencyInfo(fromCodeOrSymbol, currencies);
  if (curr.isBase) return amount;
  return Number((amount * (curr.rateAgainstBase || 1.0)).toFixed(2));
}

/**
 * Converts an amount from the system base currency into a target currency.
 * Formula: amount / rateAgainstBase
 */
export function convertFromBase(baseAmount: number, targetCodeOrSymbol: string, currencies: CurrencyInfo[] = defaultCurrencies): number {
  if (!baseAmount || isNaN(baseAmount)) return 0;
  const curr = getCurrencyInfo(targetCodeOrSymbol, currencies);
  if (curr.isBase || !curr.rateAgainstBase || curr.rateAgainstBase <= 0) return baseAmount;
  return Number((baseAmount / curr.rateAgainstBase).toFixed(2));
}

/**
 * Converts an amount from one currency to another using the Base currency as bridge.
 */
export function convertCurrency(
  amount: number,
  fromCodeOrSymbol: string,
  toCodeOrSymbol: string,
  currencies: CurrencyInfo[] = defaultCurrencies
): number {
  if (!amount || isNaN(amount)) return 0;
  if (fromCodeOrSymbol.trim().toUpperCase() === toCodeOrSymbol.trim().toUpperCase()) return amount;
  const inBase = convertToBase(amount, fromCodeOrSymbol, currencies);
  return convertFromBase(inBase, toCodeOrSymbol, currencies);
}

/**
 * Format currency with symbol
 */
export function formatCurrency(
  amount: number,
  currencyCodeOrSymbol?: string,
  currencies: CurrencyInfo[] = defaultCurrencies
): string {
  const curr = currencyCodeOrSymbol ? getCurrencyInfo(currencyCodeOrSymbol, currencies) : getBaseCurrency(currencies);
  return `${amount.toLocaleString('ar-SA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${curr.symbol}`;
}

/**
 * Fetch live exchange rates from open exchange API relative to the system's active base currency
 */
export async function fetchLiveExchangeRates(
  currentCurrencies: CurrencyInfo[],
  baseCurrencyCode: string = 'ILS'
): Promise<CurrencyInfo[]> {
  const baseCode = (baseCurrencyCode || 'ILS').toUpperCase();
  const today = new Date().toISOString().split('T')[0];

  try {
    if (typeof navigator !== 'undefined' && navigator.onLine) {
      const response = await fetch(`https://open.er-api.com/v6/latest/${baseCode}`);
      if (response.ok) {
        const data = await response.json();
        if (data && data.rates) {
          return currentCurrencies.map(curr => {
            if (curr.code.toUpperCase() === baseCode || curr.isBase) {
              return { ...curr, rateAgainstBase: 1.0, isBase: true, updatedAt: today };
            }
            // data.rates gives how many units of foreign per 1 base unit
            // So 1 unit of foreign = 1 / data.rates[curr.code] units of base
            const rateInBasePerForeign = data.rates[curr.code] && data.rates[curr.code] > 0
              ? 1 / data.rates[curr.code]
              : curr.rateAgainstBase;
            return {
              ...curr,
              isBase: false,
              rateAgainstBase: Number(rateInBasePerForeign.toFixed(4)),
              updatedAt: today
            };
          });
        }
      }
    }
  } catch (err) {
    console.warn('Could not fetch live rates online, preserving current rates:', err);
  }

  // Fallback: update timestamp
  return currentCurrencies.map(curr => ({
    ...curr,
    isBase: curr.code.toUpperCase() === baseCode,
    rateAgainstBase: curr.code.toUpperCase() === baseCode ? 1.0 : (curr.rateAgainstBase || 1.0),
    updatedAt: today
  }));
}

