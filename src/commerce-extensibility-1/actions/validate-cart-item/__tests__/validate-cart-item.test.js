import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHandler } from '../index.js';
const config = { enabled: true, maxQuantity: 10, enableCompensatingCorrection: true };
const logs = [];
const logger = { info: (v) => logs.push(v), warn: (v) => logs.push(v), error: (v) => logs.push(v) };
const item = (qty, product_type = 'simple') => ({ item_id: 1, quote_id: 2, sku: 'ABC', qty, product_type });
const invoke = (entry, settings = async () => config, clamp = async () => { throw Error('unexpected correction'); }) => createHandler({ settings, clamp, logger })({ data: entry });
test('add item: below limit, over limit and parent/child types', async () => {
  assert.equal((await invoke({ quoteItem: item(10) })).body.op, 'success');
  for (const product_type of ['simple', 'configurable', 'bundle']) {
    const response = await invoke({ quoteItem: item(11, product_type) });
    assert.equal(response.body.op, 'exception');
    assert.match(JSON.stringify(response.body), /ABC/);
    assert.equal(logs.at(-1).product_type, product_type);
  }
});
test('saved item compensates but add item does not', async () => {
  let count = 0; const clamp = async () => { count++; };
  await invoke({ quoteItem: item(11) }, undefined, clamp); assert.equal(count, 0);
  assert.equal((await invoke({ item: item(11) }, undefined, clamp)).body.op, 'exception'); assert.equal(count, 1);
});
test('disabled, correction disabled, zero removal, malformed qty and fail-open', async () => {
  assert.equal((await invoke({ item: item(100) }, async () => ({ ...config, enabled: false }))).body.op, 'success');
  assert.equal((await invoke({ item: item(0) })).body.op, 'success');
  let count = 0;
  assert.equal((await invoke({ item: item(11) }, async () => ({ ...config, enableCompensatingCorrection: false }), async () => { count++; })).body.op, 'exception');
  assert.equal(count, 0);
  for (const qty of [undefined, 'abc', null]) assert.equal((await invoke({ quoteItem: item(qty) })).body.op, 'exception');
  assert.equal((await invoke({ quoteItem: item(11) }, async () => { throw Error('private'); })).body.op, 'success');
  assert.equal(logs.at(-1).decision, 'fail_open');
});
