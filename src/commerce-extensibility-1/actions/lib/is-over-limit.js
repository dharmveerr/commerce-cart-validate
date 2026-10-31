export function parseLimit(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const text = String(value);
  if (!/^[1-9]\d*$/.test(text)) return null;
  const parsed = Number(text);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

export function parseQuantity(value) {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  if (!/^(0|[1-9]\d*)(?:\.\d+)?$/.test(String(value))) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function isOverLimit(qty, limit) {
  const count = parseQuantity(qty);
  const maximum = parseLimit(limit);
  return count !== null && maximum !== null && count > maximum;
}
