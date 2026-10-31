import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHandler } from '../../../../../src/commerce-extensibility-1/actions/webhook/validate-cart-item/index.js';
import { parseCartItemPayload } from '../../../../../src/commerce-extensibility-1/actions/webhook/validate-cart-item/validator.js';
const config = { enabled: true, maxQuantity: 10, enableCompensatingCorrection: true };
const logs = [];
const logger = { info: (v) => logs.push(v), warn: (v) => logs.push(v), error: (v) => logs.push(v) };
const item = (qty, product_type = 'simple') => ({ item_id: 1, quote_id: 2, sku: 'ABC', qty, product_type });
const invoke = (entry, settings = async () => config, clamp = async () => { throw Error('unexpected correction'); }) => createHandler({ settings, clamp, logger })({ data: entry });
const MESSAGE = 'You have reached the maximum amount of items.';
test('add item: below limit, at limit, over limit and parent/child types', async () => {
  assert.equal((await invoke({ quote_item: item(9) })).body.op, 'success');
  assert.equal((await invoke({ quote_item: item(10) })).body.op, 'success');
  for (const product_type of ['simple', 'configurable', 'bundle']) {
    const response = await invoke({ quote_item: item(11, product_type) });
    assert.equal(response.body.op, 'exception');
    assert.equal(response.body.message, MESSAGE);
    assert.equal(logs.at(-1).product_type, product_type);
  }
});
test('saved item compensates but add item does not', async () => {
  let count = 0; const clamp = async () => { count++; };
  await invoke({ quote_item: item(11) }, undefined, clamp); assert.equal(count, 0);
  assert.equal((await invoke({ data_object: item(11) }, undefined, clamp)).body.op, 'exception'); assert.equal(count, 1);
  assert.equal((await invoke({ item: item(11) }, undefined, clamp)).body.op, 'exception'); assert.equal(count, 2);
});
test('existing SKU uses the resulting line quantity; SKUs are independent; lowered limit applies', async () => {
  // Cart already has 8 of SKU ABC; adding 3 more produces a line quantity of 11.
  assert.equal((await invoke({ quote_item: item(11) })).body.message, MESSAGE);
  assert.equal((await invoke({ quote_item: item(10) })).body.op, 'success');
  assert.equal((await invoke({ quote_item: { ...item(10), sku: 'SKU-A' } })).body.op, 'success');
  assert.equal((await invoke({ quote_item: { ...item(10), sku: 'SKU-B' } })).body.op, 'success');
  const lowered = async () => ({ ...config, maxQuantity: 5 });
  assert.equal((await invoke({ quote_item: item(5) }, lowered)).body.op, 'success');
  assert.equal((await invoke({ quote_item: item(6) }, lowered)).body.message, MESSAGE);
});
test('disabled, correction disabled, zero removal, malformed payload and fail-open', async () => {
  assert.equal((await invoke({ item: item(100) }, async () => ({ ...config, enabled: false }))).body.op, 'success');
  assert.equal((await invoke({ item: item(0) })).body.op, 'success');
  let count = 0;
  assert.equal((await invoke({ item: item(11) }, async () => ({ ...config, enableCompensatingCorrection: false }), async () => { count++; })).body.op, 'exception');
  assert.equal(count, 0);
  for (const qty of [undefined, 'abc', null]) {
    assert.equal((await invoke({ quote_item: item(qty) })).body.op, 'success');
    assert.equal(logs.at(-1).decision, 'invalid_quantity');
  }
  for (const entry of [{}, { item: 'not-an-object' }]) {
    assert.equal((await invoke(entry)).body.op, 'success');
    assert.equal(logs.at(-1).decision, 'invalid_payload');
  }
  assert.equal((await invoke({ quote_item: item(11) }, async () => { throw Error('private'); })).body.op, 'success');
  assert.equal(logs.at(-1).decision, 'fail_open');
});
test('payload parser reads documented keys and fallback identifiers', () => {
  assert.equal(parseCartItemPayload({ quote_item: item(2) }).context.source, 'observer.sales_quote_add_item');
  assert.equal(parseCartItemPayload({ quoteItem: item(2) }).context.source, 'observer.sales_quote_add_item');
  assert.equal(parseCartItemPayload({ data_object: item(2) }).context.source, 'observer.sales_quote_item_save_after');
  assert.equal(parseCartItemPayload({ data_object: item(2) }).item.qty, 2);
  assert.equal(parseCartItemPayload({ item: { sku: 'X', qty: 2 }, quote_id: 8 }).context.quote_id, 8);
  assert.equal(parseCartItemPayload({}).item, undefined);
});
