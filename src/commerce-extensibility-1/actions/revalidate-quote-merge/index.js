import { ok, successOperation, exceptionOperation } from '@adobe/aio-commerce-lib-webhooks/responses';
import { readSettings } from '../shared/settings.js';
import { clampItem } from '../shared/commerce-api-client.js';
import { isOverLimit, parseQuantity } from '../shared/is-over-limit.js';

export function createHandler({ settings = readSettings, clamp = clampItem, logger = console } = {}) {
  return async function main(params) {
    const quote = params?.data?.quote;
    const context = { handler: 'revalidate-quote-merge', source: 'observer.sales_quote_merge_after', quote_id: quote?.entity_id };
    try {
      const config = await settings();
      if (!config.enabled) {
        logger.info({ ...context, decision: 'bypass' });
        return ok(successOperation());
      }
      if (!Array.isArray(quote?.items)) {
        logger.warn({ ...context, decision: 'invalid_payload' });
        return ok(exceptionOperation('Merged cart items are required.'));
      }
      let first;
      for (const item of quote.items) {
        const detail = { ...context, item_id: item?.item_id, sku: item?.sku, qty: item?.qty, product_type: item?.product_type, maxQuantity: config.maxQuantity };
        if (parseQuantity(item?.qty) === 0) continue;
        if (parseQuantity(item?.qty) === null) {
          logger.warn({ ...detail, decision: 'invalid_quantity' });
          return ok(exceptionOperation('Cart item quantity must be a non-negative number.'));
        }
        if (!isOverLimit(item.qty, config.maxQuantity)) continue;
        first ??= item;
        if (config.enableCompensatingCorrection) {
          try {
            await clamp({ params, cartId: item.quote_id ?? quote.entity_id, itemId: item.item_id, sku: item.sku,
              observedQty: item.qty, maxQuantity: config.maxQuantity, handler: context.handler, logger });
          } catch (error) {
            logger.error({ ...detail, phase: 'compensation', decision: 'CRITICAL', errorType: error?.name ?? 'Error' });
          }
        }
        logger.warn({ ...detail, decision: 'block' });
      }
      if (first) return ok(exceptionOperation(`Maximum quantity for ${String(first.sku ?? 'this item')} is ${config.maxQuantity}.`));
      logger.info({ ...context, decision: 'allow', maxQuantity: config.maxQuantity });
      return ok(successOperation());
    } catch (error) {
      logger.error({ ...context, phase: 'configuration', decision: 'fail_open', errorType: error?.name ?? 'Error' });
      return ok(successOperation());
    }
  };
}

export const main = createHandler();
