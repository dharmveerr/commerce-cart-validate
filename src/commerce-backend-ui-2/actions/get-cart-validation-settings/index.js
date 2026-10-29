import { readSettings } from '../../../commerce-extensibility-1/actions/lib/settings.js';
import { checkSettingsPermission } from '../lib/permissions.js';

export function createHandler({ settings = readSettings, authorize = checkSettingsPermission, logger = console } = {}) {
  return async function main(params) {
    if (params?.__ow_method !== 'get') return { statusCode: 405, headers: { Allow: 'GET' }, body: { error: 'method_not_allowed' } };
    try {
      if (!await authorize(params)) return { statusCode: 403, body: { error: 'forbidden' } };
    } catch (error) {
      logger.error({ handler: 'get-cart-validation-settings', phase: 'authorization', errorType: error?.name ?? 'Error' });
      return { statusCode: 502, body: { error: 'authorization_unavailable' } };
    }
    try {
      const { enabled, maxQuantity, enableCompensatingCorrection } = await settings();
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: { enabled, maxQuantity: String(maxQuantity), enableCompensatingCorrection } };
    } catch (error) {
      logger.error({ handler: 'get-cart-validation-settings', phase: 'configuration', errorType: error?.name ?? 'Error' });
      return { statusCode: 500, body: { error: 'configuration_error' } };
    }
  };
}
export const main = createHandler();
