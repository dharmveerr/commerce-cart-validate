import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampItem } from '../commerce-api-client.js';
const base = { params: {}, cartId: '123', itemId: '3', sku: 'sample', observedQty: 12, maxQuantity: 10, handler: 'test', logger: { info() {}, error() {} } };
test('GET guard then correct body and URL', async () => {
  let put;
  const client = { get: (path) => { assert.equal(path, 'carts/123/items'); return { json: async () => [{ item_id: 3, qty: 12, sku: 'sample' }] }; },
    put: (path, options) => { put = [path, options]; return { json: async () => ({}) }; } };
  assert.equal(await clampItem({ ...base, client }), true);
  assert.deepEqual(put, ['carts/123/items/3', { json: { cartItem: { item_id: 3, quote_id: '123', sku: 'sample', qty: 10 } } }]);
});
test('stale read skips write, and 404 is no-op', async () => {
  let writes = 0;
  const client = { get: () => ({ json: async () => [{ item_id: 3, qty: 7 }] }), put: () => { writes++; } };
  assert.equal(await clampItem({ ...base, client }), true); assert.equal(writes, 0);
  assert.equal(await clampItem({ ...base, client: { get: () => ({ json: async () => { throw { response: { status: 404 } }; } }) } }), true);
});
test('transient failure retries twice then logs CRITICAL', async () => {
  let count = 0; const errors = [];
  const client = { get: () => ({ json: async () => { count++; throw { response: { status: 503 }, name: 'HTTPError' }; } }) };
  assert.equal(await clampItem({ ...base, client, wait: async () => {}, logger: { info() {}, error: (entry) => errors.push(entry) } }), false);
  assert.equal(count, 2); assert.equal(errors.at(-1).decision, 'CRITICAL');
});
