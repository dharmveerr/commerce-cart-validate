import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { isOverLimit, parseLimit, parseQuantity } from '../../../../src/commerce-extensibility-1/actions/lib/is-over-limit.js';
test('limit and quantity validation', () => {
  assert.equal(parseLimit('10'), 10); assert.equal(parseLimit('0'), null);
  for (const bad of ['-2', '1.5', 'abc', '01', '', '99999999999999999999999']) assert.equal(parseLimit(bad), null);
  assert.equal(parseQuantity('0'), 0); assert.equal(parseQuantity('bad'), null);
  assert.equal(isOverLimit(11, 10), true); assert.equal(isOverLimit(10, 10), false);
});
