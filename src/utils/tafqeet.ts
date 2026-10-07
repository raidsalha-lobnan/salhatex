/**
 * Arabic Number to Words Converter (Tafqeet - تفقيط المبالغ المالية باللغة العربية)
 * يدعم تفقيط المبالغ لكافة العملات المعتمدة في النظام بدقة مع أسماء العملات وأجزائها
 */

const ONES = ['', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة', 'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر', 'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر'];
const TENS = ['', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون'];
const HUNDREDS = ['', 'مائة', 'مئتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة'];

export const CURRENCY_TAFQEET_MAP: Record<string, { name: string; fraction: string }> = {
  'ILS': { name: 'شيكل', fraction: 'أغورة' },
  '₪': { name: 'شيكل', fraction: 'أغورة' },
  'شيكل': { name: 'شيكل', fraction: 'أغورة' },
  'SAR': { name: 'ريال سعودي', fraction: 'هللة' },
  'ر.س': { name: 'ريال سعودي', fraction: 'هللة' },
  'ريال': { name: 'ريال سعودي', fraction: 'هللة' },
  'USD': { name: 'دولار أمريكي', fraction: 'سنت' },
  '$': { name: 'دولار أمريكي', fraction: 'سنت' },
  'دولار': { name: 'دولار أمريكي', fraction: 'سنت' },
  'JOD': { name: 'دينار أردني', fraction: 'قرش' },
  'د.أ': { name: 'دينار أردني', fraction: 'قرش' },
  'دينار أردني': { name: 'دينار أردني', fraction: 'قرش' },
  'EUR': { name: 'يورو أوروبي', fraction: 'سنت' },
  '€': { name: 'يورو أوروبي', fraction: 'سنت' },
  'يورو': { name: 'يورو أوروبي', fraction: 'سنت' },
  'AED': { name: 'درهم إماراتي', fraction: 'فلس' },
  'د.إ': { name: 'درهم إماراتي', fraction: 'فلس' },
  'درهم': { name: 'درهم إماراتي', fraction: 'فلس' },
  'EGP': { name: 'جنيه مصري', fraction: 'قرش' },
  'ج.م': { name: 'جنيه مصري', fraction: 'قرش' },
  'جنيه': { name: 'جنيه مصري', fraction: 'قرش' },
  'KWD': { name: 'دينار كويتي', fraction: 'فلس' },
  'د.ك': { name: 'دينار كويتي', fraction: 'فلس' },
  'QAR': { name: 'ريال قطري', fraction: 'درهم' },
  'ر.ق': { name: 'ريال قطري', fraction: 'درهم' },
  'OMR': { name: 'ريال عماني', fraction: 'بيسة' },
  'ر.ع': { name: 'ريال عماني', fraction: 'بيسة' },
  'BHD': { name: 'دينار بحريني', fraction: 'فلس' },
  'د.ب': { name: 'دينار بحريني', fraction: 'فلس' },
  'TRY': { name: 'ليرة تركية', fraction: 'قرش' },
  '₺': { name: 'ليرة تركية', fraction: 'قرش' },
  'GBP': { name: 'جنيه إسترليني', fraction: 'بنس' },
  '£': { name: 'جنيه إسترليني', fraction: 'بنس' }
};

export function getCurrencyTafqeetUnits(codeOrSymbol?: string): { name: string; fraction: string } {
  if (!codeOrSymbol) return { name: 'شيكل', fraction: 'أغورة' };
  const clean = codeOrSymbol.trim().toUpperCase();
  if (CURRENCY_TAFQEET_MAP[clean]) return CURRENCY_TAFQEET_MAP[clean];
  if (CURRENCY_TAFQEET_MAP[codeOrSymbol.trim()]) return CURRENCY_TAFQEET_MAP[codeOrSymbol.trim()];
  return { name: codeOrSymbol.trim(), fraction: 'جزء' };
}

function convertGroup(num: number): string {
  if (num === 0) return '';
  const h = Math.floor(num / 100);
  const remainder = num % 100;
  const parts: string[] = [];

  if (h > 0) {
    parts.push(HUNDREDS[h]);
  }

  if (remainder > 0) {
    if (remainder < 20) {
      parts.push(ONES[remainder]);
    } else {
      const o = remainder % 10;
      const t = Math.floor(remainder / 10);
      if (o > 0) {
        parts.push(`${ONES[o]} و${TENS[t]}`);
      } else {
        parts.push(TENS[t]);
      }
    }
  }

  return parts.join(' و');
}

export function tafqeet(amount: number, currencyNameOrCode: string = 'شيكل', fractionalName?: string): string {
  if (amount === 0) {
    const resolvedUnits = getCurrencyTafqeetUnits(currencyNameOrCode);
    const finalName = fractionalName ? currencyNameOrCode : resolvedUnits.name;
    return 'صفر ' + finalName;
  }

  const resolvedUnits = getCurrencyTafqeetUnits(currencyNameOrCode);
  const finalCurrencyName = fractionalName ? currencyNameOrCode : resolvedUnits.name;
  const finalFractionalName = fractionalName || resolvedUnits.fraction;

  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  const integerPart = Math.floor(absAmount);
  const decimalPart = Math.round((absAmount - integerPart) * 100);

  const billions = Math.floor(integerPart / 1_000_000_000);
  const millions = Math.floor((integerPart % 1_000_000_000) / 1_000_000);
  const thousands = Math.floor((integerPart % 1_000_000) / 1_000);
  const units = integerPart % 1_000;

  const parts: string[] = [];

  if (billions > 0) {
    if (billions === 1) parts.push('مليار');
    else if (billions === 2) parts.push('ملياران');
    else if (billions >= 3 && billions <= 10) parts.push(`${convertGroup(billions)} مليارات`);
    else parts.push(`${convertGroup(billions)} مليار`);
  }

  if (millions > 0) {
    if (millions === 1) parts.push('مليون');
    else if (millions === 2) parts.push('مليونان');
    else if (millions >= 3 && millions <= 10) parts.push(`${convertGroup(millions)} ملايين`);
    else parts.push(`${convertGroup(millions)} مليون`);
  }

  if (thousands > 0) {
    if (thousands === 1) parts.push('ألف');
    else if (thousands === 2) parts.push('ألفان');
    else if (thousands >= 3 && thousands <= 10) parts.push(`${convertGroup(thousands)} آلاف`);
    else parts.push(`${convertGroup(thousands)} ألف`);
  }

  if (units > 0) {
    parts.push(convertGroup(units));
  }

  let result = (isNegative ? 'سالب ' : '') + 'فقط ' + parts.join(' و') + ' ' + finalCurrencyName;

  if (decimalPart > 0) {
    result += ` و${convertGroup(decimalPart)} ${finalFractionalName}`;
  }

  result += ' لا غير.';
  return result;
}

export const tafqeetArabic = tafqeet;
