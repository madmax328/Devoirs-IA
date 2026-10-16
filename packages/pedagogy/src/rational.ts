/** Nombre rationnel exact (numérateur / dénominateur > 0), en BigInt pour éviter les erreurs d'arrondi. */
export interface Rational {
  num: bigint;
  den: bigint;
}

const abs = (n: bigint) => (n < 0n ? -n : n);

export function gcd(a: bigint, b: bigint): bigint {
  a = abs(a);
  b = abs(b);
  while (b !== 0n) [a, b] = [b, a % b];
  return a;
}

export function rational(num: bigint, den: bigint): Rational {
  if (den === 0n) throw new Error("Dénominateur nul");
  if (den < 0n) [num, den] = [-num, -den];
  return { num, den };
}

export function reduce(r: Rational): Rational {
  const g = gcd(r.num, r.den) || 1n;
  return { num: r.num / g, den: r.den / g };
}

export const isInteger = (r: Rational) => r.num % r.den === 0n;
export const equals = (a: Rational, b: Rational) => a.num * b.den === b.num * a.den;
export const toNumber = (r: Rational) => Number(r.num) / Number(r.den);
export const isReduced = (r: Rational) => gcd(r.num, r.den) === 1n;

export type NumberForm = "integer" | "decimal" | "fraction";

export interface ParsedNumber {
  value: Rational;
  form: NumberForm;
  /** Pour une fraction : écrite sous forme irréductible ? */
  simplified: boolean;
}

const SPACE = /[ \u00a0\u202f]/g;
const THOUSANDS = /^\d{1,3}(?:[ \u00a0\u202f]\d{3})+$/;

/** "1 000" → "1000" ; refuse les espaces ailleurs (ex. « 1 1/2 » n'est pas lu comme 11/2). */
function digits(part: string): string | null {
  if (/^\d+$/.test(part)) return part;
  if (THOUSANDS.test(part)) return part.replace(SPACE, "");
  return null;
}

function parseDecimal(s: string): { value: Rational; form: NumberForm } | null {
  const m = /^(-?)([\d \u00a0\u202f]*)(?:[.,](\d*))?$/.exec(s);
  if (!m) return null;
  const [, sign, intRaw = "", fracRaw] = m;
  const intPart = intRaw === "" ? "0" : digits(intRaw.trim());
  if (intPart === null) return null;
  if (intRaw === "" && !fracRaw) return null; // « , » seul
  const frac = fracRaw ?? "";
  const den = 10n ** BigInt(frac.length);
  const num = BigInt(intPart + frac) * (sign === "-" ? -1n : 1n);
  return { value: rational(num, den), form: frac.length > 0 ? "decimal" : "integer" };
}

/**
 * Lit un nombre écrit par un élève : « 12 », « -3,5 », « 3.5 », « ,5 », « 1 000 », « 7/2 », « −7 / 2 ».
 * Renvoie null si la saisie n'est pas un nombre lisible.
 */
export function parseNumber(input: string): ParsedNumber | null {
  const s = input.trim().replace(/[−–]/g, "-").replace(/^\+/, "");
  if (s === "" || s.length > 40) return null;

  const frac = /^(-?)\s*([\d \u00a0\u202f]+?)\s*\/\s*([\d \u00a0\u202f]+)$/.exec(s);
  if (frac) {
    const [, sign, n = "", d = ""] = frac;
    const num = digits(n.trim());
    const den = digits(d.trim());
    if (num === null || den === null || BigInt(den) === 0n) return null;
    const value = rational(BigInt(num) * (sign === "-" ? -1n : 1n), BigInt(den));
    return { value, form: "fraction", simplified: isReduced(value) && value.den !== 1n };
  }

  const dec = parseDecimal(s);
  if (!dec) return null;
  return { ...dec, simplified: true };
}

/** Comparaison avec tolérance absolue (valeurs approchées). */
export function closeTo(a: Rational, b: Rational, tolerance: number): boolean {
  if (tolerance <= 0) return equals(a, b);
  return Math.abs(toNumber(a) - toNumber(b)) <= tolerance + 1e-12;
}
