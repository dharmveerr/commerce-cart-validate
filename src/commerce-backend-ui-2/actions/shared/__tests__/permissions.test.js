import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { checkSettingsPermission } from '../permissions.js';
import { getMenuAclResourceId } from '@adobe/aio-commerce-lib-admin-ui/menu';
test('uses merchant-associated client to check menu ACL on server', async () => {
  const httpClient = { marker: true }; let checked;
  const result = await checkSettingsPermission({ marker: true }, {
    resolveAuth: (params) => params.marker,
    clientFactory: async (auth) => { assert.equal(auth, true); return httpClient; },
    permissionFactory: ({ httpClient: client, appId }) => {
      assert.equal(client, httpClient); assert.equal(appId, 'cart-item-validation');
      return { check: async (id) => { checked = id; return false; } };
    },
  });
  assert.equal(result, false);
  assert.equal(checked, getMenuAclResourceId('cart-item-validation', 'cart_item_validation_settings'));
});
