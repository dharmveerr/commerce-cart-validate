import { initialize, setConfiguration } from '@adobe/aio-commerce-lib-config';
import { selector, schema } from '../../../commerce-extensibility-1/actions/lib/settings.js';
import { parseLimit } from '../../../commerce-extensibility-1/actions/lib/is-over-limit.js';
import { checkSettingsPermission } from '../lib/permissions.js';

function parseBody(params) {
  // Runtime places JSON request bodies in __ow_body as base64, not in params.body.
  const contentType = params?.__ow_headers?.['content-type'] ?? params?.__ow_headers?.['Content-Type'];
  if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType ?? '')) return null;
  const encoded = params?.__ow_body;
  if (typeof encoded !== 'string' || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) return null;
  return JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
}

export function createHandler({ api = { initialize, setConfiguration }, authorize = checkSettingsPermission, logger = console } = {}) {
  return async function main(params) {
    if (params?.__ow_method !== 'post') return { statusCode: 405, headers: { Allow: 'POST' }, body: { error: 'method_not_allowed' } };
    try {
      if (!await authorize(params)) return { statusCode: 403, body: { error: 'forbidden' } };
    } catch (error) {
      logger.error({ handler: 'save-cart-validation-settings', phase: 'authorization', errorType: error?.name ?? 'Error' });
      return { statusCode: 502, body: { error: 'authorization_unavailable' } };
    }
    let body;
    try {
      body = parseBody(params);
    } catch {
      return { statusCode: 400, body: { error: 'invalid_request' } };
    }
    if (!body || typeof body !== 'object' || Array.isArray(body) ||
        typeof body.enabled !== 'boolean' || typeof body.enableCompensatingCorrection !== 'boolean' ||
        parseLimit(body.maxQuantity) === null || Object.keys(body).some((key) => !['enabled', 'maxQuantity', 'enableCompensatingCorrection'].includes(key))) {
      return { statusCode: 400, body: { error: 'invalid_settings' } };
    }
    try {
      await api.initialize({ schema });
      await api.setConfiguration({ config: [
        { name: 'enabled', value: body.enabled },
        { name: 'maxQuantity', value: String(body.maxQuantity) },
        { name: 'enableCompensatingCorrection', value: body.enableCompensatingCorrection },
      ] }, selector);
      return { statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: {
        enabled: body.enabled, maxQuantity: String(body.maxQuantity), enableCompensatingCorrection: body.enableCompensatingCorrection,
      } };
    } catch (error) {
      logger.error({ handler: 'save-cart-validation-settings', phase: 'configuration', errorType: error?.name ?? 'Error' });
      return { statusCode: 500, body: { error: 'configuration_error' } };
    }
  };
}
export const main = createHandler();
