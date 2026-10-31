import { ok, successOperation, exceptionOperation } from '@adobe/aio-commerce-lib-webhooks/responses';
import { readSettings } from '../shared/settings.js';
import { clampItem } from '../shared/commerce-api-client.js';
import { isOverLimit, parseQuantity } from '../shared/is-over-limit.js';

export function createHandler({ settings = readSettings, clamp = clampItem, logger = console } = {}) {
  return async function main(params) {
    const data = params?.data ?? {};
    // The two registered observer methods are an ACCS sandbox payload contract to verify.
    const source = data.quoteItem ? 'observer.sales_quote_add_item' : 'observer.sales_quote_item_save_after';
    const item = data.quoteItem ?? data.item;
    const context = { handler: 'validate-cart-item', source, quote_id: item?.quote_id ?? data.quote?.entity_id ?? data.quote_id,
      item_id: item?.item_id, sku: item?.sku, qty: item?.qty, product_type: item?.product_type };
    try {
      if (!item || typeof item !== 'object') {
        logger.warn({ ...context, decision: 'invalid_payload' });
        return ok(exceptionOperation('Cart item quantity is required.'));
      }
      const config = await settings();
      if (!config.enabled || parseQuantity(item.qty) === 0) {
        logger.info({ ...context, decision: 'bypass' });
        return ok(successOperation());
      }
      if (parseQuantity(item.qty) === null) {
        logger.warn({ ...context, maxQuantity: config.maxQuantity, decision: 'invalid_quantity' });
        return ok(exceptionOperation('Cart item quantity must be a non-negative number.'));
      }
      if (!isOverLimit(item.qty, config.maxQuantity)) {
        logger.info({ ...context, maxQuantity: config.maxQuantity, decision: 'allow' });
        return ok(successOperation());
      }
      if (source === 'observer.sales_quote_item_save_after' && config.enableCompensatingCorrection) {
        try {
          await clamp({ params, cartId: context.quote_id, itemId: context.item_id, sku: context.sku, observedQty: item.qty,
            maxQuantity: config.maxQuantity, handler: context.handler, logger });
        } catch (error) {
          logger.error({ ...context, phase: 'compensation', decision: 'CRITICAL', errorType: error?.name ?? 'Error' });
        }
      }
      logger.warn({ ...context, maxQuantity: config.maxQuantity, decision: 'block' });
      return ok(exceptionOperation(`Maximum quantity for ${String(item.sku ?? 'this item')} is ${config.maxQuantity}.`));
    } catch (error) {
      logger.error({ ...context, phase: 'configuration', decision: 'fail_open', errorType: error?.name ?? 'Error' });
      return ok(successOperation());
    }
  };
}

export const main = createHandler();
