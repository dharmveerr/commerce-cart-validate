import { getCommerceClient } from '@adobe/aio-commerce-lib-app';
import { resolveImsAuthParams } from '@adobe/aio-commerce-lib-auth';
import { parseQuantity, parseLimit } from './is-over-limit.js';

const statusOf = (error) => error?.response?.status ?? error?.status ?? error?.statusCode;
const retryable = (error) => [502, 503, 504].includes(statusOf(error)) || ['ETIMEDOUT', 'ECONNRESET'].includes(error?.code);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// The associated Commerce client resolves the current merchant's instance, not a global base URL.
// PUT is deterministic; the read guard makes repeated delivery a no-op once the item changes.
export async function clampItem({ params, cartId, itemId, sku, observedQty, maxQuantity, handler, logger = console, client, wait = sleep }) {
  if (!/^[A-Za-z0-9_-]+$/.test(String(cartId)) || !/^[0-9]+$/.test(String(itemId)) ||
      parseQuantity(observedQty) === null || parseLimit(maxQuantity) === null) {
    logger.error({ handler, phase: 'compensation', decision: 'skipped_missing_identifier' });
    return false;
  }
  const path = `carts/${encodeURIComponent(cartId)}/items`;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const http = client ?? await getCommerceClient(resolveImsAuthParams(params));
      const items = await http.get(path).json();
      const current = Array.isArray(items) && items.find((item) => String(item.item_id) === String(itemId));
      if (!current) {
        logger.info({ handler, phase: 'compensation', decision: 'not_found', cartId, itemId });
        return true;
      }
      if (parseQuantity(current.qty) !== parseQuantity(observedQty)) {
        logger.info({ handler, phase: 'compensation', decision: 'stale_noop', cartId, itemId });
        return true;
      }
      await http.put(`${path}/${encodeURIComponent(itemId)}`, {
        json: { cartItem: { item_id: Number(itemId), quote_id: cartId, sku: current.sku ?? sku, qty: maxQuantity } },
      }).json();
      logger.info({ handler, phase: 'compensation', decision: 'clamped', cartId, itemId });
      return true;
    } catch (error) {
      if (statusOf(error) === 404) {
        logger.info({ handler, phase: 'compensation', decision: 'not_found', cartId, itemId });
        return true;
      }
      logger.error({ handler, phase: 'compensation', decision: attempt === 2 || !retryable(error) ? 'CRITICAL' : 'retry', attempt, cartId, itemId, errorType: error?.name ?? 'Error' });
      if (attempt === 2 || !retryable(error)) return false;
      await wait(100 * 2 ** (attempt - 1));
    }
  }
  return false;
}
