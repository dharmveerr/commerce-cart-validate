import { getCommerceClient } from '@adobe/aio-commerce-lib-app';
import { resolveImsAuthParams } from '@adobe/aio-commerce-lib-auth';
import { getAdminUiPermissionClient } from '@adobe/aio-commerce-lib-admin-ui/api';
import { getMenuAclResourceId } from '@adobe/aio-commerce-lib-admin-ui/menu';

const appId = 'cart-item-validation';
const menuId = 'cart_item_validation_settings';

// The menu ACL hides the page; this separate server-side check protects direct action URLs.
export async function checkSettingsPermission(params, {
  clientFactory = getCommerceClient,
  resolveAuth = resolveImsAuthParams,
  permissionFactory = getAdminUiPermissionClient,
} = {}) {
  const httpClient = await clientFactory(resolveAuth(params));
  return permissionFactory({ httpClient, appId }).check(getMenuAclResourceId(appId, menuId));
}
