/**
 * Shared utility for bus number normalization, comparison, and SQL querying.
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
function normalizeBusNumber(val) {
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
function isMatchingBus(busA, busB) {
  if (!busA || !busB) return false;
  const normA = normalizeBusNumber(busA);
  const normB = normalizeBusNumber(busB);
  if (!normA || !normB) return false;
  return normA === normB;
}

/**
 * Formats a bus number for canonical display: e.g. "Bus 10"
 */
function formatBusDisplay(val) {
  if (!val) return 'All Buses';
  const norm = normalizeBusNumber(val);
  if (norm) return `Bus ${norm}`;
  return String(val);
}

/**
 * Builds a parameterized SQL WHERE clause that matches a bus number across all formats:
 * e.g. "10", "Bus 10", "bus 10", "Bus10"
 */
function buildBusNumberSql(columnName, busNumber) {
  if (!busNumber || String(busNumber).toUpperCase() === 'ALL') {
    return { clause: '1=1', params: [] };
  }
  const norm = normalizeBusNumber(busNumber);
  if (!norm) {
    return { clause: `${columnName} = ?`, params: [busNumber] };
  }
  return {
    clause: `(${columnName} = ? OR ${columnName} = ? OR ${columnName} = ? OR REPLACE(REPLACE(LOWER(COALESCE(${columnName}, '')), 'bus', ''), ' ', '') = ?)`,
    params: [busNumber, `Bus ${norm}`, norm, norm]
  };
}

module.exports = {
  normalizeBusNumber,
  isMatchingBus,
  formatBusDisplay,
  buildBusNumberSql
};
