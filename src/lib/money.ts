/**
 * Dinheiro trafega como string decimal ("120.00") e é calculado em centavos
 * inteiros. Nunca somamos valores monetários como float.
 */

/** Aceita "120", "120,5", "1.234,56", "120.00" -> centavos, ou null se inválido. */
export function parseMoneyToCents(input: string | number): number | null {
  if (typeof input === "number") {
    if (!Number.isFinite(input) || input < 0) return null;
    return Math.round(input * 100);
  }
  let s = input.trim().replace(/^R\$\s*/i, "");
  if (!s) return null;
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return null;
  const [int, frac = ""] = s.split(".") as [string, string?];
  return Number(int) * 100 + Number(frac.padEnd(2, "0"));
}

export function centsToDecimalString(cents: number): string {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

/** Converte um Decimal do Prisma (ou string) em centavos sem passar por float. */
export function decimalToCents(value: { toString(): string } | string): number {
  const cents = parseMoneyToCents(value.toString());
  if (cents === null) throw new Error(`Valor monetário inválido: ${value.toString()}`);
  return cents;
}

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export function formatCents(cents: number): string {
  return brl.format(cents / 100);
}

export function formatMoney(value: { toString(): string } | string): string {
  return formatCents(decimalToCents(value));
}
