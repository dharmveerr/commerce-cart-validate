import { initialize, getConfigurationByKey, byCodeAndLevel } from '@adobe/aio-commerce-lib-config';
import schema from '../../../commerce-configuration-1/.generated/configuration-schema.json' with { type: 'json' };
import { parseLimit } from './is-over-limit.js';

const selector = byCodeAndLevel('global', 'global');
const defaults = { enabled: true, maxQuantity: '10', enableCompensatingCorrection: true };

export function settingsReader(api = { initialize, getConfigurationByKey }) {
  return async () => {
    await api.initialize({ schema });
    const values = {};
    for (const key of Object.keys(defaults)) {
      const { config } = await api.getConfigurationByKey(key, selector);
      values[key] = config?.value ?? defaults[key];
    }
    const maxQuantity = parseLimit(values.maxQuantity);
    if (maxQuantity === null || typeof values.enabled !== 'boolean' || typeof values.enableCompensatingCorrection !== 'boolean') {
      throw new Error('Invalid cart validation configuration');
    }
    return { ...values, maxQuantity };
  };
}

export const readSettings = settingsReader();
export { selector, schema, defaults };
