/**
 * Shared utility for bus number normalization, comparison, and formatting on frontend.
 */

/**
 * Normalizes a bus identifier to its core numeric string if available, or clean string.
 * Examples:
 *   "Bus 10"  -> "10"
 *   "bus 10"  -> "10"
 *   "10"      -> "10"
 *   10        -> "10"
 *   "Bus 22"  -> "22"
 *   "22"      -> "22"
 *   "Bus22"   -> "22"
 */
export function normalizeBusNumber(val: string | number | null | undefined): string | null {
  if (val == null) return null;
  const str = String(val).trim();
  if (!str) return null;
  const match = str.match(/\d+/);
  if (match) return match[0];
  return str.toLowerCase().replace(/^bus\s*/i, '').replace(/\s+/g, '');
}

/**
 * Checks if two bus numbers represent the same bus, regardless of formatting or type.
 */
export function isMatchingBus(
  busA: string | number | null | undefined,
  busB: string | number | null | undefined
): boolean {
  if (!busA || !busB) return false;
  const normA = normalizeBusNumber(busA);
  const normB = normalizeBusNumber(busB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Formats a bus number for canonical display: e.g. "Bus 10"
 */
export function formatBusDisplay(val: string | number | null | undefined): string {
  if (!val) return 'All Buses';
  const norm = normalizeBusNumber(val);
  if (norm) return `Bus ${norm}`;
  return String(val);
}
