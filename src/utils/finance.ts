/**
 * Financial utility functions equivalent to numpy_financial
 */

/**
 * Calculates the interest rate per period of an annuity.
 * Uses Newton-Raphson method.
 */
export function rate(nper: number, pmt: number, pv: number, fv: number = 0, type: number = 0, guess: number = 0.01): number {
  const TOLERANCE = 1e-10;
  const MAX_ITERATIONS = 100;

  let r = guess;
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    let f, df;
    if (Math.abs(r) < 1e-10) {
      f = pv + pmt * nper + fv;
      df = pmt * nper * (nper - 1) / 2;
    } else {
      const t1 = Math.pow(1 + r, nper);
      const t2 = Math.pow(1 + r, nper - 1);
      f = pv * t1 + pmt * (1 + r * type) * (t1 - 1) / r + fv;
      df = nper * pv * t2 +
           pmt * (1 + r * type) * (nper * t2 * r - (t1 - 1)) / (r * r) +
           pmt * type * (t1 - 1) / r;
    }

    const newR = r - f / df;
    if (Math.abs(newR - r) < TOLERANCE) return newR;
    r = newR;
  }
  return r;
}

/**
 * Calculates the payment for a loan based on constant payments and a constant interest rate.
 */
export function pmt(rate: number, nper: number, pv: number, fv: number = 0, type: number = 0): number {
  if (rate === 0) return -(pv + fv) / nper;
  const pvif = Math.pow(1 + rate, nper);
  let pmt = (rate * (pv * pvif + fv)) / (pvif - 1);
  if (type === 1) pmt /= (1 + rate);
  return -pmt;
}

/**
 * Formats a number with Indian commas
 */
export function formatIndianCurrency(val: number | string): string {
  if (val === undefined || val === null || val === '') return '';
  const num = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
  if (isNaN(num)) return '';
  return num.toLocaleString('en-IN');
}

/**
 * Parses a numeric string back to a number, handling commas and leading zeros.
 * Preserves decimals.
 */
export function parseCurrency(val: string): number {
  // Remove commas
  let cleanVal = val.replace(/,/g, '');
  
  // Remove leading zeros but keep a single zero if it's followed by a decimal
  // e.g. "012" -> "12", "0.5" -> "0.5", "00.5" -> "0.5"
  cleanVal = cleanVal.replace(/^0+(?=\d)/, '');
  
  if (cleanVal === '' || cleanVal === '.') return 0;
  
  const num = parseFloat(cleanVal);
  return isNaN(num) ? 0 : num;
}
