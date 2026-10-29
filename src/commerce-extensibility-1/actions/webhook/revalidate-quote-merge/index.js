import { ok, successOperation, exceptionOperation } from '@adobe/aio-commerce-lib-webhooks/responses';
import { readSettings } from '../../lib/settings.js';
import { clampItem } from '../../lib/commerce-api-client.js';
import { isOverLimit, parseQuantity, MAX_QUANTITY_MESSAGE } from '../../lib/is-over-limit.js';
import { parseMergePayload } from './validator.js';

export function createHandler({ settings = readSettings, clamp = clampItem, logger = console } = {}) {
  return async function main(params) {
    const { quoteId, items } = parseMergePayload(params);
    const context = { handler: 'revalidate-quote-merge', source: 'observer.sales_quote_merge_after', quote_id: quoteId };
    try {
      const config = await settings();
      if (!config.enabled) {
        logger.info({ ...context, decision: 'bypass' });
        return ok(successOperation());
      }
      if (!items) {
        logger.error({ ...context, phase: 'payload', decision: 'invalid_payload' });
        return ok(successOperation());
      }
      let first;
      for (const item of items) {
        const detail = { ...context, item_id: item?.item_id, sku: item?.sku, qty: item?.qty, product_type: item?.product_type, maxQuantity: config.maxQuantity };
        if (parseQuantity(item?.qty) === 0) continue;
        if (parseQuantity(item?.qty) === null) {
          logger.error({ ...detail, phase: 'payload', decision: 'invalid_quantity' });
          continue;
        }
        if (!isOverLimit(item.qty, config.maxQuantity)) continue;
        first ??= item;
        if (config.enableCompensatingCorrection) {
          try {
            await clamp({ params, cartId: item.quote_id ?? quoteId, itemId: item.item_id, sku: item.sku,
              observedQty: item.qty, maxQuantity: config.maxQuantity, handler: context.handler, logger });
          } catch (error) {
            logger.error({ ...detail, phase: 'compensation', decision: 'CRITICAL', errorType: error?.name ?? 'Error' });
          }
        }
        logger.warn({ ...detail, decision: 'block' });
      }
      if (first) return ok(exceptionOperation(MAX_QUANTITY_MESSAGE));
      logger.info({ ...context, decision: 'allow', maxQuantity: config.maxQuantity });
      return ok(successOperation());
    } catch (error) {
      logger.error({ ...context, phase: 'configuration', decision: 'fail_open', errorType: error?.name ?? 'Error' });
      return ok(successOperation());
    }
  };
}

export const main = createHandler();
