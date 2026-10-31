import { ok, successOperation, exceptionOperation } from '@adobe/aio-commerce-lib-webhooks/responses';
import { readSettings } from '../../lib/settings.js';
import { clampItem } from '../../lib/commerce-api-client.js';
import { isOverLimit, parseQuantity, MAX_QUANTITY_MESSAGE } from '../../lib/is-over-limit.js';
import { parseCartItemPayload } from './validator.js';

export function createHandler({ settings = readSettings, clamp = clampItem, logger = console } = {}) {
  return async function main(params) {
    const { item, context } = parseCartItemPayload(params?.data);
    try {
      if (!item || typeof item !== 'object') {
        logger.error({ ...context, phase: 'payload', decision: 'invalid_payload' });
        return ok(successOperation());
      }
      const config = await settings();
      if (!config.enabled || parseQuantity(item.qty) === 0) {
        logger.info({ ...context, decision: 'bypass' });
        return ok(successOperation());
      }
      if (parseQuantity(item.qty) === null) {
        logger.error({ ...context, phase: 'payload', maxQuantity: config.maxQuantity, decision: 'invalid_quantity' });
        return ok(successOperation());
      }
      if (!isOverLimit(item.qty, config.maxQuantity)) {
        logger.info({ ...context, maxQuantity: config.maxQuantity, decision: 'allow' });
        return ok(successOperation());
      }
      if (context.source === 'observer.sales_quote_item_save_after' && config.enableCompensatingCorrection) {
        try {
          await clamp({ params, cartId: context.quote_id, itemId: context.item_id, sku: context.sku, observedQty: item.qty,
            maxQuantity: config.maxQuantity, handler: context.handler, logger });
        } catch (error) {
          logger.error({ ...context, phase: 'compensation', decision: 'CRITICAL', errorType: error?.name ?? 'Error' });
        }
      }
      logger.warn({ ...context, maxQuantity: config.maxQuantity, decision: 'block' });
      return ok(exceptionOperation(MAX_QUANTITY_MESSAGE));
    } catch (error) {
      logger.error({ ...context, phase: 'configuration', decision: 'fail_open', errorType: error?.name ?? 'Error' });
      return ok(successOperation());
    }
  };
}

export const main = createHandler();
