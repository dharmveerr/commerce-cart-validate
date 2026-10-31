import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { createHandler } from '../index.js';
const body = (values) => ({ __ow_method: 'post', __ow_headers: { 'content-type': 'application/json; charset=utf-8' }, __ow_body: Buffer.from(JSON.stringify(values)).toString('base64') });
const valid = { enabled: true, maxQuantity: '12', enableCompensatingCorrection: false };
test('decodes actual Runtime JSON body, saves settings and validates before persistence', async () => {
  let writes = 0;
  const main = createHandler({ authorize: async () => true, api: { initialize: async () => {}, setConfiguration: async (payload) => { writes++; assert.equal(payload.config.length, 3); } } });
  assert.equal((await main(body(valid))).statusCode, 200);
  for (const bad of ['0', '-1', '2.1', 'NaN', '']) assert.equal((await main(body({ ...valid, maxQuantity: bad }))).statusCode, 400);
  assert.equal((await main({ ...body(valid), __ow_body: 'ewo=' })).statusCode, 400);
  assert.equal((await main({ ...body(valid), __ow_headers: { 'content-type': 'text/plain' } })).statusCode, 400);
  assert.equal(writes, 1);
});
test('denies wrong method or ACL failures without writing', async () => {
  let writes = 0;
  const api = { initialize: async () => {}, setConfiguration: async () => { writes++; } };
  assert.equal((await createHandler({ api })({ ...body(valid), __ow_method: 'get' })).statusCode, 405);
  assert.equal((await createHandler({ api, authorize: async () => false })(body(valid))).statusCode, 403);
  assert.equal((await createHandler({ api, authorize: async () => { throw Error('private'); }, logger: { error() {} } })(body(valid))).statusCode, 502);
  assert.equal(writes, 0);
});
test('failed persistence is not reported as saved', async () => {
  const response = await createHandler({ authorize: async () => true, api: { initialize: async () => {}, setConfiguration: async () => { throw Error('private'); } }, logger: { error() {} } })(body({ ...valid, enabled: false, maxQuantity: '3' }));
  assert.equal(response.statusCode, 500); assert.deepEqual(response.body, { error: 'configuration_error' });
});
