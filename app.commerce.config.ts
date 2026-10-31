import { defineConfig } from '@adobe/aio-commerce-lib-app/config';
import { MENU_STORES } from '@adobe/aio-commerce-sdk/admin-ui/menu';

// Shown by Commerce when the webhook times out or fails while `required: true`.
const FALLBACK_ERROR_MESSAGE = 'Unable to update the cart right now. Please try again.';
const hookPolicy = { method: 'POST', required: true, timeout: 5000, soft_timeout: 1000, fallback_error_message: FALLBACK_ERROR_MESSAGE } as const;

export default defineConfig({
  metadata: {
    id: 'cart-item-validation',
    displayName: 'Cart Item Validation',
    description: 'Validate cart item quantities using merchant-managed settings across ACCS projects.',
    version: '1.5.0',
  },
  businessConfig: {
    schema: [
      { name: 'enabled', type: 'boolean', label: 'Enabled', default: true },
      { name: 'maxQuantity', type: 'text', label: 'Max Quantity', description: 'Positive whole number of units allowed for each cart line.', default: '10' },
      { name: 'enableCompensatingCorrection', type: 'boolean', label: 'Enable Compensating Correction', default: true },
    ],
  },
  adminUi: {
    menu: {
      id: 'cart_item_validation_settings',
      label: 'Cart Item Validation',
      description: 'Edit cart quantity enforcement settings.',
      parentMenu: MENU_STORES,
      pageTitle: 'Cart Item Validation Settings',
      aclProtected: true,
    },
  },
  webhooks: [
    {
      label: 'Validate added cart item', description: 'Reject an item exceeding the configured limit before add.', category: 'validation', env: ['saas'], requireAdobeAuth: true, runtimeAction: 'cart-validation/validate-cart-item',
      webhook: { webhook_method: 'observer.sales_quote_add_item', webhook_type: 'before', batch_name: 'cart_item_validation', hook_name: 'validate_add_item', ...hookPolicy },
    },
    {
      label: 'Validate saved cart item', description: 'Validate quantities on item save and compensate when necessary.', category: 'validation', env: ['saas'], requireAdobeAuth: true, runtimeAction: 'cart-validation/validate-cart-item',
      webhook: { webhook_method: 'observer.sales_quote_item_save_after', webhook_type: 'before', batch_name: 'cart_item_validation', hook_name: 'validate_saved_item', ...hookPolicy },
    },
    {
      label: 'Revalidate merged quote', description: 'Validate each cart line after a guest quote merges.', category: 'validation', env: ['saas'], requireAdobeAuth: true, runtimeAction: 'cart-validation/revalidate-quote-merge',
      webhook: { webhook_method: 'observer.sales_quote_merge_after', webhook_type: 'before', batch_name: 'cart_item_validation', hook_name: 'validate_merged_quote', ...hookPolicy },
    },
  ],
});
