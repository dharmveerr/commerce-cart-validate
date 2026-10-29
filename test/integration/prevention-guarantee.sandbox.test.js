import { test } from 'node:test';
import { strict as assert } from 'node:assert';

// Destructive integration test: ONLY disposable ACCS carts. Run separately with
// ACCS_EXPECT_MODE=rollback (correction disabled) and =correct (correction enabled).
const required = ['ACCS_GRAPHQL_URL', 'ACCS_BEARER_TOKEN', 'ACCS_CART_ID', 'ACCS_CART_ITEM_UID', 'ACCS_MERGE_SOURCE_CART_ID', 'ACCS_EXPECT_MODE'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) throw new Error(`Sandbox prerequisites missing: ${missing.join(', ')}`);
if (!['rollback', 'correct'].includes(process.env.ACCS_EXPECT_MODE)) throw new Error('ACCS_EXPECT_MODE must be rollback or correct');
const endpoint = process.env.ACCS_GRAPHQL_URL;
if (!/^https:\/\//.test(endpoint)) throw new Error('ACCS_GRAPHQL_URL must be HTTPS');
const token = process.env.ACCS_BEARER_TOKEN;
const cartId = process.env.ACCS_CART_ID;
const uid = process.env.ACCS_CART_ITEM_UID;
const max = 10;

async function graphql(query, variables) {
  const response = await fetch(endpoint, { method: 'POST', headers: { authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
  assert.equal(response.ok, true, `GraphQL HTTP status ${response.status}`);
  const result = await response.json();
  if (result.errors?.some(({ message }) => /Cannot query field|Unknown type|Variable .* used in position/.test(message))) {
    throw new Error('Sandbox GraphQL schema does not match the test mutation; verify ACCS schema');
  }
  return result;
}
const cartQuery = 'query Cart($id: String!) { cart(cart_id: $id) { itemsV2(page_size: 100) { total_count items { uid quantity product { sku } } } } }';
async function cart(id) {
  const result = await graphql(cartQuery, { id });
  assert.ok(!result.errors?.length, 'Independent cart query failed');
  const items = result.data?.cart?.itemsV2?.items;
  assert.ok(Array.isArray(items), 'Cart query returned no items');
  assert.equal(result.data.cart.itemsV2.total_count, items.length, 'Pagination must contain every item');
  return items;
}
const match = (items) => items.find((item) => item.uid === uid);
const amounts = (items) => items.map((item) => ({ sku: item.product.sku, quantity: item.quantity })).sort((a, b) => a.sku.localeCompare(b.sku));
function assertRejected(result) {
  assert.ok(result.errors?.length, 'Expected Commerce to reject the above-limit mutation');
}

test('after-named save hook: rejection and independently verified quantity', async () => {
  const before = await cart(cartId);
  const line = match(before);
  assert.ok(line && line.quantity > 0 && line.quantity <= max, 'Test item must start compliant');
  const result = await graphql('mutation Update($id: String!, $uid: ID!) { updateCartItems(input: { cart_id: $id, cart_items: [{ cart_item_uid: $uid, quantity: 11 }] }) { cart { id } } }', { id: cartId, uid });
  const after = await cart(cartId);
  assertRejected(result);
  assert.ok(match(after), 'Rejected update must not remove the test item');
  if (process.env.ACCS_EXPECT_MODE === 'rollback') assert.equal(match(after).quantity, line.quantity, 'Quantity persisted despite rejected update and correction disabled');
  else assert.ok(match(after).quantity <= max, 'Quantity remains above limit after compensation');
  console.info(JSON.stringify({ scenario: 'qty_update', mode: process.env.ACCS_EXPECT_MODE, before: line.quantity, after: match(after).quantity, rejected: true }));
});

test('after-named merge hook: rejection and independently verified final cart', async () => {
  const before = await cart(cartId);
  const line = match(before);
  assert.ok(line && line.quantity <= max, 'Destination item must be compliant');
  const source = await cart(process.env.ACCS_MERGE_SOURCE_CART_ID);
  const sameSku = source.filter((item) => item.product.sku === line.product.sku);
  assert.ok(sameSku.length > 0 && sameSku.some((item) => item.quantity > 0 && item.quantity <= max), 'Source must contain the destination SKU at compliant qty');
  assert.ok(line.quantity + sameSku.reduce((sum, item) => sum + item.quantity, 0) > max, 'Merged quantity must exceed the limit');
  const result = await graphql('mutation Merge($source: String!, $destination: String) { mergeCarts(source_cart_id: $source, destination_cart_id: $destination) { id } }', { source: process.env.ACCS_MERGE_SOURCE_CART_ID, destination: cartId });
  const after = await cart(cartId);
  assertRejected(result);
  if (process.env.ACCS_EXPECT_MODE === 'rollback') assert.deepEqual(amounts(after), amounts(before), 'Rejected merge changed destination despite correction disabled');
  else {
    assert.ok(after.length > 0, 'Rejected merge returned an empty cart');
    assert.ok(after.every((item) => item.quantity <= max), 'Merged cart still contains an over-limit line');
  }
  console.info(JSON.stringify({ scenario: 'merge', mode: process.env.ACCS_EXPECT_MODE, before: amounts(before), after: amounts(after), rejected: true }));
});
