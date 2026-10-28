/**
 * Normalização de WhatsApp brasileiro para evitar clientes duplicadas por
 * diferenças de formatação: "(71) 99999-8888", "71999998888" e
 * "+55 71 99999-8888" viram todos "5571999998888".
 */
export function normalizeWhatsapp(input: string): string | null {
  let digits = input.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  // Remove o zero de operadora/DDD ("071...").
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (digits.length === 12 && digits.startsWith("0")) digits = digits.slice(1);

  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (!digits.startsWith("55")) return null;
  if (digits.length !== 12 && digits.length !== 13) return null;

  const ddd = Number(digits.slice(2, 4));
  if (ddd < 11 || ddd > 99) return null;
  // Celulares com 9 dígitos começam com 9.
  if (digits.length === 13 && digits[4] !== "9") return null;
  return digits;
}

/** "5571999998888" -> "(71) 99999-8888" */
export function formatWhatsapp(normalized: string): string {
  const local = normalized.startsWith("55") ? normalized.slice(2) : normalized;
  if (local.length === 11) return `(${local.slice(0, 2)}) ${local.slice(2, 7)}-${local.slice(7)}`;
  if (local.length === 10) return `(${local.slice(0, 2)}) ${local.slice(2, 6)}-${local.slice(6)}`;
  return normalized;
}

/** Máscara progressiva para inputs: "7199" -> "(71) 99" */
export function maskWhatsappInput(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 11);
  if (d.length <= 2) return d.length ? `(${d}` : "";
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}
