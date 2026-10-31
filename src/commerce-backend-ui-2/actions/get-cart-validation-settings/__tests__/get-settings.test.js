import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHandler } from '../index.js';
const request = { __ow_method: 'get' };
test('reads merchant settings when authorized and fails closed if config unavailable', async () => {
  const value = { enabled: false, maxQuantity: 4, enableCompensatingCorrection: false };
  assert.deepEqual((await createHandler({ settings: async () => value, authorize: async () => true })(request)).body, { ...value, maxQuantity: '4' });
  const response = await createHandler({ settings: async () => { throw Error('secret'); }, authorize: async () => true, logger: { error() {} } })(request);
  assert.equal(response.statusCode, 500); assert.deepEqual(response.body, { error: 'configuration_error' });
});
test('disallows wrong method and denied or unavailable permissions', async () => {
  let reads = 0;
  const settings = async () => { reads++; return {}; };
  assert.equal((await createHandler({ settings })({ __ow_method: 'post' })).statusCode, 405);
  assert.equal((await createHandler({ settings, authorize: async () => false })(request)).statusCode, 403);
  assert.equal((await createHandler({ settings, authorize: async () => { throw Error('private'); }, logger: { error() {} } })(request)).statusCode, 502);
  assert.equal(reads, 0);
});
