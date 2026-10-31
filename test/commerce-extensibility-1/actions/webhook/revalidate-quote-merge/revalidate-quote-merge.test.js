import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHandler } from '../../../../../src/commerce-extensibility-1/actions/webhook/revalidate-quote-merge/index.js';
import { parseMergePayload } from '../../../../../src/commerce-extensibility-1/actions/webhook/revalidate-quote-merge/validator.js';
const config = { enabled: true, maxQuantity: 10, enableCompensatingCorrection: true };
const logger = { info() {}, warn() {}, error() {} };
const item = (qty, type = 'simple') => ({ item_id: 5, quote_id: 2, sku: 'SKU', qty, product_type: type });
const invoke = (items, settings = async () => config, clamp = async () => {}) => createHandler({ settings, clamp, logger })({ data: { quote: { entity_id: 2, items } } });
test('empty and compliant merged carts succeed; over-limit item blocks and is corrected', async () => {
  assert.equal((await invoke([])).body.op, 'success');
  assert.equal((await invoke([item(2, 'configurable'), item(10, 'bundle')])).body.op, 'success');
  let count = 0;
  const result = await invoke([item(0), item(12, 'bundle'), item(13)], undefined, async () => { count++; });
  assert.equal(result.body.op, 'exception'); assert.match(JSON.stringify(result.body), /SKU/); assert.equal(count, 2);
});
test('correction flag off, malformed quantity and config fail-open', async () => {
  let count = 0;
  assert.equal((await invoke([item(11)], async () => ({ ...config, enableCompensatingCorrection: false }), async () => { count++; })).body.op, 'exception');
  assert.equal(count, 0);
  assert.equal((await invoke([item('NaN')])).body.op, 'exception');
  assert.equal((await invoke([item(11)], async () => { throw Error('unavailable'); })).body.op, 'success');
});
test('merge parser preserves quote and handles missing payload', () => {
  const quote = { entity_id: 7, items: [] };
  assert.deepEqual(parseMergePayload({ quote }).quote, quote);
  assert.equal(parseMergePayload({ quote }).context.quote_id, 7);
  assert.equal(parseMergePayload(undefined).quote, undefined);
});
